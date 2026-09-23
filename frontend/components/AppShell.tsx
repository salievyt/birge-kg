"use client";

import { useEffect, useRef, useState } from "react";

import { useAppController } from "@/lib/application/useAppController";
import { titleFor } from "@/lib/domain/catalog";
import type {
  AchievementDto,
  AdmissionDto,
  CalendarDto,
  CabinetDto,
  DetailBundle,
  FacultyDto,
  FavoriteDto,
  FeedDto,
  ItemDto,
  MatchingDto,
  NotificationDto,
  PersonDto,
  ResourceKey,
  ResourceKind,
  Screen,
} from "@/lib/domain/types";
import { AchievementsScreen } from "./AchievementsScreen";
import { AdmissionScreen } from "./AdmissionScreen";
import { AdminScreen } from "./AdminScreen";
import { AuthScreen } from "./AuthScreen";
import { CabinetScreen } from "./CabinetScreen";
import { CalendarScreen } from "./CalendarScreen";
import { CatalogScreen } from "./CatalogScreen";
import { DetailScreen } from "./DetailScreen";
import { ErrorPage } from "./ErrorPage";
import { EventScreen } from "./EventScreen";
import { FavoritesScreen } from "./FavoritesScreen";
import { FacultyScreen } from "./FacultyScreen";
import { FeedScreen } from "./FeedScreen";
import { Header } from "./Header";
import { HelpScreen } from "./HelpScreen";
import { NotificationsScreen } from "./NotificationsScreen";
import { Overview } from "./Overview";
import { PersonScreen } from "./PersonScreen";
import { Preloader } from "./Preloader";
import { ProfileScreen } from "./ProfileScreen";
import { SkeletonCards } from "./Skeleton";
import { SettingsScreen } from "./SettingsScreen";
import { TeamScreen } from "./TeamScreen";
import { Toasts } from "./Toasts";

const catalogScreens: readonly ResourceKey[] = ["projects", "ideas", "clubs", "events", "people"];
const knownScreens: readonly Screen[] = [
  "overview", "profile", "login", "register", "admin",
  "cabinet", "notifications", "favorites", "team", "feed", "achievements",
  "calendar", "faculty", "person", "detail", "event", "admission", "help", "settings",
  ...catalogScreens,
];

export function AppShell() {
  const {
    state,
    toggleMenu,
    toggleTheme,
    dismissToast,
    login,
    register,
    saveProfile,
    logout,
    createEntity,
    openDetail,
    openPerson,
    openEvent,
    openFaculty,
    setCalendarMonth,
    joinEntity,
    leaveEntity,
    sendComment,
    voteIdea,
    toggleFavorite,
    registerEvent,
    cancelEvent,
    toggleEventReminder,
    applyToProject,
    submitAdmission,
    awardAchievement,
    moderationDecide,
    markNotificationRead,
    markAllNotificationsRead,
    exportData,
  } = useAppController();
  const { screen, menuOpen, account, csrf, ready, data, dashboard, views, params, loading, busy, theme, toasts, canModerate } = state;

  const mainRef = useRef<HTMLElement>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooted(true), ready ? 700 : 8000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  const previousScreen = useRef<Screen | null>(null);
  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    const heading = mainRef.current?.querySelector<HTMLElement>("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [screen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") toggleMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, toggleMenu]);

  const rawKind = typeof params.kind === "string" ? params.kind : "";
  const detailKind: ResourceKind =
    rawKind === "idea" || rawKind === "ideas" ? "idea"
    : rawKind === "club" || rawKind === "clubs" ? "club"
    : rawKind === "event" || rawKind === "events" ? "event"
    : "project";

  return (
    <main ref={mainRef}>
      <Header
        screen={screen}
        menuOpen={menuOpen}
        isAuthenticated={Boolean(account)}
        canModerate={canModerate}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleMenu={toggleMenu}
      />
      {ready ? (
        <>
          {screen === "overview" && (
            <Overview
              loading={loading}
              data={data}
              dashboard={dashboard}
              onOpenDetail={openDetail}
              onOpenEvent={openEvent}
              onOpenPerson={openPerson}
              onOpenFaculty={openFaculty}
            />
          )}
          {catalogScreens.includes(screen as ResourceKey) && (
            <CatalogScreen
              title={titleFor(screen) ?? ""}
              resource={screen as ResourceKey}
              loading={loading}
              items={data[screen as ResourceKey] ?? []}
              onItemOpen={(item) => {
                if (screen === "people") openPerson(item.user?.id ?? 0);
                else if (screen === "events") openEvent(item.id);
                else if (screen === "ideas") openDetail("idea", item.id);
                else if (screen === "clubs") openDetail("club", item.id);
                else openDetail("project", item.id);
              }}
            />
          )}
          {(screen === "login" || screen === "register") && (
            <AuthScreen mode={screen} csrfReady={Boolean(csrf)} busy={busy} onSubmit={screen === "register" ? register : login} />
          )}
          {screen === "profile" && (account ? (
            <ProfileScreen account={account} busy={busy} onSave={saveProfile} onLogout={logout} />
          ) : (
            <section className="screen"><h1>Профиль</h1><SkeletonCards count={3} /></section>
          ))}
          {screen === "admin" && (
            <AdminScreen
              csrf={csrf}
              canModerate={canModerate}
              busy={busy}
              projects={(views.moderation as { projects: ItemDto[] } | undefined)?.projects ?? []}
              clubs={(views.moderation as { clubs: ItemDto[] } | undefined)?.clubs ?? []}
              ideas={(views.moderation as { ideas: ItemDto[] } | undefined)?.ideas ?? []}
              admissions={(views.moderation as { admissions: ItemDto[] } | undefined)?.admissions ?? []}
              onCreate={createEntity}
              onDecide={moderationDecide}
            />
          )}
          {screen === "cabinet" && (
            <CabinetScreen
              cabinet={views.cabinet as CabinetDto | undefined}
              loading={loading}
              onOpenDetail={openDetail}
              onOpenEvent={openEvent}
              onOpenPerson={openPerson}
              onToggleFavorite={toggleFavorite}
              onOpenNotifications={() => (window.location.hash = "notifications")}
            />
          )}
          {screen === "notifications" && (
            <NotificationsScreen
              notifications={views.notifications as NotificationDto[] | undefined}
              loading={loading}
              onMarkRead={markNotificationRead}
              onMarkAllRead={markAllNotificationsRead}
            />
          )}
          {screen === "favorites" && (
            <FavoritesScreen
              favorites={views.favorites as FavoriteDto[] | undefined}
              loading={loading}
              onOpenDetail={openDetail}
              onOpenEvent={openEvent}
              onRemoveFavorite={toggleFavorite}
            />
          )}
          {screen === "team" && (
            <TeamScreen
              matching={views.team as MatchingDto | undefined}
              loading={loading}
              isAuthenticated={Boolean(account)}
              canModerate={canModerate}
              onApply={applyToProject}
              onOpenDetail={openDetail}
              onOpenPerson={openPerson}
            />
          )}
          {screen === "feed" && (
            <FeedScreen feed={views.feed as FeedDto | undefined} loading={loading} onOpenDetail={openDetail} onOpenEvent={openEvent} />
          )}
          {screen === "achievements" && (
            <AchievementsScreen
              achievements={views.achievements as AchievementDto[] | undefined}
              loading={loading}
              canModerate={canModerate}
              users={(views.people as ItemDto[] | undefined)?.map(person => ({
                id: person.user?.id ?? 0,
                label: [person.user?.first_name, person.user?.last_name].filter(Boolean).join(" ") || person.user?.username || "—",
              }))}
              onAward={awardAchievement}
            />
          )}
          {screen === "calendar" && (
            <CalendarScreen
              calendar={views.calendar as CalendarDto | undefined}
              calendarKey={`${params.year ?? ""}-${params.month ?? ""}`}
              loading={loading}
              onMonthChange={setCalendarMonth}
              onOpenEvent={openEvent}
            />
          )}
          {screen === "faculty" && (
            <FacultyScreen
              faculty={views.faculty as FacultyDto | undefined}
              loading={loading}
              onOpenDetail={openDetail}
              onOpenEvent={openEvent}
              onOpenPerson={openPerson}
            />
          )}
          {screen === "person" && (
            <PersonScreen person={views.person as PersonDto | undefined} loading={loading} onOpenDetail={openDetail} onOpenEvent={openEvent} />
          )}
          {screen === "detail" && (
            <DetailScreen
              kind={detailKind}
              bundle={views.detail as DetailBundle | undefined}
              loading={loading}
              isAuthenticated={Boolean(account)}
              canModerate={canModerate}
              onJoin={() => joinEntity(detailKind as "project" | "club", Number(params.id))}
              onLeave={() => leaveEntity(detailKind as "project" | "club", Number(params.id))}
              onComment={(text) => sendComment(detailKind, Number(params.id), text)}
              onVote={() => voteIdea(Number(params.id))}
              onToggleFavorite={() => toggleFavorite(detailKind, Number(params.id))}
            />
          )}
          {screen === "event" && (
            <EventScreen
              event={views.event as DetailBundle | undefined}
              loading={loading}
              isAuthenticated={Boolean(account)}
              onRegister={() => registerEvent(Number(params.id))}
              onCancel={() => cancelEvent(Number(params.id))}
              onToggleReminder={() => toggleEventReminder(Number(params.id))}
              onToggleFavorite={() => toggleFavorite("event", Number(params.id))}
              onOpenCalendar={() => (window.location.hash = "calendar")}
            />
          )}
          {screen === "admission" && (
            <AdmissionScreen
              busy={busy}
              canModerate={canModerate}
              moderated={views.admissions as AdmissionDto[] | undefined}
              onDecide={(id, action) => moderationDecide("admission", id, action)}
              onSubmit={submitAdmission}
            />
          )}
          {screen === "help" && <HelpScreen canModerate={canModerate} />}
          {screen === "settings" && (
            <SettingsScreen profile={account?.profile} isAuthenticated={Boolean(account)} canModerate={canModerate} onExport={exportData} onLogout={logout} />
          )}
          {!knownScreens.includes(screen) && (
            <ErrorPage code="404" />
          )}
        </>
      ) : null}
      <Preloader active={!booted} />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
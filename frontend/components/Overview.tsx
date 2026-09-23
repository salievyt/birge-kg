"use client";

import { ArrowRight, Bookmark, CalendarDays, GraduationCap, Info, Megaphone, PenLine, Settings, Trophy, Users } from "lucide-react";

import { catalogSections, feedResources, serviceSections } from "@/lib/domain/catalog";
import type { CatalogData, DashboardDto, ResourceKind } from "@/lib/domain/types";

import { DashboardStats } from "./DashboardStats";
import { ItemCards } from "./ItemCards";
import { SkeletonCards, SkeletonDashboard } from "./Skeleton";

const SERVICE_ICONS: Record<string, typeof Users> = {
  feed: Megaphone,
  cabinet: Users,
  team: Users,
  favorites: Bookmark,
  calendar: CalendarDays,
  faculty: GraduationCap,
  achievements: Trophy,
  admission: PenLine,
  help: Info,
  settings: Settings,
};

interface OverviewProps {
  loading: boolean;
  data: CatalogData;
  dashboard: DashboardDto | null;
  onOpenDetail(kind: ResourceKind, id: number): void;
  onOpenEvent(id: number): void;
  onOpenPerson(id: number): void;
  onOpenFaculty(name: string): void;
}

export function Overview({ loading, data, dashboard, onOpenDetail, onOpenEvent, onOpenPerson, onOpenFaculty }: OverviewProps) {
  const openItem = (kind: string, id: number) => {
    if (kind === "event" || kind === "events") onOpenEvent(id);
    else if (kind === "idea" || kind === "ideas") onOpenDetail("idea", id);
    else if (kind === "club" || kind === "clubs") onOpenDetail("club", id);
    else if (kind === "people" || kind === "person") onOpenPerson(id);
    else onOpenDetail("project", id);
  };

  return (
    <>
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">ТВОЙ УНИВЕРСИТЕТ. ТВОИ ВОЗМОЖНОСТИ.</p>
          <h1>BIRGE</h1>
          <p className="heroTagline">Идеи. Люди. Действия.</p>
          <p>Найди своих людей.<br />Создайте что-то важное вместе.</p>
          <div className="quickActions">
            <a className="actionButton" href="#projects">Найти проект <ArrowRight size={16} /></a>
            <a className="actionButton" href="#team">Найти команду</a>
          </div>
        </div>
      </section>
      {!loading && !dashboard ? <SkeletonDashboard /> : dashboard ? (
        <DashboardStats dashboard={dashboard} onOpenFaculty={onOpenFaculty} />
      ) : null}

      <section className="hub" aria-label="Разделы">
        <div className="blockHeader">
          <div>
            <p className="eyebrow">НАВИГАЦИЯ</p>
            <h2>Куда дальше?</h2>
          </div>
        </div>
        <div className="hubGrid">
          {serviceSections.map(section => {
            const Icon = SERVICE_ICONS[section.id] ?? Users;
            return (
              <a className="hubCard" key={section.id} href={`#${section.id}`}>
                <Icon size={22} aria-hidden />
                <strong>{section.title}</strong>
                <span>{section.id === "calendar" ? "События и напоминания" : "Открыть раздел"}</span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="feed">
        <p className="eyebrow">СООБЩЕСТВО</p>
        <h2>Новое в BIRGE</h2>
        {loading ? (
          <SkeletonCards count={6} />
        ) : (
          feedResources.map(id => {
            const section = catalogSections.find(s => s.id === id);
            if (!section) return null;
            return (
              <div className="feedGroup" key={id}>
                <div className="blockHeader">
                  <h3>{section.title}</h3>
                  <a href={`#${id}`}>Все <ArrowRight size={16} /></a>
                </div>
                <ItemCards items={(data[id] ?? []).slice(0, 3)} onOpen={(item, kind) => openItem(kind, item.id)} />
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
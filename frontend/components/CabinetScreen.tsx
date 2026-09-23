"use client";

import { Bell, ChevronRight, Heart, Lightbulb, Trophy, Users } from "lucide-react";

import { userName } from "@/lib/domain/format";
import type { CabinetDto, ResourceKind } from "@/lib/domain/types";

import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";

interface CabinetScreenProps {
  cabinet?: CabinetDto;
  loading: boolean;
  onOpenDetail(kind: ResourceKind, id: number): void;
  onOpenEvent(id: number): void;
  onOpenPerson(id: number): void;
  onToggleFavorite(kind: ResourceKind, id: number): void;
  onOpenNotifications(): void;
}

export function CabinetScreen({
  cabinet,
  loading,
  onOpenDetail,
  onOpenEvent,
  onOpenPerson,
  onToggleFavorite,
  onOpenNotifications,
}: CabinetScreenProps) {
  if (loading && !cabinet) {
    return (
      <section className="screen">
        <div className="blockHeader"><p className="eyebrow">МОЙ КАБИНЕТ</p><h1>Кабинет</h1></div>
        <SkeletonCards count={4} />
      </section>
    );
  }
  if (!cabinet) {
    return <section className="screen"><h1>Мой кабинет</h1><p className="emptyState">Войдите в аккаунт, чтобы увидеть кабинет.</p></section>;
  }

  const stats = [
    { label: "Проекты и идеи", value: cabinet.projects.length + cabinet.ideas.length, icon: Heart },
    { label: "Мои клубы", value: cabinet.clubs.length, icon: Users },
    { label: "Мои события", value: cabinet.events.length, icon: Bell },
    { label: "Достижения", value: cabinet.achievements.length, icon: Trophy },
  ];

  const openItem = (kind: ResourceKind | "people", itemId: number) => {
    if (kind === "event") onOpenEvent(itemId);
    else if (kind === "people") onOpenPerson(itemId);
    else onOpenDetail(kind, itemId);
  };

  return (
    <section className="screen">
      <div className="blockHeader">
        <div>
          <p className="eyebrow">МОЙ КАБИНЕТ</p>
          <h1>{userName(cabinet.account.profile.user)}</h1>
        </div>
        <a className="secondaryButton" href="#notifications">Уведомления<ChevronRight size={16} /></a>
      </div>

      <div className="statGrid">
        {stats.map(stat => (
          <article className="chartCard statCard" key={stat.label}>
            <stat.icon size={20} aria-hidden />
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </div>

      {cabinet.unread_notifications > 0 && (
        <button className="notificationBanner" onClick={onOpenNotifications}>
          <Bell size={18} aria-hidden /> У вас {cabinet.unread_notifications} непрочитанных уведомлений
        </button>
      )}

      <div className="personalLists">
        <section>
          <h2>Мои проекты</h2>
          <ItemCards items={cabinet.projects} kind="project" onOpen={(item, k) => openItem(k, item.id)} />
        </section>
        <section>
          <h2>Мои идеи</h2>
          <ItemCards items={cabinet.ideas} kind="idea" onOpen={(item, k) => openItem(k, item.id)} />
        </section>
        <section>
          <h2>Мои клубы</h2>
          <ItemCards items={cabinet.clubs} kind="club" onOpen={(item, k) => openItem(k, item.id)} />
        </section>
        <section>
          <h2>Мои мероприятия</h2>
          <ItemCards items={cabinet.events} kind="event" onOpen={(item) => onOpenEvent(item.id)} />
        </section>
        <section>
          <h2>Избранное</h2>
          <ItemCards
            items={cabinet.favorites.map(f => f.item)}
            kind={cabinet.favorites[0]?.resource_type ?? "project"}
            favorited
            onOpen={(item, k) => openItem(k === "people" ? "project" : k, item.id)}
            onFavorite={(item) => onToggleFavorite(cabinet.favorites.find(f => f.item.id === item.id)?.resource_type ?? "project", item.id)}
          />
        </section>
      </div>
    </section>
  );
}
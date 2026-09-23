"use client";

import { Bell, BellOff, CalendarDays, MapPin, Bookmark, CheckCheck } from "lucide-react";

import { fmtDateTime, userName } from "@/lib/domain/format";
import type { DetailBundle } from "@/lib/domain/types";

import { SkeletonCards } from "./Skeleton";

interface EventScreenProps {
  event?: DetailBundle;
  loading: boolean;
  isAuthenticated: boolean;
  onRegister(): void;
  onCancel(): void;
  onToggleReminder(): void;
  onToggleFavorite(): void;
  onOpenCalendar(): void;
}

export function EventScreen({
  event,
  loading,
  isAuthenticated,
  onRegister,
  onCancel,
  onToggleReminder,
  onToggleFavorite,
  onOpenCalendar,
}: EventScreenProps) {
  if (loading && !event) return <section className="screen"><h1>Мероприятие</h1><SkeletonCards count={2} /></section>;
  if (!event) return <section className="screen"><h1>Не найдено</h1><p className="emptyState">Событие не найдено.</p></section>;

  const item = event.item;
  const attendees = event.attendees ?? [];
  const isOrganizer = event.is_organizer;
  const seatsTaken = event.attendees_count ?? attendees.length;

  return (
    <section className="screen">
      <p className="eyebrow">BIRGE / МЕРОПРИЯТИЕ</p>
      <h1>{item.title}</h1>

      <div className="eventHero">
        <div className="eventFact"><CalendarDays size={20} /><div><strong>{fmtDateTime(item.starts_at)}</strong><span>Когда</span></div></div>
        <div className="eventFact"><MapPin size={20} /><div><strong>{item.location}</strong><span>Где</span></div></div>
        {item.capacity ? <div className="eventFact"><strong>{seatsTaken}/{item.capacity}</strong><span>Мест занято</span></div> : null}
        <div className="eventFact"><strong>{isOrganizer ? "Вы организатор" : userName(item.user)}</strong><span>Организатор</span></div>
      </div>

      <p className="eventDescription">{item.description}</p>

      <div className="detailActions">
        {event.registered ? (
          <button className="secondaryButton" onClick={onCancel} disabled={!isAuthenticated}><CheckCheck size={16} /> Отменить регистрацию</button>
        ) : (
          <button className="primaryButton" onClick={onRegister} disabled={!isAuthenticated}>Записаться</button>
        )}
        {!isOrganizer && (
          <button className="secondaryButton" onClick={onToggleReminder} disabled={!isAuthenticated || !event.registered}>
            {event.reminder ? <BellOff size={16} /> : <Bell size={16} />} {event.reminder ? "Без напоминания" : "Напомнить мне"}
          </button>
        )}
        <button className="secondaryButton" onClick={onToggleFavorite} disabled={!isAuthenticated}>
          <Bookmark size={16} /> {event.is_favorited ? "В избранном" : "В избранное"}
        </button>
        <button className="secondaryButton" onClick={onOpenCalendar}><CalendarDays size={16} /> Календарь</button>
      </div>

      <section>
        <h2>Участники ({seatsTaken})</h2>
        <div className="attendeeList">
          {attendees.map(user => (
            <span className="chip" key={user.id}>{userName(user)}</span>
          ))}
          {attendees.length === 0 && <p className="emptyState">Пока никто не записался — будьте первым.</p>}
        </div>
      </section>
    </section>
  );
}
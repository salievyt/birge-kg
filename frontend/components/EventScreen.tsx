"use client";

import { Bell, BellOff, CalendarDays, MapPin, Bookmark, CheckCheck, Pencil } from "lucide-react";
import { useState } from "react";
import { CreateContent } from "./CreateContent";
import { EventReportForm } from "./EventReportForm";

import { fmtDateTime, userName } from "@/lib/domain/format";
import type { DetailBundle, ResourceKey } from "@/lib/domain/types";

import { SkeletonCards } from "./Skeleton";

interface EventScreenProps {
  csrf: string;
  busy: boolean;
  canModerate: boolean;
  onSave(resource: ResourceKey, id: number, body: Record<string, unknown>): Promise<boolean>;
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
  csrf, busy, canModerate, onSave,
  event,
  loading,
  isAuthenticated,
  onRegister,
  onCancel,
  onToggleReminder,
  onToggleFavorite,
  onOpenCalendar,
}: EventScreenProps) {
  const [editing, setEditing] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  if (loading && !event) return <section className="screen"><h1>Мероприятие</h1><SkeletonCards count={2} /></section>;
  if (!event) return <section className="screen"><h1>Не найдено</h1><p className="emptyState">Событие не найдено.</p></section>;

  const item = event.item;
  const attendees = event.attendees ?? [];
  const isOrganizer = event.is_organizer;
  const seatsTaken = event.attendees_count ?? attendees.length;
  const started = Boolean(item.starts_at) && new Date(item.starts_at!) <= new Date();
  const full = Boolean(item.capacity) && seatsTaken >= item.capacity!;
  if (editing && (isOrganizer || canModerate)) return <section className="screen"><CreateContent resource="events" initial={item} csrf={csrf} busy={busy} onCreate={(resource, body) => onSave(resource, item.id, body)} onCancel={() => setEditing(false)} /></section>;

  return (
    <section className="screen">
      <p className="eyebrow">BIRGE / МЕРОПРИЯТИЕ</p>
      <h1>{item.title}</h1>
      {(isOrganizer || canModerate) && <button className="secondaryButton" onClick={() => setEditing(true)} disabled={busy}><Pencil size={16} />Редактировать</button>}

      <div className="eventHero">
        <div className="eventFact"><CalendarDays size={20} /><div><strong>{fmtDateTime(item.starts_at)}</strong><span>Когда</span></div></div>
        <div className="eventFact"><MapPin size={20} /><div><strong>{item.location}</strong><span>Где</span></div></div>
        {item.capacity ? <div className="eventFact"><strong>{seatsTaken}/{item.capacity}</strong><span>Мест занято</span></div> : null}
        <div className="eventFact"><strong>{isOrganizer ? "Вы организатор" : userName(item.organizer ?? item.user)}</strong><span>Организатор</span></div>
      </div>

      <p className="eventDescription">{item.description}</p>

      {started && (isOrganizer || canModerate) && !editingReport && <button className="secondaryButton" disabled={busy} onClick={() => setEditingReport(true)}><Pencil size={16} />{item.report || item.report_photos?.length || item.report_url ? "Редактировать отчёт" : "Добавить отчёт"}</button>}
      {editingReport && started && (isOrganizer || canModerate) ? <EventReportForm item={item} csrf={csrf} busy={busy} onSave={body => onSave("events", item.id, body)} onCancel={() => setEditingReport(false)} /> : (item.report || item.report_photos?.length || item.report_url) ? <section className="eventReport">
        <h2>Как это было</h2>
        {item.report && <p className="eventReportText">{item.report}</p>}
        {item.report_url && /^https?:\/\//i.test(item.report_url) && <a className="secondaryButton" href={item.report_url} target="_blank" rel="noopener noreferrer">Материалы мероприятия</a>}
        <div className="eventReportGallery">{item.report_photos?.map((photo, index) => <a key={`${photo}-${index}`} href={photo} target="_blank" rel="noopener noreferrer"><img src={photo} loading="lazy" alt={`${item.title}: фото ${index + 1}`} /></a>)}</div>
      </section> : null}

      <div className="detailActions">
        {event.registered ? (
          <button className="secondaryButton" onClick={onCancel} disabled={!isAuthenticated || busy}><CheckCheck size={16} /> Отменить регистрацию</button>
        ) : (
          <button className="primaryButton" onClick={onRegister} disabled={!isAuthenticated || busy || isOrganizer || full || started}>{isOrganizer ? "Вы организатор" : started ? "Регистрация закрыта" : full ? "Мест нет" : "Записаться"}</button>
        )}
        {!isOrganizer && (
          <button className="secondaryButton" onClick={onToggleReminder} disabled={!isAuthenticated || busy || !event.registered || started}>
            {event.reminder ? <BellOff size={16} /> : <Bell size={16} />} {event.reminder ? "Без напоминания" : "Напомнить мне"}
          </button>
        )}
        <button className="secondaryButton" onClick={onToggleFavorite} disabled={!isAuthenticated || busy}>
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
          {attendees.length === 0 && <p className="emptyState">{started ? "Список участников пуст." : "Пока никто не записался."}</p>}
        </div>
      </section>
    </section>
  );
}

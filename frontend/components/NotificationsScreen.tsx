"use client";

import { useMemo, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";

import { fmtDateTime } from "@/lib/domain/format";
import type { NotificationDto } from "@/lib/domain/types";

import { SkeletonCards } from "./Skeleton";

interface NotificationsScreenProps {
  notifications?: NotificationDto[];
  loading: boolean;
  onMarkRead(id: number): void;
  onMarkAllRead(): void;
}

const FILTERS = [
  { key: "", label: "Все" },
  { key: "application", label: "Заявки" },
  { key: "event", label: "События" },
  { key: "moderation", label: "Модерация" },
  { key: "team", label: "Команда" },
  { key: "congrats", label: "Достижения" },
  { key: "general", label: "Общее" },
];

export function NotificationsScreen({ notifications, loading, onMarkRead, onMarkAllRead }: NotificationsScreenProps) {
  const [filter, setFilter] = useState("");
  const items = useMemo(
    () => (notifications ?? []).filter(n => !filter || n.kind === filter),
    [notifications, filter],
  );
  const unread = (notifications ?? []).some(n => !n.is_read);

  return (
    <section className="screen">
      <div className="blockHeader">
        <div>
          <p className="eyebrow">НИКУДА НЕ ИСЧЕЗНЕТ</p>
          <h1>Уведомления</h1>
        </div>
        <button className="secondaryButton" onClick={onMarkAllRead} disabled={!unread}>
          <CheckCheck size={18} /> Прочитать все
        </button>
      </div>

      <div className="chips" role="tablist" aria-label="Фильтр уведомлений">
        {FILTERS.map(item => (
          <button
            key={item.key}
            role="tab"
            aria-selected={filter === item.key}
            className={`chip ${filter === item.key ? "isActive" : ""}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && !notifications ? (
        <SkeletonCards count={4} />
      ) : items.length === 0 ? (
        <p className="emptyState">Пока нет уведомлений.</p>
      ) : (
        <ul className="noticeList">
          {items.map(notification => (
            <li key={notification.id} className={`notice ${notification.is_read ? "" : "unread"}`}>
              <div className="noticeIcon"><Bell size={18} /></div>
              <div className="noticeBody">
                <strong>{notification.title}</strong>
                {notification.body && <p>{notification.body}</p>}
                <small>{notification.kind_label ?? notification.kind} · {fmtDateTime(notification.created_at)}</small>
              </div>
              {!notification.is_read && (
                <button className="iconButton" aria-label="Отметить прочитанным" onClick={() => onMarkRead(notification.id)}>
                  <Check size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
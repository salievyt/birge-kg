"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, RefreshCw } from "lucide-react";

import { fmtDateTime } from "@/lib/domain/format";
import type { NotificationDto } from "@/lib/domain/types";
import { appApi } from "@/lib/infrastructure/api";

import { SkeletonCards } from "./Skeleton";

interface NotificationsScreenProps {
  csrf: string;
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

export function NotificationsScreen({ csrf }: NotificationsScreenProps) {
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    appApi.notifications(page, filter, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setItems(previous => page === 1 ? result.results : [...previous, ...result.results.filter(item => !previous.some(old => old.id === item.id))]);
      setCount(result.count); setMore(Boolean(result.next));
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Не удалось загрузить уведомления."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, filter, revision]);
  async function markRead(id?: number) {
    if (busy || loading) return;
    setBusy(true); setActionError("");
    try {
      if (id === undefined) await appApi.notificationReadAll(csrf);
      else await appApi.notificationRead(id, csrf);
      setItems(previous => previous.map(item => id === undefined || item.id === id ? {...item, is_read: true} : item));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось отметить прочитанным.");
    } finally { setBusy(false); }
  }

  return (
    <section className="screen">
      <div className="blockHeader">
        <div>
          <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
          <h1>Уведомления</h1>
        </div>
        <button className="secondaryButton" onClick={() => void markRead()} disabled={busy || loading}>
          <CheckCheck size={18} /> Прочитать все
        </button>
      </div>

      <div className="chips" role="group" aria-label="Фильтр уведомлений">
        {FILTERS.map(item => (
          <button
            key={item.key}
            aria-pressed={filter === item.key}
            className={`chip ${filter === item.key ? "isActive" : ""}`}
            disabled={busy}
            onClick={() => { if (filter !== item.key) { setFilter(item.key); setPage(1); setItems([]); setMore(false); } }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div role="alert"><p>{error}</p><button className="secondaryButton" onClick={() => setRevision(v => v + 1)} disabled={loading}><RefreshCw size={16} />Повторить</button></div>}
      {actionError && <p role="alert">{actionError}</p>}
      {!loading && !error && <p className="mutedMeta" role="status">Уведомлений: {count}</p>}
      {loading && page === 1 ? (
        <SkeletonCards count={4} />
      ) : items.length === 0 ? (
        !error && <p className="emptyState">{filter ? "В этой категории нет уведомлений." : "Пока нет уведомлений."}</p>
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
                <button className="iconButton" disabled={busy || loading} title="Отметить прочитанным" aria-label={`Отметить прочитанным: ${notification.title}`} onClick={() => void markRead(notification.id)}>
                  <Check size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {more && !error && <button className="secondaryButton loadMore" disabled={loading || busy} onClick={() => setPage(value => value + 1)}>{loading ? "Загрузка…" : "Показать ещё"}</button>}
    </section>
  );
}

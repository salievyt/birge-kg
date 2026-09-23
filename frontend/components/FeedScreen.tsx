"use client";

import { CalendarDays, Lightbulb, Megaphone, Rocket } from "lucide-react";

import { fmtDate, userName } from "@/lib/domain/format";
import type { FeedDto } from "@/lib/domain/types";

import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";

interface FeedScreenProps {
  feed?: FeedDto;
  loading: boolean;
  onOpenDetail(kind: "project" | "idea", id: number): void;
  onOpenEvent(id: number): void;
}

export function FeedScreen({ feed, loading, onOpenDetail, onOpenEvent }: FeedScreenProps) {
  if (loading && !feed) return <section className="screen"><h1>Лента новостей</h1><SkeletonCards count={4} /></section>;
  if (!feed) return <section className="screen"><h1>Лента новостей</h1><p className="emptyState">Пока пусто.</p></section>;

  return (
    <section className="screen">
      <div className="blockHeader"><div><p className="eyebrow">ЖИВАЯ ЛЕНТА</p><h1>Новости BIRGE</h1></div></div>

      <section className="feedGroup">
        <div className="blockHeader"><h2><Megaphone size={20} /> Объявления</h2></div>
        {feed.announcements.length === 0 ? <p className="emptyState">Объявлений пока нет.</p> : (
          <ul className="noticeList">
            {feed.announcements.map(announcement => (
              <li className="notice" key={announcement.id}>
                <div className="noticeIcon"><Megaphone size={18} /></div>
                <div className="noticeBody">
                  <strong>{announcement.title}</strong>
                  <p>{announcement.description ?? announcement.body}</p>
                  <small>{fmtDate(announcement.created_at)}{announcement.published_by && ` · ${userName(announcement.published_by)}`}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="feedGroup">
        <div className="blockHeader"><h2><CalendarDays size={20} /> Ближайшие события</h2></div>
        <ItemCards items={feed.events} kind="event" onOpen={(item) => onOpenEvent(item.id)} />
      </section>

      <section className="feedGroup">
        <div className="blockHeader"><h2><Rocket size={20} /> Новые проекты</h2></div>
        <ItemCards items={feed.projects} kind="project" onOpen={(item) => onOpenDetail("project", item.id)} />
      </section>

      <section className="feedGroup">
        <div className="blockHeader"><h2><Lightbulb size={20} /> Идеи недели</h2></div>
        <ItemCards items={feed.ideas} kind="idea" onOpen={(item) => onOpenDetail("idea", item.id)} />
      </section>
    </section>
  );
}
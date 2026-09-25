"use client";

import { FormEvent, useState } from "react";
import { Bookmark, LogIn, LogOut, MessageSquare, Send } from "lucide-react";

import { fmtDate, itemTitle, userName } from "@/lib/domain/format";
import { kindLabel } from "@/lib/domain/format";
import type { DetailBundle, ResourceKind } from "@/lib/domain/types";

interface DetailScreenProps {
  kind: ResourceKind;
  bundle?: DetailBundle;
  loading: boolean;
  isAuthenticated: boolean;
  canModerate: boolean;
  onJoin(): void;
  onLeave(): void;
  onComment(text: string): Promise<boolean>;
  onVote(): void;
  onToggleFavorite(): void;
}

export function DetailScreen({
  kind,
  bundle,
  loading,
  isAuthenticated,
  canModerate,
  onJoin,
  onLeave,
  onComment,
  onVote,
  onToggleFavorite,
}: DetailScreenProps) {
  const [text, setText] = useState("");

  if (loading && !bundle) return <section className="screen"><h1>Подробнее</h1><p className="emptyState">Загрузка…</p></section>;
  if (!bundle) return <section className="screen"><h1>Не найдено</h1><p className="emptyState">Запись не найдена.</p></section>;

  const item = bundle.item;
  const members = bundle.members ?? [];
  const comments = bundle.comments ?? [];

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    void onComment(value).then(ok => {
      if (ok) setText("");
    });
  }

  const subject = item.title || item.name || "Запись";
  const roleWord = kind === "idea" ? "автор" : kind === "project" ? "руководитель" : "лидер";

  return (
    <section className="screen">
      <p className="eyebrow">BIRGE / {kindLabel(kind).toUpperCase()}</p>
      <h1>{subject}</h1>

      <div className="detailLayout">
        <article className="detailMain">
          {item.image && <img className="detailMedia" src={item.image} alt="" />}
          <div className="cardTop">
            <span>{item.direction || item.category}</span>
            <span>{item.status_label ?? ""}</span>
          </div>
          <p>{item.description}</p>
          {item.goal && <><h2>Цель</h2><p>{item.goal}</p></>}
          {item.official_response && <><h2>Официальный ответ</h2><p>{item.official_response}</p></>}
          {item.needed_roles && !!item.needed_roles.length && (
            <><h2>Кого ищем</h2><div className="tags">{item.needed_roles.map(r => <span className="tag" key={r}>{r}</span>)}</div></>
          )}
          {item.progress !== undefined && (
            <div className="progressRow"><span>Прогресс {item.progress}%</span><div className="rowTrack"><i style={{ width: `${item.progress}%` }} /></div></div>
          )}
          <small className="mutedMeta">Создано {fmtDate(item.created_at)} · {roleWord}: {userName(item.owner ?? item.author ?? item.lead ?? item.user)}</small>
        </article>

        <aside className="detailAside">
          <div className="detailActions">
            {kind === "idea" ? (
              <button className="primaryButton" onClick={onVote} disabled={!isAuthenticated}>
                {bundle.voted ? "Голос учтён" : "Проголосовать"} {item.votes !== undefined ? `(${item.votes})` : ""}
              </button>
            ) : bundle.is_member ? (
              <button className="secondaryButton" onClick={onLeave} disabled={bundle.is_owner}><LogOut size={16} /> Покинуть</button>
            ) : (
              <button className="primaryButton" onClick={onJoin} disabled={!isAuthenticated}><LogIn size={16} /> Присоединиться</button>
            )}
            <button className="secondaryButton" onClick={onToggleFavorite} disabled={!isAuthenticated}>
              <Bookmark size={16} /> {bundle.is_favorited ? "В избранном" : "В избранное"}
            </button>
          </div>

          {members.length > 0 && (
            <div className="memberList">
              <h2>Участники ({members.length})</h2>
              {members.map(member => (
                <div className="memberRow" key={member.user.id}>
                  <strong>{userName(member.user)}</strong>
                  <span>{member.role}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <section className="commentsSection">
        <h2>Обсуждение ({comments.length})</h2>
        {isAuthenticated && (
          <form className="commentForm" onSubmit={submitComment}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ваш комментарий…" aria-label="Текст комментария" required />
            <button className="primaryButton" ><Send size={16} /> Отправить</button>
          </form>
        )}
        {!isAuthenticated && <p className="emptyState"><a href="#login">Войдите</a>, чтобы оставлять комментарии.</p>}
        <ul className="noticeList">
          {comments.map(comment => (
            <li className="notice" key={comment.id}>
              <div className="noticeIcon"><MessageSquare size={18} /></div>
              <div className="noticeBody">
                <strong>{userName(comment.user)}</strong>
                <p>{comment.text}</p>
                <small>{fmtDate(comment.created_at)}</small>
              </div>
            </li>
          ))}
        </ul>
        {comments.length === 0 && <p className="emptyState">Обсуждение пока пустое — станьте первым.</p>}
      </section>
    </section>
  );
}
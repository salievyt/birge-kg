"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bookmark, LogIn, LogOut, MessageSquare, Send, Pencil } from "lucide-react";

import { fmtDate, itemTitle, userName } from "@/lib/domain/format";
import { kindLabel } from "@/lib/domain/format";
import type { DetailBundle, ResourceKind, ResourceKey } from "@/lib/domain/types";
import { CreateContent } from "./CreateContent";
import { TeamChat } from "./TeamChat";

interface DetailScreenProps {
  busy: boolean;
  userId?: number;
  csrf: string;
  onSave(resource: ResourceKey, id: number, body: Record<string, unknown>): Promise<boolean>;
  onReview(userId: number, action: "approve" | "reject"): void;
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
  busy,
  userId,
  csrf,
  onSave,
  onReview,
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
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [teamChat, setTeamChat] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => setUnread(bundle?.chat_unread ?? 0), [bundle?.chat_unread]);

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
  const hiddenClub = kind === "club" && item.is_moderated === false;

  if (editing && (bundle.is_owner || canModerate)) return <section className="screen"><CreateContent resource={`${kind}s` as ResourceKey} csrf={csrf} busy={busy} initial={item} onCreate={(resource, body) => onSave(resource, item.id, body)} onCancel={() => setEditing(false)} /></section>;

  return (
    <section className="screen">
      <p className="eyebrow">BIRGE / {kindLabel(kind).toUpperCase()}</p>
      <h1>{subject}</h1>
      {(bundle.is_owner || canModerate) && <button className="secondaryButton" disabled={busy} onClick={() => setEditing(true)}><Pencil size={16} />Редактировать</button>}
      {kind === "idea" && canModerate && <button className="secondaryButton" disabled={busy} onClick={() => setReviewing(!reviewing)}><MessageSquare size={16} />{reviewing ? "Закрыть ответ" : "Ответ администрации"}</button>}
      {kind === "idea" && canModerate && reviewing && <form className="accountForm createForm" aria-busy={busy} onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        const values = Object.fromEntries(new FormData(event.currentTarget));
        if (await onSave("ideas", item.id, values)) setReviewing(false);
      }}>
        <h2>Рассмотрение идеи</h2>
        <label>Статус идеи<select name="status" defaultValue={item.status}><option value="review">На рассмотрении</option><option value="approved">Одобрено</option><option value="active">Реализуется</option><option value="declined">Отклонено</option></select></label>
        <label>Публичный ответ<textarea name="official_response" defaultValue={item.official_response} maxLength={10000} /></label>
        <button className="primaryButton" disabled={busy}><Send size={16} />{busy ? "Сохранение…" : "Опубликовать ответ"}</button>
      </form>}
      {hiddenClub && <p role="status" className="emptyState">{item.is_rejected ? "Клуб отклонён. Измените описание и отправьте его на повторную модерацию." : "Клуб на модерации. До одобрения он не виден другим студентам."}</p>}

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
              <button className="primaryButton" onClick={onVote} disabled={!isAuthenticated || busy}>
                {bundle.voted ? "Голос учтён" : "Проголосовать"} {item.votes !== undefined ? `(${item.votes})` : ""}
              </button>
            ) : bundle.is_pending ? (
              <><p className="successNote">Заявка на рассмотрении</p><button className="secondaryButton" onClick={onLeave} disabled={busy}>Отозвать заявку</button></>
            ) : bundle.is_member ? (
              <button className="secondaryButton" onClick={onLeave} disabled={bundle.is_owner || busy}><LogOut size={16} /> {bundle.is_owner ? "Вы руководитель" : "Покинуть"}</button>
            ) : (
              <button className="primaryButton" onClick={onJoin} disabled={!isAuthenticated || busy || (kind === "project" && item.status !== "recruiting")}><LogIn size={16} /> {kind === "project" ? item.status === "recruiting" ? "Подать заявку" : "Набор закрыт" : "Вступить в клуб"}</button>
            )}
            <button className="secondaryButton" onClick={onToggleFavorite} disabled={!isAuthenticated || busy || hiddenClub}>
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

      {bundle.is_owner && !!bundle.applications?.length && <section className="reviewQueue"><h2>Заявки в команду</h2>{bundle.applications.map(application => <article className="card" key={application.user.id}><h3>{userName(application.user)}</h3><p>{application.role}</p><div className="formRow"><button className="primaryButton" disabled={busy} onClick={() => onReview(application.user.id, "approve")}>Принять</button><button className="secondaryButton" disabled={busy} onClick={() => onReview(application.user.id, "reject")}>Отклонить</button></div></article>)}</section>}

      {kind === "project" && bundle.is_member && userId && <div className="chips" role="group" aria-label="Переписка проекта"><button className={`chip ${!teamChat ? "isActive" : ""}`} aria-pressed={!teamChat} onClick={() => setTeamChat(false)}>Публичное обсуждение</button><button className={`chip ${teamChat ? "isActive" : ""}`} aria-pressed={teamChat} onClick={() => setTeamChat(true)}>Чат команды{unread > 0 ? ` (${unread})` : ""}</button></div>}
      {kind === "project" && bundle.is_member && userId && teamChat ? <TeamChat key={`${item.id}-${userId}`} projectId={item.id} userId={userId} csrf={csrf} onRead={() => setUnread(0)} /> : <section className="commentsSection">
        <h2>Обсуждение ({comments.length})</h2>
        {isAuthenticated && !hiddenClub && (
          <form className="commentForm" onSubmit={submitComment}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ваш комментарий…" aria-label="Текст комментария" required />
            <button className="primaryButton" disabled={busy}><Send size={16} /> Отправить</button>
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
      </section>}
    </section>
  );
}

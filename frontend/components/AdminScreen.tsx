"use client";

import { FormEvent, useState } from "react";

import type { ItemDto, ResourceKey, ResourceKind } from "@/lib/domain/types";

import { ImageUploader } from "./ImageUploader";
import { ItemCards } from "./ItemCards";

interface AdminScreenProps {
  csrf: string;
  canModerate: boolean;
  busy: boolean;
  projects: ItemDto[];
  clubs: ItemDto[];
  ideas: ItemDto[];
  admissions: ItemDto[];
  onCreate(resource: ResourceKey, body: Record<string, unknown>): Promise<boolean>;
  onOpenDetail(kind: ResourceKind, id: number): void;
  onDecide(resource: string, resourceId: number, action: "approve" | "reject"): Promise<boolean>;
}

export function AdminScreen({ csrf, canModerate, busy, projects, clubs, ideas, admissions, onCreate, onDecide, onOpenDetail }: AdminScreenProps) {
  const [entityType, setEntityType] = useState<"project" | "club">("project");
  const [image, setImage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body: Record<string, unknown> = {
      description: String(values.description ?? ""),
      image,
      ...(entityType === "project"
        ? { title: String(values.title ?? ""), direction: String(values.direction ?? "") }
        : { name: String(values.name ?? ""), category: String(values.category ?? "") }),
    };
    const resourceKey: ResourceKey = entityType === "project" ? "projects" : "clubs";
    void onCreate(resourceKey, body).then(ok => {
      if (ok) {
        form.reset();
        setImage("");
      }
    });
  }

  return (
    <section className="screen">
      <div className="blockHeader">
        <div>
          <p className="eyebrow">МОДЕРАЦИЯ</p>
          <h1>{canModerate ? "Модерация" : "Доступ ограничен"}</h1>
        </div>
      </div>
      {canModerate ? (
        <>
          <div className="adminCreate">
            <h2>Добавить в каталог</h2>
            <form className="accountForm" onSubmit={submit} aria-busy={busy}>
              <label>Тип
                <select value={entityType} onChange={e => setEntityType(e.target.value as "project" | "club")}>
                  <option value="project">Проект</option>
                  <option value="club">Клуб</option>
                </select>
              </label>
              {entityType === "project" ? (
                <>
                  <label>Название проекта<input name="title" maxLength={180} required /></label>
                  <label>Направление<input name="direction" maxLength={90} required /></label>
                </>
              ) : (
                <>
                  <label>Название клуба<input name="name" maxLength={160} required /></label>
                  <label>Категория<input name="category" maxLength={90} required /></label>
                </>
              )}
              <label>Описание<textarea name="description" required /></label>
              <ImageUploader csrf={csrf} value={image} onChange={setImage} />
              <button className="primaryButton" disabled={busy}>{busy ? "Сохранение…" : "Опубликовать"}</button>
            </form>
          </div>
          <h2>Проекты</h2>
          <ItemCards items={projects} kind="project" onOpen={item => onOpenDetail("project", item.id)} />
          <h2>Клубы на рассмотрении</h2>
          <ItemCards items={clubs} kind="club" onOpen={item => onOpenDetail("club", item.id)} />
          {clubs.map(club => <div className="formRow" key={club.id}><strong>{club.name}</strong><button className="primaryButton" disabled={busy} onClick={() => onDecide("clubs", club.id, "approve")}>Одобрить</button><button className="secondaryButton" disabled={busy} onClick={() => onDecide("clubs", club.id, "reject")}>Отклонить</button></div>)}
          <h2>Идеи на модерации</h2>
          {ideas.length === 0 ? (
            <p className="emptyState">Новых идей на рассмотрении нет.</p>
          ) : (
            <div className="reviewQueue">
              {ideas.map(idea => (
                <article className="card" key={idea.id}>
                  <h3>{idea.title}</h3>
                  <p>{idea.description}</p>
                  {idea.direction && <span className="tag">{idea.direction}</span>}
                  <div className="formRow">
                    <button className="secondaryButton" onClick={() => onOpenDetail("idea", idea.id)}>Рассмотреть и ответить</button>
                    <button className="primaryButton" disabled={busy} onClick={() => onDecide("ideas", idea.id, "approve")}>Одобрить</button>
                    <button className="secondaryButton" disabled={busy} onClick={() => onDecide("ideas", idea.id, "reject")}>Отклонить</button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <h2>Заявки на вступление</h2>
          {admissions.length === 0 ? (
            <p className="emptyState">Заявок на вступление нет.</p>
          ) : (
            <ul className="noticeList">
              {admissions.map(admission => (
                <li className="notice" key={admission.id}>
                  <div className="noticeBody">
                    <strong>{admission.full_name}</strong>
                    <p>{admission.faculty} · {admission.email}</p>
                    {admission.motivation && <p>{admission.motivation}</p>}
                  </div>
                  <div className="formRow">
                    <button className="primaryButton" disabled={busy} onClick={() => onDecide("admissions", admission.id, "approve")}>Одобрить</button>
                    <button className="secondaryButton" disabled={busy} onClick={() => onDecide("admissions", admission.id, "reject")}>Отклонить</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p>Этот раздел доступен только модераторам и администраторам.</p>
      )}
    </section>
  );
}

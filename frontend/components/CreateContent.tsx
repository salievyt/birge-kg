"use client";

import { FormEvent, useState } from "react";
import { ItemDto, ResourceKey } from "@/lib/domain/types";
import { ImageUploader } from "./ImageUploader";

export function CreateContent({ resource, csrf, busy, onCreate, onCancel, initial }: {
  resource: ResourceKey; csrf: string; busy: boolean;
  initial?: ItemDto;
  onCreate(resource: ResourceKey, body: Record<string, unknown>): Promise<boolean>;
  onCancel(): void;
}) {
  const [image, setImage] = useState(initial?.image ?? "");
  const [uploading, setUploading] = useState(false);
  const locked = busy || uploading;
  const localDate = initial?.starts_at ? new Date(new Date(initial.starts_at).getTime() - new Date(initial.starts_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const body: Record<string, unknown> = { ...values };
    if (resource === "projects") body.needed_roles = String(values.needed_roles || "").split(",").map(s => s.trim()).filter(Boolean);
    if (resource === "events") { body.starts_at = new Date(String(values.starts_at)).toISOString(); body.capacity = Number(values.capacity); }
    if (resource === "projects" || resource === "clubs") body.image = image;
    if (await onCreate(resource, body)) onCancel();
  }
  return <form className="accountForm createForm" onSubmit={submit} aria-busy={locked}>
    <h2>{initial ? "Редактирование" : resource === "clubs" ? "Новый клуб" : resource === "ideas" ? "Новая идея" : resource === "events" ? "Новое мероприятие" : "Новый проект"}</h2>
    <label>Название<input name={resource === "clubs" ? "name" : "title"} defaultValue={initial?.name ?? initial?.title} required maxLength={160} /></label>
    <label>Описание<textarea name="description" defaultValue={initial?.description} required maxLength={10000} /></label>
    {(resource === "projects" || resource === "clubs") && <label>{resource === "projects" ? "Направление" : "Категория"}<input name={resource === "projects" ? "direction" : "category"} defaultValue={initial?.direction ?? initial?.category} required maxLength={90} /></label>}
    {resource === "projects" && <><label>Цель<textarea name="goal" defaultValue={initial?.goal} /></label><label>Нужные специалисты через запятую<input name="needed_roles" defaultValue={initial?.needed_roles?.join(", ")} maxLength={500} /></label>{initial && <div className="formRow"><label>Статус<select name="status" defaultValue={initial.status}><option value="recruiting">Набор команды</option><option value="active">В работе</option><option value="done">Завершён</option></select></label><label>Прогресс, %<input type="number" name="progress" min={0} max={100} defaultValue={initial.progress ?? 0} required /></label></div>}</>}
    {resource === "events" && <><label>Дата и время<input type="datetime-local" name="starts_at" defaultValue={localDate} required /></label><label>Место<input name="location" defaultValue={initial?.location} required maxLength={180} /></label><label>Количество мест<input type="number" min={1} max={100000} name="capacity" defaultValue={initial?.capacity ?? 50} required /></label></>}
    {(resource === "projects" || resource === "clubs") && <ImageUploader csrf={csrf} value={image} onChange={setImage} onBusyChange={setUploading} />}
    <div className="formRow"><button className="primaryButton" disabled={locked}>{uploading ? "Загрузка изображения…" : busy ? "Сохранение…" : resource === "clubs" ? "Отправить на модерацию" : initial ? "Сохранить" : "Опубликовать"}</button><button type="button" className="secondaryButton" onClick={onCancel} disabled={locked}>Отмена</button></div>
  </form>;
}

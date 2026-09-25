"use client";

import { FormEvent, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import type { ItemDto } from "@/lib/domain/types";
import { ImageUploader } from "./ImageUploader";

export function EventReportForm({ item, csrf, busy, onSave, onCancel }: {
  item: ItemDto; csrf: string; busy: boolean;
  onSave(body: Record<string, unknown>): Promise<boolean>;
  onCancel(): void;
}) {
  const [photos, setPhotos] = useState(item.report_photos ?? []);
  const [uploading, setUploading] = useState(false);
  const locked = busy || uploading;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (await onSave({...body, report_photos: photos})) onCancel();
  }
  return <form className="accountForm eventReportForm" onSubmit={submit} aria-busy={locked}>
    <h2>Отчёт о мероприятии</h2>
    <label>Итоги<textarea name="report" defaultValue={item.report} maxLength={10000} rows={6} /></label>
    <label>Ссылка на материалы<input name="report_url" type="url" defaultValue={item.report_url} maxLength={200} /></label>
    <div className="eventReportGallery">
      {photos.map((photo, index) => <figure key={`${photo}-${index}`}><img src={photo} alt={`Фото ${index + 1}`} /><button className="iconButton" type="button" disabled={locked} onClick={() => setPhotos(previous => previous.filter((_, i) => i !== index))} aria-label={`Убрать фото ${index + 1}`} title="Убрать фото"><Trash2 size={18} /></button></figure>)}
    </div>
    {photos.length < 12 && !busy && <ImageUploader csrf={csrf} value="" label={`Фотографии (${photos.length}/12)`} onChange={url => { if (url) setPhotos(previous => [...previous, url]); }} onBusyChange={setUploading} />}
    <div className="formRow"><button className="primaryButton" disabled={locked}><Save size={16} />{uploading ? "Загрузка фото…" : busy ? "Сохранение…" : "Опубликовать отчёт"}</button><button className="secondaryButton" type="button" disabled={locked} onClick={onCancel}>Отмена</button></div>
  </form>;
}

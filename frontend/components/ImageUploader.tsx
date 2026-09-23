"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { uploadsApi } from "@/lib/infrastructure/api";

interface ImageUploaderProps {
  csrf: string;
  value: string;
  onChange(url: string): void;
  label?: string;
}

export function ImageUploader({ csrf, value, onChange, label = "Логотип / изображение" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const result = await uploadsApi.upload(csrf, file);
      onChange(result.url);
      if (result.csrf) {
        // Токен мог ротироваться после записи файла — обновляем при следующем сабмите формы.
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Не удалось загрузить файл.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="uploader">
      <label className="uploaderLabel">{label}</label>
      <div className="uploaderRow">
        {value ? (
          <div className="uploaderPreview">
            <img src={value} alt="Предпросмотр изображения" />
            <button type="button" className="uploaderRemove" onClick={() => onChange("")} aria-label="Удалить изображение">
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <span className="uploaderEmpty" aria-hidden="true"><ImagePlus size={18} /></span>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" onChange={e => void pick(e.target.files?.[0])} hidden />
        <button type="button" className="secondaryButton" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
          {value ? "Заменить" : "Загрузить"}
        </button>
      </div>
      {error && <p className="uploaderError" role="alert">{error}</p>}
    </div>
  );
}
"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { uploadsApi } from "@/lib/infrastructure/api";

interface ImageUploaderProps {
  csrf: string;
  value: string;
  onChange(url: string): void;
  onBusyChange?(busy: boolean): void;
  label?: string;
}

export function ImageUploader({ csrf, value, onChange, onBusyChange, label = "Логотип / изображение" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError("Максимальный размер — 3 МБ."); return; }
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const result = await uploadsApi.upload(csrf, file);
      onChange(result.url);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Не удалось загрузить файл.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="uploader">
      <label className="uploaderLabel">{label}</label>
      <div className="uploaderRow">
        {value ? (
          <div className="uploaderPreview">
            <img src={value} alt="Предпросмотр изображения" />
            <button type="button" className="uploaderRemove" disabled={busy} onClick={() => onChange("")} aria-label="Удалить изображение">
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <span className="uploaderEmpty" aria-hidden="true"><ImagePlus size={18} /></span>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={e => void pick(e.target.files?.[0])} hidden />
        <button type="button" className="secondaryButton" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
          {value ? "Заменить" : "Загрузить"}
        </button>
      </div>
      {error && <p className="uploaderError" role="alert">{error}</p>}
    </div>
  );
}

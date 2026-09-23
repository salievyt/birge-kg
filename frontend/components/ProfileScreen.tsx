"use client";

import { FormEvent } from "react";
import { ChevronRight, LogOut } from "lucide-react";

import type { AccountData, ProfilePayload } from "@/lib/domain/types";

interface ProfileScreenProps {
  account: AccountData;
  busy: boolean;
  onSave(payload: ProfilePayload): void;
  onLogout(): void;
}

const serviceLinks: Array<{ href: string; label: string }> = [
  { href: "#cabinet", label: "Мои проекты и идеи" },
  { href: "#notifications", label: "Уведомления" },
  { href: "#favorites", label: "Избранное" },
  { href: "#settings", label: "Настройки и экспорт" },
];

export function ProfileScreen({ account, busy, onSave, onLogout }: ProfileScreenProps) {
  const profile = account.profile;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    onSave({
      faculty: String(values.faculty ?? ""),
      course: Number(values.course),
      specialty: String(values.specialty ?? ""),
      bio: String(values.bio ?? ""),
      skills: String(values.skills ?? "").split(",").map(s => s.trim()).filter(Boolean),
      interests: String(values.interests ?? "").split(",").map(s => s.trim()).filter(Boolean),
      privacy_level: String(values.privacy_level ?? "public"),
      is_available: values.is_available === "on",
      looking_for_team: values.looking_for_team === "on",
    });
  }

  return (
    <section className="screen">
      <div className="blockHeader">
        <div>
          <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
          <h1>{profile.user.first_name || profile.user.username}</h1>
        </div>
        <button className="secondaryButton" onClick={onLogout} disabled={busy}><LogOut size={18} /> Выйти</button>
      </div>

      <div className="quickLinks">
        {serviceLinks.map(link => (
          <a className="cardTitle" key={link.href} href={link.href}>{link.label}<ChevronRight size={16} /></a>
        ))}
      </div>

      <div className="accountLayout">
        <form key={profile.user.username} className="accountForm" onSubmit={save} aria-busy={busy}>
          <h2>Профиль студента</h2>
          <label>Факультет<input name="faculty" defaultValue={profile.faculty} maxLength={120} required /></label>
          <label>Курс<input name="course" type="number" min={1} max={6} defaultValue={profile.course} required /></label>
          <label>Специальность<input name="specialty" defaultValue={profile.specialty} maxLength={160} required /></label>
          <label>О себе<textarea name="bio" defaultValue={profile.bio} /></label>
          <label>Навыки через запятую<input name="skills" defaultValue={profile.skills.join(", ")} /></label>
          <label>Интересы через запятую<input name="interests" defaultValue={profile.interests.join(", ")} /></label>
          <label>Видимость профиля<select name="privacy_level" defaultValue={profile.privacy_level}>
            <option value="public">Виден всем</option>
            <option value="private">Только мне</option>
          </select></label>
          <label className="checkLabel"><input type="checkbox" name="is_available" defaultChecked={profile.is_available} /> Готов участвовать в проектах</label>
          <label className="checkLabel"><input type="checkbox" name="looking_for_team" defaultChecked={profile.looking_for_team ?? false} /> Ищу команду (покажу в «Подборе команды»)</label>
          <button className="primaryButton" disabled={busy}>{busy ? "Сохранение…" : "Сохранить изменения"}</button>
        </form>
      </div>
    </section>
  );
}
"use client";

import { Download, LogIn } from "lucide-react";

import type { ProfileDto } from "@/lib/domain/types";

interface SettingsScreenProps {
  profile?: ProfileDto;
  isAuthenticated: boolean;
  canModerate: boolean;
  onExport(): void;
  onLogout(): void;
}

export function SettingsScreen({ profile, isAuthenticated, canModerate, onExport, onLogout }: SettingsScreenProps) {
  return (
    <section className="screen">
      <div className="blockHeader"><div><p className="eyebrow">НАСТРОЙКИ</p><h1>Экспорт и настройки</h1></div></div>

      <section className="feedGroup">
        <h2>Экспорт данных</h2>
        <p>Скачайте все данные своей учётной записи в формате JSON: профиль, проекты, идеи, клубы, события, уведомления.</p>
        {isAuthenticated ? (
          <button className="primaryButton" onClick={onExport}><Download size={18} /> Скачать мои данные</button>
        ) : (
          <p className="emptyState"><a href="#login">Войдите</a>, чтобы скачать свои данные.</p>
        )}
      </section>

      <section className="feedGroup">
        <h2>Аккаунт</h2>
        {isAuthenticated ? (
          <div className="formRow">
            <span className="tag">{profile?.user.username ?? "Вы вошли"}</span>
            <button className="secondaryButton" onClick={onLogout}><LogIn size={16} /> Выйти</button>
          </div>
        ) : (
          <a className="actionButton" href="#login">Войти</a>
        )}
      </section>

      {canModerate && (
        <section className="feedGroup">
          <h2>Для модераторов</h2>
          <p>У вас есть права модератора: вам доступен раздел «Модерация», управление событиями и назначение достижений.</p>
          <a className="secondaryButton" href="#admin">Перейти в модерацию</a>
        </section>
      )}

      <section className="feedGroup">
        <h2>О проекте</h2>
        <p>BIRGE — сообщество студентов Ошского технологического университета (ОшТУ): пространство, где рождаются идеи, собираются команды и происходят события.</p>
        <p><small>Версия 2.0 · 2026. Разработано силами сообщества.</small></p>
      </section>
    </section>
  );
}
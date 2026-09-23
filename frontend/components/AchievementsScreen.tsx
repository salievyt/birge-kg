"use client";

import { FormEvent, useState } from "react";
import { Award, Gift, Rocket, Star, Target, Trophy, Users } from "lucide-react";

import { fmtDate, userName } from "@/lib/domain/format";
import type { AchievementDto } from "@/lib/domain/types";

import { SkeletonCards } from "./Skeleton";

interface AchievementsScreenProps {
  achievements?: AchievementDto[];
  loading: boolean;
  canModerate: boolean;
  users?: Array<{ id: number; label: string }>;
  onAward(userId: number, title: string, icon: string): Promise<boolean>;
}

const ICONS: Record<string, typeof Trophy> = {
  trophy: Trophy,
  star: Star,
  rocket: Rocket,
  award: Award,
  gift: Gift,
  users: Users,
  target: Target,
};

export function AchievementsScreen({ achievements, loading, canModerate, users, onAward }: AchievementsScreenProps) {
  const [showAward, setShowAward] = useState(false);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("trophy");

  if (loading && !achievements) return <section className="screen"><h1>Достижения</h1><SkeletonCards count={4} /></section>;
  const items = achievements ?? [];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !title.trim()) return;
    void onAward(Number(userId), title.trim(), icon).then(ok => {
      if (ok) {
        setUserId("");
        setTitle("");
        setIcon("trophy");
        setShowAward(false);
      }
    });
  }

  return (
    <section className="screen">
      <div className="blockHeader">
        <div><p className="eyebrow">СТЕНА СЛАВЫ</p><h1>Достижения сообщества</h1></div>
        {canModerate && (
          <button className="secondaryButton" onClick={() => setShowAward(v => !v)}>{showAward ? "Свернуть" : "Наградить"}</button>
        )}
      </div>

      {showAward && canModerate && (
        <form className="accountForm awardForm" onSubmit={submit}>
          <label>Студент
            <select value={userId} onChange={e => setUserId(e.target.value)} required>
              <option value="">Выберите пользователя</option>
              {(users ?? []).map(user => <option key={user.id} value={user.id}>{user.label}</option>)}
            </select>
          </label>
          <label>Название достижения<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required placeholder="Например: Лидер месяца" /></label>
          <label>Иконка
            <select value={icon} onChange={e => setIcon(e.target.value)}>
              {Object.keys(ICONS).map(key => <option key={key} value={key}>{key}</option>)}
            </select>
          </label>
          <button className="primaryButton">Присвоить</button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="emptyState">Пока нет достижений — откройте их первым.</p>
      ) : (
        <div className="wall">
          {items.map(achievement => {
            const Icon = ICONS[achievement.icon] ?? Trophy;
            return (
              <article className="wallCard" key={achievement.id}>
                <Icon size={26} />
                <div>
                  <strong>{achievement.title}</strong>
                  <span>{userName(achievement.user)}</span>
                  <small>{fmtDate(achievement.awarded_at)}</small>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
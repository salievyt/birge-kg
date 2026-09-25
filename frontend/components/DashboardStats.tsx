"use client";

import { Medal, Trophy } from "lucide-react";

import type { DashboardDto } from "@/lib/domain/types";

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

interface Achievement {
  label: string;
  unlocked: boolean;
}

function monthLabel(month: string): string {
  const index = Number(month.slice(5, 7));
  return MONTHS[index - 1] ?? month;
}

function buildAchievements(dashboard: DashboardDto): Achievement[] {
  const { stats } = dashboard;
  return [
    { label: "Первый проект", unlocked: stats.projects >= 1 },
    { label: "5+ проектов", unlocked: stats.projects >= 5 },
    { label: "20+ участников", unlocked: stats.participants >= 20 },
    { label: "Запущены клубы", unlocked: stats.clubs >= 1 },
    { label: "Мероприятия идут", unlocked: stats.events >= 1 },
  ];
}

function barHeight(count: number, max: number): number {
  return max > 0 ? Math.max(8, Math.round((count / max) * 100)) : 0;
}

export function DashboardStats({ dashboard, onOpenFaculty }: { dashboard: DashboardDto; onOpenFaculty?(name: string): void }) {
  const maxActivity = Math.max(1, ...dashboard.activity.map(point => point.count));
  const maxFaculty = Math.max(1, ...dashboard.top_faculties.map(item => item.count));
  const achievements = buildAchievements(dashboard);

  return (
    <section className="dashboard" aria-label="Статистика сообщества">
      <div className="blockHeader">
        <div>
          <p className="eyebrow">СТАТИСТИКА</p>
          <h2>Жизнь сообщества</h2>
        </div>
      </div>
      <div className="charts">
        <div className="chartCard">
          <h3>Активность за 6 месяцев</h3>
          <div className="barChart" role="img" aria-label="Активность сообщества по месяцам">
            {dashboard.activity.map(point => (
              <div className="barCol" key={point.month}>
                <span className="barValue">{point.count}</span>
                <span className="bar" style={{ height: `${barHeight(point.count, maxActivity)}%` }} />
                <span className="barLabel">{monthLabel(point.month)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="chartCard">
          <h3>Топ факультетов</h3>
          {dashboard.top_faculties.length ? (
            <div className="rows">
              {dashboard.top_faculties.filter(item => item.name.trim()).map(item => (
                <button
                  className="row facultyRow"
                  key={item.name}
                  onClick={() => onOpenFaculty?.(item.name)}
                  title={`Факультет: ${item.name}`}
                >
                  <span className="rowName">{item.name}</span>
                  <span className="rowTrack"><i style={{ width: `${barHeight(item.count, maxFaculty)}%` }} /></span>
                  <span className="rowValue">{item.count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="emptyState">Пока нет данных.</p>
          )}
        </div>
        <div className="chartCard">
          <h3>Направления</h3>
          {dashboard.directions.length ? (
            <div className="tags">{dashboard.directions.filter(item => item.name.trim()).map(item => <span className="tag" key={item.name}>{item.name === "birge-info" ? "Сообщество BIRGE" : item.name} · {item.count}</span>)}</div>
          ) : (
            <p className="emptyState">Пока нет данных.</p>
          )}
        </div>
      </div>
      <div className="achievements">
        <div className="blockHeader">
          <div>
            <p className="eyebrow">ДОСТИЖЕНИЯ</p>
            <h3>Вехи сообщества</h3>
          </div>
        </div>
        <div className="achievementWall">
          {achievements.map(achievement => (
            <div className={`achievement${achievement.unlocked ? "" : " locked"}`} key={achievement.label}>
              {achievement.unlocked ? <Trophy size={20} /> : <Medal size={20} />}
              <span>{achievement.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

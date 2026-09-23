"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarDto } from "@/lib/domain/types";

import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";

interface CalendarScreenProps {
  calendar?: CalendarDto;
  calendarKey: string;
  loading: boolean;
  onMonthChange(year: number, month: number): void;
  onOpenEvent(id: number): void;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function CalendarScreen({ calendar, calendarKey, loading, onMonthChange, onOpenEvent }: CalendarScreenProps) {
  const year = calendar?.year ?? new Date().getFullYear();
  const month = calendar?.month ?? new Date().getMonth() + 1;
  const title = `${MONTHS[month - 1]} ${year}`;

  function shift(delta: number) {
    const m = new Date(year, month - 1 + delta, 1);
    onMonthChange(m.getFullYear(), m.getMonth() + 1);
  }

  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDay = new Map<number, typeof events>();
  const events = calendar?.events ?? [];
  for (const event of events) {
    if (!event.starts_at) continue;
    const day = new Date(event.starts_at).getDate();
    const list = byDay.get(day) ?? [];
    list.push(event);
    byDay.set(day, list);
  }
  const todayDay = new Date().getFullYear() === year && new Date().getMonth() + 1 === month ? new Date().getDate() : 0;

  return (
    <section className="screen">
      <div className="blockHeader">
        <div><p className="eyebrow">РАСПИСАНИЕ</p><h1>Календарь {title}</h1></div>
        <div className="monthNav">
          <button className="iconButton" aria-label="Предыдущий месяц" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
          <button className="secondaryButton" onClick={() => onMonthChange(new Date().getFullYear(), new Date().getMonth() + 1)}>Сегодня</button>
          <button className="iconButton" aria-label="Следующий месяц" onClick={() => shift(1)}><ChevronRight size={18} /></button>
        </div>
      </div>

      {loading && !calendar ? (
        <SkeletonCards count={4} />
      ) : (
        <>
          <div className="calendarGrid" role="grid" aria-label={title}>
            {WEEKDAYS.map(day => <div className="calendarWeekday" key={day}>{day}</div>)}
            {Array.from({ length: firstWeekday }).map((_, i) => <div className="calendarCell empty" key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = byDay.get(day) ?? [];
              return (
                <div className={`calendarCell ${day === todayDay ? "today" : ""}`} key={day}>
                  <span className="calendarDay">{day}</span>
                  {dayEvents.map(event => (
                    <button key={event.id} className="calendarEvent" onClick={() => onOpenEvent(event.id)}>
                      {event.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <section className="feedGroup">
            <div className="blockHeader"><h2>Мероприятия месяца</h2></div>
            <ItemCards items={events} kind="event" onOpen={(item) => onOpenEvent(item.id)} />
          </section>
        </>
      )}
    </section>
  );
}
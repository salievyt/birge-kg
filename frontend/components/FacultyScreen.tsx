"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Lightbulb, Music, Users } from "lucide-react";

import type { FacultyDto } from "@/lib/domain/types";

import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";

interface FacultyScreenProps {
  faculties?: string[];
  onSelect(name: string): void;
  faculty?: FacultyDto;
  loading: boolean;
  onOpenDetail(kind: "project" | "club", id: number): void;
  onOpenEvent(id: number): void;
  onOpenPerson(id: number): void;
}

type Tab = "students" | "projects" | "clubs" | "events";

export function FacultyScreen({ faculty, faculties, onSelect, loading, onOpenDetail, onOpenEvent, onOpenPerson }: FacultyScreenProps) {
  const [tab, setTab] = useState<Tab>("students");
  const tabs: Array<{ key: Tab; label: string; count: number }> = useMemo(
    () => [
      { key: "students", label: "Студенты", count: faculty?.students_count ?? 0 },
      { key: "projects", label: "Проекты", count: faculty?.projects_count ?? 0 },
      { key: "clubs", label: "Клубы", count: faculty?.clubs_count ?? 0 },
      { key: "events", label: "События", count: faculty?.events_count ?? 0 },
    ],
    [faculty],
  );

  if (loading && !faculty) return <section className="screen"><h1>Факультет</h1><SkeletonCards count={4} /></section>;
  if (!faculty) return <section className="screen"><h1>Факультеты</h1>{faculties?.length ? <div className="peopleGrid">{faculties.map(name => <button className="personRow" key={name} onClick={() => onSelect(name)}><GraduationCap size={20} />{name}</button>)}</div> : <p className="emptyState">Пока нет заполненных факультетов. <a href="#profile">Добавить факультет в профиль</a></p>}</section>;

  return (
    <section className="screen">
      <div className="blockHeader">
        <div><p className="eyebrow">ФАКУЛЬТЕТ</p><h1>{faculty.name}</h1></div>
      </div>

      <div className="statGrid">
        <article className="chartCard statCard"><GraduationCap size={20} /><strong>{faculty.students_count}</strong><span>Студентов</span></article>
        <article className="chartCard statCard"><Lightbulb size={20} /><strong>{faculty.projects_count}</strong><span>Проектов</span></article>
        <article className="chartCard statCard"><Music size={20} /><strong>{faculty.clubs_count}</strong><span>Клубов</span></article>
        <article className="chartCard statCard"><Users size={20} /><strong>{faculty.events_count}</strong><span>Событий</span></article>
      </div>

      <div className="tabs" role="tablist" aria-label="Содержимое факультета">
        {tabs.map(tabDef => (
          <button key={tabDef.key} role="tab" aria-selected={tab === tabDef.key}
            className={`tab ${tab === tabDef.key ? "isActive" : ""}`} onClick={() => setTab(tabDef.key)}>
            {tabDef.label} ({tabDef.count})
          </button>
        ))}
      </div>

      {tab === "students" && (
        <div className="peopleGrid">
          {faculty.students.map(student => (
            <button className="personRow" key={student.id} onClick={() => onOpenPerson(student.id)}>
              <GraduationCap size={18} />
              <span>
                <strong>{[student.user.first_name, student.user.last_name].filter(Boolean).join(" ") || student.user.username}</strong>
                <small>{student.course} курс · {student.specialty}</small>
              </span>
            </button>
          ))}
          {faculty.students.length === 0 && <p className="emptyState">На этом факультете пока никого нет.</p>}
        </div>
      )}
      {tab === "projects" && <ItemCards items={faculty.projects} kind="project" onOpen={(item) => onOpenDetail("project", item.id)} />}
      {tab === "clubs" && <ItemCards items={faculty.clubs} kind="club" onOpen={(item) => onOpenDetail("club", item.id)} />}
      {tab === "events" && <ItemCards items={faculty.events} kind="event" onOpen={(item) => onOpenEvent(item.id)} />}
    </section>
  );
}

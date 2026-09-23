"use client";

import { CalendarDays, GraduationCap, Users } from "lucide-react";

import { itemTitle, userName } from "@/lib/domain/format";
import type { PersonDto } from "@/lib/domain/types";

import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";

interface PersonScreenProps {
  person?: PersonDto;
  loading: boolean;
  onOpenDetail(kind: "project" | "club", id: number): void;
  onOpenEvent(id: number): void;
}

export function PersonScreen({ person, loading, onOpenDetail, onOpenEvent }: PersonScreenProps) {
  if (loading && !person) return <section className="screen"><h1>Профиль</h1><SkeletonCards count={3} /></section>;
  if (!person) return <section className="screen"><h1>Профиль</h1><p className="emptyState">Профиль не найден или скрыт владельцем.</p></section>;

  const profile = person.profile;
  return (
    <section className="screen">
      <div className="blockHeader">
        <div>
          <p className="eyebrow">ПУБЛИЧНЫЙ ПРОФИЛЬ</p>
          <h1>{userName(profile.user)}</h1>
        </div>
      </div>

      <div className="personHero">
        <div className="personStat"><GraduationCap size={20} /><strong>{profile.faculty}</strong><span>Факультет</span></div>
        <div className="personStat"><strong>{profile.course} курс</strong><span>{profile.specialty}</span></div>
        <div className="personStat"><Users size={20} /><strong>{person.projects.length + person.clubs.length}</strong><span>участий</span></div>
        {profile.is_available && <span className="tag isAvailable">Готов(а) к проектам</span>}
      </div>

      {profile.bio && <p className="personBio">{profile.bio}</p>}
      <div className="tags">{profile.skills.map(s => <span className="tag" key={s}>{s}</span>)}</div>

      <div className="personalLists">
        <section>
          <h2>Проекты</h2>
          <ItemCards items={person.projects} kind="project" onOpen={(item) => onOpenDetail("project", item.id)} />
        </section>
        <section>
          <h2>Клубы</h2>
          <ItemCards items={person.clubs} kind="club" onOpen={(item) => onOpenDetail("club", item.id)} />
        </section>
        <section>
          <h2>Мероприятия</h2>
          <ItemCards items={person.events} kind="event" onOpen={(item) => onOpenEvent(item.id)} />
        </section>
      </div>
    </section>
  );
}
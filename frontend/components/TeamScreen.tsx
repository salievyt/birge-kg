"use client";

import { FormEvent, useState } from "react";
import { Check, GraduationCap, Send, Users } from "lucide-react";

import { userName } from "@/lib/domain/format";
import type { ItemDto, MatchingDto } from "@/lib/domain/types";

import { SkeletonCards } from "./Skeleton";

interface TeamScreenProps {
  matching?: MatchingDto;
  loading: boolean;
  isAuthenticated: boolean;
  canModerate: boolean;
  onApply(projectId: number, role: string): Promise<boolean>;
  onOpenDetail(kind: "project", id: number): void;
  onOpenPerson(id: number): void;
}

export function TeamScreen({ matching, loading, isAuthenticated, canModerate, onApply, onOpenDetail, onOpenPerson }: TeamScreenProps) {
  const [applyTo, setApplyTo] = useState<ItemDto | null>(null);
  const [role, setRole] = useState("");
  const [done, setDone] = useState<number | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!applyTo) return;
    void onApply(applyTo.id, role).then(ok => {
      if (ok) {
        setDone(applyTo.id);
        setApplyTo(null);
        setRole("");
      }
    });
  }

  if (loading && !matching) return <section className="screen"><h1>Подбор команды</h1><SkeletonCards count={4} /></section>;
  const projects = matching?.projects ?? [];
  const people = matching?.people ?? [];

  return (
    <section className="screen">
      <div className="blockHeader">
        <div><p className="eyebrow">КОМАНДА</p><h1>Подбор команды</h1></div>
      </div>

      <div className="teamColumns">
        <section>
          <h2>Проектам нужны люди ({projects.length})</h2>
          {projects.length === 0 ? (
            <p className="emptyState">Сейчас нет открытых позиций. Загляните позже.</p>
          ) : (
            <div className="cardList">
              {projects.map(project => (
                <article className="card" key={project.id}>
                  <div className="cardTop"><span>{project.direction}</span><span>{project.status_label}</span></div>
                  <h3><button className="cardTitle" onClick={() => onOpenDetail("project", project.id)}>{project.title}</button></h3>
                  <p>{project.description}</p>
                  {project.needed_roles && (
                    <div className="tags">{project.needed_roles.map(roleItem => <span className="tag" key={roleItem}>{roleItem}</span>)}</div>
                  )}
                  {done === project.id ? (
                    <p className="successNote"><Check size={14} /> Заявка отправлена</p>
                  ) : (
                    <button className="secondaryButton" disabled={!isAuthenticated}
                      onClick={() => { setDone(null); setApplyTo(project); }}><Send size={16} /> Подать заявку</button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2>Люди ищут команду ({people.length})</h2>
          {people.length === 0 ? (
            <p className="emptyState">Пока никто не отметил готовность к командной работе.</p>
          ) : (
            <div className="cardList">
              {people.map(person => (
                <article className="card" key={person.user.id}>
                  <h3><button className="cardTitle" onClick={() => onOpenPerson(person.id)}>{userName(person.user)}</button></h3>
                  <p>{person.faculty} · {person.course} курс · {person.specialty}</p>
                  <div className="tags">{person.skills.map(skill => <span className="tag" key={skill}>{skill}</span>)}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {applyTo && (
        <form className="accountForm applyForm" onSubmit={submit}>
          <div className="blockHeader"><h2>Заявка: {applyTo.title}</h2></div>
          <label>Роль, которую хотите занять
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="Например: Frontend-разработчик" maxLength={80} />
          </label>
          <div className="formRow">
            <button className="primaryButton" >Отправить заявку</button>
            <button type="button" className="secondaryButton" onClick={() => setApplyTo(null)}>Отмена</button>
          </div>
        </form>
      )}

      {!isAuthenticated && <p className="emptyState"><a href="#login">Войдите</a>, чтобы подавать заявки.</p>}
    </section>
  );
}

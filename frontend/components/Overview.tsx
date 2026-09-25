"use client";

import { ArrowRight } from "lucide-react";
import { catalogSections, feedResources } from "@/lib/domain/catalog";
import type { CatalogData, DashboardDto, ResourceKind } from "@/lib/domain/types";
import { DashboardStats } from "./DashboardStats";
import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";

interface OverviewProps {
  loading: boolean; data: CatalogData; dashboard: DashboardDto | null;
  onOpenDetail(kind: ResourceKind, id: number): void;
  onOpenEvent(id: number): void; onOpenPerson(id: number): void; onOpenFaculty(name: string): void;
}

export function Overview({ loading, data, dashboard, onOpenDetail, onOpenEvent, onOpenFaculty }: OverviewProps) {
  return <>
    <section className="hero overviewHero"><div className="heroCopy"><p className="eyebrow">СООБЩЕСТВО ОШТУ</p><h1>BIRGE</h1><p className="heroTagline">Идеи. Люди. Действия.</p><div className="quickActions"><a className="actionButton" href="#projects">Найти проект <ArrowRight size={16} /></a><a className="actionButton" href="#team">Найти команду</a></div></div></section>
    <section className="feed"><p className="eyebrow">СООБЩЕСТВО</p><h2>Новое в BIRGE</h2>{loading ? <SkeletonCards count={4} /> : feedResources.map(id => {
      const section = catalogSections.find(s => s.id === id);
      const kind: ResourceKind = id === "events" ? "event" : id === "ideas" ? "idea" : id === "clubs" ? "club" : "project";
      const items = (data[id] || []).slice(0, 3);
      return <div className="feedGroup" key={id}><div className="blockHeader"><h3>{section?.title}</h3><a href={`#${id}`}>Все <ArrowRight size={16} /></a></div>{items.length ? <ItemCards items={items} kind={kind} onOpen={item => kind === "event" ? onOpenEvent(item.id) : onOpenDetail(kind, item.id)} /> : <p className="emptyState">Новых публикаций пока нет. <a href={`#${id}`}>{id === "ideas" ? "Предложить идею" : id === "clubs" ? "Создать клуб" : id === "events" ? "Добавить мероприятие" : "Создать проект"} <ArrowRight size={14} /></a></p>}</div>;
    })}</section>
    {dashboard && <details className="communityStats"><summary>Статистика сообщества</summary><DashboardStats dashboard={dashboard} onOpenFaculty={onOpenFaculty} /></details>}
  </>;
}

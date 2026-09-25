"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { ItemDto, ResourceKey, ResourceKind } from "@/lib/domain/types";
import { catalogApi } from "@/lib/infrastructure/api";
import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";
import { CreateContent } from "./CreateContent";

interface CatalogScreenProps {
  title: string; resource: ResourceKey; authenticated: boolean; csrf: string; busy: boolean;
  onCreate(resource: ResourceKey, body: Record<string, unknown>): Promise<boolean>;
  onItemOpen(item: ItemDto): void;
}

export function CatalogScreen({ title, resource, authenticated, csrf, busy, onCreate, onItemOpen }: CatalogScreenProps) {
  const [items, setItems] = useState<ItemDto[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  function changeFilter(key: string, value: string) {
    setFilters(previous => ({...previous, [key]: value}));
    setItems([]); setMore(false); setPage(1);
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = window.setTimeout(() => {
      catalogApi.page(resource, page, search, controller.signal, filters).then(result => {
        if (controller.signal.aborted) return;
        setItems(previous => page === 1 ? result.results : [...previous, ...result.results.filter(item => !previous.some(old => old.id === item.id))]);
        setMore(Boolean(result.next)); setCount(result.count);
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, search || Object.values(filters).some(Boolean) ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [resource, page, search, reload, filters]);
  const kind: ResourceKind | "people" = resource === "people" ? "people" : resource === "events" ? "event" : resource === "ideas" ? "idea" : resource === "clubs" ? "club" : "project";
  const label = resource === "clubs" ? "Создать клуб" : resource === "ideas" ? "Предложить идею" : resource === "events" ? "Создать мероприятие" : "Создать проект";
  return <section className="screen"><p className="eyebrow">BIRGE / СООБЩЕСТВО</p><div className="blockHeader"><h1>{title}</h1>{resource !== "people" && (authenticated ? <button className="primaryButton" onClick={() => setCreating(!creating)}><Plus size={16} />{label}</button> : <a className="primaryButton" href="#login">Войти и создать</a>)}</div>
    {creating && <CreateContent resource={resource} csrf={csrf} busy={busy} onCancel={() => setCreating(false)} onCreate={async (key, body) => { const ok = await onCreate(key, body); if (ok) { setItems([]); setPage(1); setReload(v => v + 1); } return ok; }} />}
    <label className="catalogSearch"><Search size={18} /><input type="search" aria-label="Поиск по каталогу" value={search} onChange={event => { setSearch(event.target.value); setPage(1); setItems([]); }} placeholder="Поиск по каталогу" /></label>
    {(resource === "projects" || resource === "people") && <div className="catalogFilters">
      {resource === "projects" && <label>Статус<select value={filters.status ?? ""} onChange={event => changeFilter("status", event.target.value)}><option value="">Все статусы</option><option value="recruiting">Набор команды</option><option value="active">В работе</option><option value="done">Завершён</option></select></label>}
      {(resource === "projects" ? [["direction", "Направление"], ["role", "Нужная роль"]] : [["faculty", "Факультет"], ["specialty", "Специальность"], ["skill", "Навык"], ["interest", "Интерес"]]).map(([key, label]) => <label key={key}>{label}<input value={filters[key] ?? ""} onChange={event => changeFilter(key, event.target.value)} maxLength={90} /></label>)}
      {resource === "people" && <label className="availabilityFilter"><input type="checkbox" checked={filters.available === "true"} onChange={event => changeFilter("available", event.target.checked ? "true" : "")} />Готовы участвовать</label>}
      {(search || Object.values(filters).some(Boolean)) && <button className="secondaryButton" onClick={() => { setSearch(""); setFilters({}); setPage(1); setItems([]); setMore(false); }}>Сбросить фильтры</button>}
    </div>}
    {error && <div role="alert"><p>{error}</p><button className="secondaryButton" onClick={() => setReload(v => v + 1)}>Повторить</button></div>}
    {loading && page === 1 ? <SkeletonCards count={6} /> : items.length ? <><p className="mutedMeta">Найдено: {count}</p><ItemCards items={items} kind={kind} onOpen={onItemOpen} /></> : !error && <div className="emptyState"><p>{search ? "По вашему запросу ничего не найдено." : resource === "people" ? "Участники пока не заполнили публичные профили." : "Здесь пока нет публикаций. Ваша может стать первой."}</p><a href={resource === "people" ? "#profile" : "#overview"}>{resource === "people" ? "Заполнить профиль" : "Посмотреть новое в сообществе"}</a></div>}
    {more && !error && <button className="secondaryButton loadMore" disabled={loading} onClick={() => setPage(v => v + 1)}>{loading ? "Загрузка…" : "Показать ещё"}</button>}
  </section>;
}

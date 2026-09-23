import type { ResourceKey, ResourceKind, Screen } from "./types";

export interface SectionDef {
  id: string;
  title: string;
}

export const overviewSection: SectionDef = { id: "overview", title: "Обзор" };

export const catalogSections: SectionDef[] = [
  { id: "projects", title: "Проекты" },
  { id: "ideas", title: "Идеи" },
  { id: "clubs", title: "Клубы" },
  { id: "events", title: "Мероприятия" },
  { id: "people", title: "Люди" },
];

export const adminSection: SectionDef = { id: "admin", title: "Модерация" };

export const serviceSections: SectionDef[] = [
  { id: "feed", title: "Новости" },
  { id: "cabinet", title: "Мой кабинет" },
  { id: "team", title: "Подбор команды" },
  { id: "favorites", title: "Избранное" },
  { id: "calendar", title: "Календарь" },
  { id: "faculty", title: "Факультеты" },
  { id: "achievements", title: "Достижения" },
  { id: "admission", title: "Вступить в BIRGE" },
  { id: "help", title: "Помощь" },
  { id: "settings", title: "Настройки" },
];

export const serviceGuarded: ReadonlySet<string> = new Set(["cabinet", "favorites", "settings"]);

export const browserResources: ResourceKey[] = ["projects", "ideas", "clubs", "events", "people"];

export const feedResources: ResourceKey[] = ["projects", "ideas", "clubs", "events"];

export function endpointFor(resource: ResourceKey): string {
  return resource === "people" ? "profiles" : resource;
}

export function endpointForKind(kind: ResourceKind): string {
  return kind === "event" ? "events" : `${kind}s`;
}

const titles: Record<string, string> = {
  overview: "Обзор",
  profile: "Профиль студента",
  login: "Вход",
  register: "Регистрация",
  admin: "Модерация",
  cabinet: "Мой кабинет",
  notifications: "Уведомления",
  favorites: "Избранное",
  team: "Подбор команды",
  feed: "Лента новостей",
  achievements: "Достижения",
  calendar: "Календарь",
  faculty: "Факультет",
  person: "Профиль",
  detail: "Подробнее",
  event: "Мероприятие",
  admission: "Вступить в BIRGE",
  help: "Помощь и правила",
  settings: "Настройки",
};

export function titleFor(screen: Screen | string): string | undefined {
  const section = [...catalogSections, overviewSection, adminSection].find(s => s.id === screen);
  return section?.title ?? titles[screen];
}

export function isKnownScreen(value: string): boolean {
  const known = new Set<string>([
    "overview",
    "profile",
    "login",
    "register",
    "admin",
    ...serviceSections.map(s => s.id),
    ...catalogSections.map(s => s.id),
  ]);
  return known.has(value);
}
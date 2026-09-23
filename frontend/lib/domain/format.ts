import type { ItemDto, UserDto } from "./types";

export function userName(user?: UserDto): string {
  if (!user) return "—";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  return full;
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function itemTitle(item: ItemDto): string {
  if (item.user && !item.title && !item.name) return userName(item.user);
  return item.title || item.name || "Без названия";
}

export function itemMeta(item: ItemDto): string {
  return item.direction || item.category || item.faculty || (item.status_label ?? "") || "";
}

export function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    project: "Проект",
    idea: "Идея",
    club: "Клуб",
    event: "Мероприятие",
  };
  return labels[kind] ?? kind;
}
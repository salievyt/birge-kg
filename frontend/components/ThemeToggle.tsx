"use client";

import { Moon, Sun } from "lucide-react";

import type { Theme } from "@/lib/application/useAppController";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle(): void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="iconButton themeToggle"
      type="button"
      onClick={onToggle}
      aria-label={next === "dark" ? "Включить тёмную тему" : "Включить светлую тему"}
      title={next === "dark" ? "Тёмная тема" : "Светлая тема"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
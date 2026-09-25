"use client";

import { Menu, X, UserRound } from "lucide-react";
import Image from "next/image";

import {
  adminSection,
  catalogSections,
  overviewSection,
  serviceSections,
  serviceGuarded,
} from "@/lib/domain/catalog";
import type { Theme } from "@/lib/application/useAppController";
import type { Screen } from "@/lib/domain/types";

import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  screen: Screen;
  menuOpen: boolean;
  isAuthenticated: boolean;
  canModerate: boolean;
  theme: Theme;
  onToggleTheme(): void;
  onToggleMenu(): void;
}

export function Header({ screen, menuOpen, isAuthenticated, canModerate, theme, onToggleTheme, onToggleMenu }: HeaderProps) {
  const navItems = [overviewSection, ...catalogSections, ...(canModerate ? [adminSection] : [])];
  const serviceItems = serviceSections.filter(section => !serviceGuarded.has(section.id) || isAuthenticated);
  return (
    <header className="topbar">
      <a className="brand" href="#overview">
        <Image src="/logo.svg" alt="BIRGE" width={112} height={92} priority />
        <span>BIRGE<small>Сообщество ОшТУ</small></span>
      </a>
      <span className="headerMotto">Вместе начинается больше.</span>
      <nav aria-label="Разделы" className={`navlinks ${menuOpen ? "isOpen" : ""}`}>
        <div className="navMain">
          {navItems.map(section => (
            <a key={section.id} href={`#${section.id}`} aria-current={screen === section.id ? "page" : undefined}>
              {section.title}
            </a>
          ))}
        </div>
        <details className="navMore" key={screen}>
          <summary>Ещё</summary>
        <div className="navServices">
          {serviceItems.map(section => (
            <a key={section.id} href={`#${section.id}`} aria-current={screen === section.id ? "page" : undefined}>
              {section.title}
            </a>
          ))}
        </div>
        </details>
      </nav>
      <div className="headerTools">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <a className="accountLink" aria-label={isAuthenticated ? "Личный кабинет" : "Войти"} title={isAuthenticated ? "Личный кабинет" : "Войти"} href={isAuthenticated ? "#profile" : "#login"}>
          <UserRound size={20} /><span>{isAuthenticated ? "Личный кабинет" : "Войти"}</span>
        </a>
        <button className="iconButton menuToggle" aria-label="Меню" aria-expanded={menuOpen} onClick={onToggleMenu}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Compass,
  Gamepad2,
  HardHat,
  Home,
  Lightbulb,
  LifeBuoy,
  PartyPopper,
  RotateCcw,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import Image from "next/image";

import { catalogSections, overviewSection, serviceSections } from "@/lib/domain/catalog";

/** Смешные подписи — выбирается случайная при каждом заходе на страницу. */
const FUNNY_SUBTITLES: readonly string[] = [
  "Эта страница ушла гулять по кампусу и не вернулась.",
  "404: страница сдала долг и исчезла. Как ты перед сессией.",
  "Похоже, её забрали в научную экспедицию на Ала-Тоо.",
  "Мы искали в библиотеке, столовой и даже в чате потока — нету.",
  "Страница улетела на парах высшей математики.",
  "Она существует параллельно с твоим свободным временем.",
  "Деканат категорически отрицает существование этой страницы.",
  "Страница на пересдаче. Приходите после сессии.",
  "Кажется, её случайно съел принтер в читальном зале.",
  "Страница скрыта за NDA студсовета.",
];

/** Подписи к «выпавшему» достижению. */
const ACHIEVEMENT_WINS: readonly string[] = [
  "Найдено то, чего не существует!",
  "Мастер пустоты — прочекал 404 и выжил.",
  "Секретный уровень открыт. Приз — это достижение.",
  "Ты тыкнул в ноль. Ноль тыкнул в ответ.",
];

/** Лог «падения» для терминала на 500. */
const TERMINAL_SCRIPT: readonly string[] = [
  "$ birge --diagnose",
  "  ✔ связь с сервером… потеряна",
  "  ✔ попробуем ещё раз?",
  "> перезапуск среды…",
];

/** Код Konami: каждой позиции соответствует набор допустимых клавиш (EN + RU раскладка). */
const KONAMI: readonly (readonly string[])[] = [
  ["ArrowUp"],
  ["ArrowUp"],
  ["ArrowDown"],
  ["ArrowDown"],
  ["ArrowLeft"],
  ["ArrowRight"],
  ["ArrowLeft"],
  ["ArrowRight"],
  ["b", "B", "и", "И"],
  ["a", "A", "ф", "Ф"],
];

const CONFETTI_COLORS = ["#0066cc", "#3ea6ff", "#d4932f", "#f0a93c", "#2f9e64", "#e06c5c"];

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
}

function pickRandom<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Единый креативный экран ошибок BIRGE (404 / 500) с пасхалками:
 * случайные подписи, мини-игра «поймай ноль-двойник», секретные
 * достижения, конфетти и код Konami.
 */
export function ErrorPage({ code, onRetry }: { code: "404" | "500"; onRetry?: () => void }) {
  const is404 = code === "404";

  // Случайная смешная подпись (ставим в эффекте, чтобы не ломать гидрацию)
  const [subtitle, setSubtitle] = useState(FUNNY_SUBTITLES[0]);
  useEffect(() => {
    setSubtitle(pickRandom(FUNNY_SUBTITLES));
  }, []);

  // 404: подсказки разделов по мере ввода
  const [query, setQuery] = useState("");
  // 404: периодический glitch цифр
  const [glitch, setGlitch] = useState(false);

  // Мини-игра «поймай ноль-двойник»
  const [catches, setCatches] = useState(0);
  const [zeroPosition, setZeroPosition] = useState({ x: 62, y: 18 });
  const [achievement, setAchievement] = useState<string | null>(null);

  // Конфетти
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const confettiId = useRef(0);

  // Konami
  const konamiProgress = useRef(0);

  const fireConfetti = useCallback((count = 60) => {
    const pieces: ConfettiPiece[] = Array.from({ length: count }, () => ({
      id: ++confettiId.current,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 2.4 + Math.random() * 1.6,
      color: pickRandom(CONFETTI_COLORS),
      size: 6 + Math.random() * 8,
      drift: (Math.random() - 0.5) * 160,
    }));
    setConfetti(prev => [...prev, ...pieces]);
    window.setTimeout(() => {
      setConfetti(prev => prev.filter(piece => !pieces.some(p => p.id === piece.id)));
    }, 4800);
  }, []);

  const unlockAchievement = useCallback((reason: string) => {
    setAchievement(`${pickRandom(ACHIEVEMENT_WINS)} ${reason}`.trim());
    fireConfetti();
  }, [fireConfetti]);

  // 500: терминал печатает лог
  const terminalRef = useRef<HTMLPreElement>(null);
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (is404) {
      const timer = window.setInterval(() => setGlitch(g => !g), 3200);
      return () => window.clearInterval(timer);
    }
    let cancelled = false;
    (async () => {
      for (let index = 0; index < TERMINAL_SCRIPT.length; index++) {
        const line = TERMINAL_SCRIPT[index];
        for (let i = 0; i <= line.length; i++) {
          if (cancelled) return;
          await new Promise(r => setTimeout(r, 26));
          setLines(prev => {
            const next = [...prev];
            next[index] = line.slice(0, i);
            return next;
          });
        }
        await new Promise(r => setTimeout(r, 350));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [is404]);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight });
  }, [lines]);

  // Код Konami: на любой странице ошибки — party-режим
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const accepted = KONAMI[konamiProgress.current];
      if (!accepted?.includes(event.key)) {
        konamiProgress.current = KONAMI[0].includes(event.key) ? 1 : 0;
        return;
      }
      konamiProgress.current += 1;
      if (konamiProgress.current === KONAMI.length) {
        konamiProgress.current = 0;
        fireConfetti(120);
        unlockAchievement("Konami-код! Ты легенда кампуса. 🎉");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fireConfetti, unlockAchievement]);

  const suggestions = useMemo(() => {
    const pool = [...catalogSections, ...serviceSections, overviewSection];
    const q = query.trim().toLowerCase();
    if (!q) return pool.slice(0, 4);
    return pool.filter(section => section.title.toLowerCase().includes(q)).slice(0, 4);
  }, [query]);

  const goHome = () => {
    window.location.hash = "overview";
  };

  const catchZero = () => {
    setZeroPosition({ x: 6 + Math.random() * 64, y: 8 + Math.random() * 52 });
    setCatches(count => {
      const next = count + 1;
      if (next === 1) unlockAchievement("Ноль-двойник пойман!");
      if (next === 5) unlockAchievement("Пять пойманных нулей — это уже талант!");
      if (next === 10) {
        unlockAchievement("10 из 10. Охота на нули закрыта. 🏆");
        fireConfetti();
      }
      return next;
    });
  };

  return (
    <section className={`errorScreen${is404 ? " is404" : " is500"}`}>
      {/* Декоративный фон */}
      <div className="errorBackdrop" aria-hidden="true">
        <span className="errorBlob blobA" />
        <span className="errorBlob blobB" />
        <div className="errorConstellation" />
      </div>

      {/* Конфетти */}
      {confetti.length > 0 && (
        <div className="confettiLayer" aria-hidden="true">
          {confetti.map(piece => (
            <span
              key={piece.id}
              className="confettiPiece"
              style={{
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.size * 0.6,
                background: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                "--drift": `${piece.drift}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Секретное достижение */}
      {achievement && (
        <output className="achievementPopup" role="status">
          <PartyPopper size={18} />
          <span>
            <strong>Достижение получено!</strong>
            {achievement}
          </span>
          <button type="button" className="achievementClose" aria-label="Закрыть" onClick={() => setAchievement(null)}>
            ×
          </button>
        </output>
      )}

      <div className="errorCard">
        <div className="errorDigits" aria-hidden="true">
          {code.split("").map((digit, index) =>
            digit === "0" ? (
              <span key={index} className="errorZero">
                <Image src="/logo-circle.svg" alt="" width={140} height={140} priority />
              </span>
            ) : (
              <span key={index} className={glitch ? "isGlitch" : ""}>{digit}</span>
            ),
          )}
        </div>

        {is404 && (
          <>
            {/* Убежавший «двойник» нуля — мини-игра */}
            <button
              type="button"
              className="errorZero gameTarget"
              style={{ left: `${zeroPosition.x}%`, top: `${zeroPosition.y}%` }}
              aria-label="Поймать убежавший ноль"
              title="Поймай меня, если сможешь"
              onClick={catchZero}
            >
              <Image src="/logo-circle.svg" alt="" width={72} height={72} />
              <span className="zeroPing" />
            </button>

            <div className="errorGameBar" aria-live="polite">
              <Gamepad2 size={14} />
              <span>Поймай ноль-двойник: {catches}</span>
              {catches >= 5 && <Sparkles size={14} />}
            </div>
          </>
        )}

        <span className="errorEyebrow">
          {is404 ? <Compass size={14} /> : <HardHat size={14} />}
          {subtitle}
        </span>
        <h1 className="errorTitle">{is404 ? "Кажется, вы свернули не туда" : "Что-то пошло не так"}</h1>
        <p className="errorText">
          {is404
            ? "Такого раздела в BIRGE нет — возможно, его ещё не создали или ссылка устарела."
            : "Мы уже разбираемся. Попробуйте повторить действие через минуту."}
        </p>

        {is404 ? (
          <div className="errorFinder">
            <label className="errorFinderLabel" htmlFor="error-finder">
              <Search size={15} />
              Что вы искали?
            </label>
            <input
              id="error-finder"
              className="errorFinderInput"
              type="text"
              placeholder="проекты, клубы, календарь…"
              value={query}
              onChange={event => setQuery(event.target.value)}
              autoComplete="off"
            />
            <div className="errorFinderHints">
              {suggestions.length > 0 ? (
                suggestions.map(section => (
                  <a key={section.id} className="errorHintChip" href={`#${section.id}`}>
                    {section.title}
                  </a>
                ))
              ) : (
                <span className="errorFinderEmpty">
                  <Lightbulb size={14} /> Ничего не нашли — но вы можете создать это сами!
                </span>
              )}
            </div>
          </div>
        ) : (
          <pre className="errorTerminal" ref={terminalRef} aria-hidden="true">
            {TERMINAL_SCRIPT.map((_, index) => (
              <code key={index}>{lines[index] ?? ""}{"\n"}</code>
            ))}
          </pre>
        )}

        <div className="errorActions">
          <button type="button" className="errorButton primary" onClick={goHome}>
            <Home size={16} /> На главную
          </button>
          {onRetry ? (
            <button type="button" className="errorButton" onClick={onRetry}>
              <RotateCcw size={16} /> Попробовать снова
            </button>
          ) : (
            <button type="button" className="errorButton" onClick={() => window.history.back()}>
              <ArrowLeft size={16} /> Назад
            </button>
          )}
          <a className="errorButton ghost" href="#help">
            <LifeBuoy size={16} /> Помощь
          </a>
        </div>

        <div className="errorTools">
          <Wrench size={13} />
          <span>
            {is404
              ? "Совет: проверьте адрес или воспользуйтесь меню выше"
              : "Совет: если ошибка повторяется — напишите нам в «Помощи»"}
          </span>
        </div>
      </div>
    </section>
  );
}

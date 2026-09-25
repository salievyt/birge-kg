"use client";

import { FormEvent } from "react";
import Image from "next/image";

import type { AuthenticationInput } from "@/lib/domain/types";

interface AuthScreenProps {
  mode: "login" | "register";
  csrfReady: boolean;
  busy: boolean;
  onSubmit(input: AuthenticationInput): void;
}

export function AuthScreen({ mode, csrfReady, busy, onSubmit }: AuthScreenProps) {
  const isRegister = mode === "register";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    onSubmit({
      username: String(values.username ?? ""),
      password: String(values.password ?? ""),
      ...(isRegister ? { first_name: String(values.first_name ?? "") } : {}),
      ...(isRegister ? { email: String(values.email ?? "") } : {}),
    });
  }

  return (
    <section className="authScreen">
      <Image className="authLogo" src="/logo.svg" alt="BIRGE — сообщество ОшТУ" width={260} height={210} priority />
      <h1>{isRegister ? "Присоединяйся к BIRGE" : "С возвращением"}</h1>
      <form onSubmit={submit} className="accountForm" aria-busy={busy}>
        {isRegister && <label>Имя<input name="first_name" autoComplete="given-name" required maxLength={150} /></label>}
        {isRegister && <label>Email<input name="email" type="email" autoComplete="email" required /></label>}
        <label>Логин<input name="username" autoComplete="username" required maxLength={150} /></label>
        <label>Пароль<input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : undefined} /></label>
        {isRegister && <small>Не менее 8 символов. Не используйте только цифры или распространённый пароль.</small>}
        <button className="primaryButton" disabled={busy || !csrfReady}>
          {busy ? "Подождите…" : isRegister ? "Создать аккаунт" : "Войти"}
        </button>
      </form>
      {!isRegister && <a className="authSwitch" href="#forgot-password">Забыли пароль?</a>}
      <a className="authSwitch" href={isRegister ? "#login" : "#register"}>
        {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
      </a>
    </section>
  );
}

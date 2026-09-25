"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { sessionApi } from "@/lib/infrastructure/api";

export function PasswordScreen({ csrf, confirm }: { csrf: string; confirm: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = new FormData(event.currentTarget);
    try {
      let result;
      if (confirm) {
        if (values.get("password") !== values.get("confirmation")) throw Error("Пароли не совпадают.");
        const params = new URLSearchParams(window.location.hash.split("?")[1]);
        result = await sessionApi.confirmPassword({ uid: params.get("uid") || "", token: params.get("token") || "", password: String(values.get("password")) }, csrf);
      } else result = await sessionApi.resetPassword(String(values.get("email")), csrf);
      setMessage(result.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось отправить запрос."); }
    finally { setBusy(false); }
  }
  return <section className="authScreen"><Image className="authLogo" src="/logo.svg" width={260} height={210} alt="BIRGE" /><h1>{confirm ? "Новый пароль" : "Восстановление доступа"}</h1>{error && <p role="alert">{error}</p>}{message ? <p role="status">{message}</p> : <form className="accountForm" onSubmit={submit}>{confirm ? <><label>Новый пароль<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><label>Повторите пароль<input name="confirmation" type="password" required autoComplete="new-password" /></label></> : <label>Email<input name="email" type="email" required autoComplete="email" /></label>}<button className="primaryButton" disabled={busy || !csrf}>{busy ? "Подождите…" : confirm ? "Сохранить пароль" : "Отправить ссылку"}</button></form>}<a className="authSwitch" href="#login">Вернуться ко входу</a></section>;
}

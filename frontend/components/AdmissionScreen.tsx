"use client";

import { FormEvent, useState } from "react";
import { PartyPopper } from "lucide-react";

import type { AdmissionDto } from "@/lib/domain/types";

interface AdmissionScreenProps {
  busy: boolean;
  canModerate: boolean;
  moderated?: AdmissionDto[];
  onDecide(id: number, action: "approve" | "reject"): void;
  onSubmit(data: { full_name: string; email: string; faculty: string; motivation: string }): Promise<boolean>;
}

export function AdmissionScreen({ busy, canModerate, moderated, onDecide, onSubmit }: AdmissionScreenProps) {
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    void onSubmit({
      full_name: String(data.full_name ?? ""),
      email: String(data.email ?? ""),
      faculty: String(data.faculty ?? ""),
      motivation: String(data.motivation ?? ""),
    }).then(ok => {
      if (ok) {
        setSent(true);
        form.reset();
      }
    });
  }

  if (sent) {
    return (
      <section className="screen admissionDone">
        <PartyPopper size={56} aria-hidden />
        <h1>Заявка отправлена!</h1>
        <p>Мы рассмотрим её в ближайшее время и свяжемся с вами по email.</p>
        <a className="actionButton" href="#overview">Вернуться в обзор</a>
      </section>
    );
  }

  return (
    <section className="screen">
      <div className="blockHeader"><div><p className="eyebrow">ВСТУПЛЕНИЕ</p><h1>Присоединиться к BIRGE</h1></div></div>
      <p>Если вы ещё не зарегистрированы в системе, оставьте заявку — администрация добавит вас в сообщество.</p>

      <form className="accountForm admissionForm" onSubmit={submit} aria-busy={busy}>
        <label>Имя и фамилия<input name="full_name" required maxLength={160} autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
        <label>Факультет<input name="faculty" required maxLength={120} list="faculties-list" /></label>
        <datalist id="faculties-list">
          <option value="ФИТ" /><option value="Экономика" /><option value="Энергетика" />
        </datalist>
        <label>Зачем вам BIRGE?<textarea name="motivation" placeholder="Расскажите о своих интересах и целях" /></label>
        <button className="primaryButton" disabled={busy}>{busy ? "Отправка…" : "Отправить заявку"}</button>
      </form>

      {canModerate && (
        <section className="feedGroup">
          <h2>Заявки на рассмотрении ({moderated?.length ?? 0})</h2>
          {!moderated?.length ? <p className="emptyState">Новых заявок нет.</p> : (
            <ul className="noticeList">
              {moderated.map(admission => (
                <li className="notice" key={admission.id}>
                  <div className="noticeBody">
                    <strong>{admission.full_name}</strong>
                    <p>{admission.faculty} · {admission.email}</p>
                    {admission.motivation && <p>{admission.motivation}</p>}
                  </div>
                  <div className="formRow">
                    <button className="primaryButton" onClick={() => onDecide(admission.id, "approve")}>Одобрить</button>
                    <button className="secondaryButton" onClick={() => onDecide(admission.id, "reject")}>Отклонить</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}

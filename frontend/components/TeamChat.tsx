"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { ApiError, appApi } from "@/lib/infrastructure/api";
import { fmtDateTime, userName } from "@/lib/domain/format";
import type { ProjectMessageDto } from "@/lib/domain/types";

export function TeamChat({projectId, userId, csrf, onRead}: {projectId: number; userId: number; csrf: string; onRead(): void}) {
  const [messages, setMessages] = useState<ProjectMessageDto[]>([]);
  const [text, setText] = useState("");
  const [before, setBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [older, setOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [revision, setRevision] = useState(0);
  const latest = useRef(0);
  const lastRead = useRef(0);
  const sendLock = useRef(false);
  const prependHeight = useRef<number | null>(null);
  const retry = useRef<{text: string; id: string} | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;

  function merge(rows: ProjectMessageDto[]) {
    setMessages(previous => Array.from(new Map([...previous, ...rows].map(row => [row.id, row])).values()).sort((a,b) => a.id-b.id));
  }
  function failure(error: unknown, sendingFailure = false) {
    if (error instanceof ApiError && [401,403,404].includes(error.status ?? 0)) {
      setBlocked(true); setMessages([]);
    }
    const message = error instanceof Error ? error.message : "Не удалось обновить чат.";
    if (sendingFailure) setSendError(message);
    else setError(message);
  }
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let stop = false;
    let initialized = false;
    latest.current = 0; lastRead.current = 0; setLoading(true); setBlocked(false); setMessages([]); setError("");
    async function refresh() {
      let delay = 5000;
      try {
        if (!initialized || document.visibilityState === "visible") {
          const page = await appApi.chat(projectId, initialized ? {after: latest.current} : {}, controller.signal);
          if (controller.signal.aborted) return;
          merge(page.results);
          if (!initialized) setBefore(page.next_before);
          initialized = true;
          if (page.next_after) delay = 100;
          const last = page.results.at(-1)?.id;
          if (last) latest.current = Math.max(latest.current, last);
          if (latest.current > lastRead.current && pinned.current && document.visibilityState === "visible") {
            await appApi.readChat(projectId, csrf, latest.current, controller.signal);
            lastRead.current = latest.current;
            onReadRef.current();
          }
          setError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          failure(error);
          stop = error instanceof ApiError && [401,403,404].includes(error.status ?? 0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          if (!stop) timer = setTimeout(() => void refresh(), delay);
        }
      }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [projectId, csrf, revision]);

  useEffect(() => {
    if (!list.current) return;
    if (prependHeight.current !== null) {
      list.current.scrollTop += list.current.scrollHeight - prependHeight.current;
      prependHeight.current = null;
    } else if (pinned.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    if (!before || older) return;
    setOlder(true);
    try {
      const page = await appApi.chat(projectId, {before});
      prependHeight.current = list.current?.scrollHeight ?? null;
      pinned.current = false; merge(page.results); setBefore(page.next_before); setError("");
    } catch (error) { failure(error); }
    finally { setOlder(false); }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (!value || sendLock.current || blocked) return;
    sendLock.current = true;
    if (retry.current?.text !== value) retry.current = {text: value, id: crypto.randomUUID()};
    setSending(true); setSendError("");
    try {
      const message = await appApi.sendMessage(projectId, csrf, value, retry.current.id);
      pinned.current = true; merge([message]); setText(""); retry.current = null;
    } catch (error) { failure(error, true); }
    finally { sendLock.current = false; setSending(false); }
  }
  return <section className="teamChat" aria-label="Чат команды">
    {error && <div role="alert"><p>{error}</p><button className="secondaryButton" onClick={() => setRevision(value => value+1)}><RefreshCw size={16} />Повторить</button></div>}
    {sendError && <p role="alert">{sendError}</p>}
    {!blocked && <>
      {before && <button className="secondaryButton" disabled={older} onClick={() => void loadOlder()}>{older ? "Загрузка…" : "Более ранние сообщения"}</button>}
      <ol ref={list} className="chatMessages" aria-label="Сообщения команды" onScroll={event => {const el=event.currentTarget; pinned.current = el.scrollHeight-el.scrollTop-el.clientHeight < 60;}}>
        {messages.map(message => <li key={message.id} className={message.sender.id === userId ? "chatMessage ownMessage" : "chatMessage"}><div><strong>{userName(message.sender)}</strong><time dateTime={message.created_at}>{fmtDateTime(message.created_at)}</time></div><p>{message.text}</p></li>)}
      </ol>
      {loading ? <p role="status">Загрузка чата…</p> : !messages.length && <p className="emptyState">В команде пока нет сообщений.</p>}
      <form className="chatComposer" onSubmit={send}><label>Сообщение команде<textarea value={text} maxLength={4000} required disabled={sending} onChange={event => setText(event.target.value)} /></label><button className="primaryButton" disabled={sending || loading || !text.trim()}><Send size={18} />{sending ? "Отправка…" : "Отправить"}</button></form>
    </>}
  </section>;
}

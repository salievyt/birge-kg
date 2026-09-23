"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void error;
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f1413", color: "#e9ecea" }}>
        <div style={{ minHeight: "100svh", display: "grid", placeContent: "center", justifyItems: "center", gap: 18, textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", color: "#e06c5c" }}>500</div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Что-то совсем сломалось</h1>
          <p style={{ margin: 0, maxWidth: 460, opacity: 0.75, fontSize: 15 }}>
            Произошла критическая ошибка — даже интерфейс не смог отрисоваться. Попробуйте перезагрузить страницу.
          </p>
          <button
            onClick={reset}
            style={{ border: 0, borderRadius: 24, background: "#3ea6ff", color: "#fff", padding: "12px 22px", font: "inherit", cursor: "pointer" }}
          >
            Перезагрузить
          </button>
        </div>
      </body>
    </html>
  );
}

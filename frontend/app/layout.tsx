import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BIRGE",
  description: "Платформа для проектов, клубов, идей и мероприятий ОшТУ"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("birge-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();',
          }}
        />
        {children}
      </body>
    </html>
  );
}

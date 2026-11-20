import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../app/globals.css";

export const metadata: Metadata = {
  title: "Atelier Copies | Копии картин",
  description: "Каталог музейных и интерьерных копий картин.",
};

export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <footer className="site-footer">
          <div>
            <strong>Atelier Copies</strong>
            <p>Музейные и интерьерные копии картин.</p>
          </div>
          <nav aria-label="Навигация в подвале">
            <a href="#catalog">Каталог</a>
            <a href="#support">Частые вопросы</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}

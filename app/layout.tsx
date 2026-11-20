import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier Copies - копии картин",
  description:
    "Интернет-магазин музейных и интерьерных копий картин ручной работы.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <footer className="site-footer">
          <div>
            <strong>Atelier Copies</strong>
            <p>
              Мы обрабатываем имя, email, телефон, адрес доставки, сообщения, отзывы и данные
              заказов только для работы магазина, поддержки покупателей и безопасности аккаунтов.
            </p>
          </div>
          <nav aria-label="Правовая информация">
            <a href="/privacy">Политика конфиденциальности</a>
            <a href="/#support">Поддержка</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}

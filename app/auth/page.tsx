import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { AuthForm } from "./auth-form";

export const dynamic = "force-dynamic";

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  return value;
}

const noticeMessages: Record<string, string> = {
  "database-unavailable": "База данных сейчас недоступна. Попробуйте позже.",
  "email-verification-invalid":
    "Ссылка подтверждения недействительна. Зарегистрируйтесь еще раз, и мы отправим новую ссылку.",
  "email-verification-expired":
    "Ссылка подтверждения устарела. Зарегистрируйтесь еще раз, и мы отправим новую ссылку.",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const user = await getCurrentUser();
  const { next, notice } = await searchParams;
  const nextPath = safeNextPath(next);

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="eyebrow">Аккаунт</p>
          <h1>Вход и регистрация</h1>
          <p>
            После регистрации мы отправим письмо для подтверждения email. Первый
            подтвержденный пользователь станет администратором, остальные пользователи будут
            покупателями.
          </p>
        </div>
        <AuthForm nextPath={nextPath} initialMessage={notice ? noticeMessages[notice] || "" : ""} />
      </section>
    </main>
  );
}

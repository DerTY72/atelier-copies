import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="eyebrow">Аккаунт</p>
          <h1>Новый пароль</h1>
          <p>Задайте новый пароль для аккаунта. Ссылка восстановления действует 1 час.</p>
        </div>
        <div className="auth-card">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="auth-form">
              <p className="form-message">Ссылка восстановления недействительна.</p>
              <Link className="button dark" href="/auth/forgot-password">
                Запросить новую ссылку
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

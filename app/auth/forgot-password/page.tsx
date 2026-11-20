import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="eyebrow">Аккаунт</p>
          <h1>Восстановление пароля</h1>
          <p>Укажите email аккаунта, и мы отправим ссылку для создания нового пароля.</p>
        </div>
        <div className="auth-card">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}

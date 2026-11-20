"use client";

import { FormEvent, useState } from "react";
import { PasswordField } from "../../components/password-field";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");

    if (password !== passwordConfirm) {
      setMessage("Пароли не совпадают.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось обновить пароль.");
      }

      form.reset();
      setIsDone(true);
      setMessage(result.message || "Пароль обновлен. Теперь можно войти.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить пароль.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <PasswordField
        label="Новый пароль"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
        disabled={isDone}
      />

      <PasswordField
        label="Повторите пароль"
        name="passwordConfirm"
        autoComplete="new-password"
        minLength={8}
        required
        disabled={isDone}
      />

      <button className="button dark" type="submit" disabled={isSubmitting || isDone}>
        {isSubmitting ? "Сохраняем..." : "Сохранить пароль"}
      </button>

      {isDone ? (
        <a className="auth-secondary-link" href="/auth">
          Войти с новым паролем
        </a>
      ) : null}

      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.get("email"),
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось отправить письмо.");
      }

      form.reset();
      setMessage(
        result.message ||
          "Если аккаунт с таким email существует, мы отправили письмо со ссылкой восстановления пароля.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось отправить письмо.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>

      <button className="button dark" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Отправляем..." : "Отправить ссылку"}
      </button>

      <a className="auth-secondary-link" href="/auth">
        Вернуться ко входу
      </a>

      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}

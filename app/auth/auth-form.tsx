"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PasswordField } from "../components/password-field";

type Mode = "login" | "register";

type AuthFormProps = {
  nextPath: string;
  initialMessage?: string;
};

type AuthResponse = {
  message?: string;
  requiresEmailVerification?: boolean;
};

async function readAuthResponse(response: Response): Promise<AuthResponse> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as AuthResponse;
  }

  const text = await response.text();

  return {
    message: text || "Сервер вернул пустой ответ. Попробуйте ещё раз.",
  };
}

export function AuthForm({ nextPath, initialMessage = "" }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
          nextPath: mode === "register" ? "/" : nextPath,
        }),
      });

      const result = await readAuthResponse(response);

      if (!response.ok) {
        throw new Error(result.message || "Не удалось выполнить действие.");
      }

      if (mode === "register" && result.requiresEmailVerification) {
        form.reset();
        setMode("login");
        setMessage(
          result.message ||
            "Мы отправили письмо для подтверждения email. Проверьте почту и перейдите по ссылке.",
        );
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить действие.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-tabs" role="tablist" aria-label="Режим авторизации">
        <button
          className={mode === "login" ? "is-active" : ""}
          type="button"
          onClick={() => {
            setMode("login");
            setMessage("");
          }}
        >
          Вход
        </button>
        <button
          className={mode === "register" ? "is-active" : ""}
          type="button"
          onClick={() => {
            setMode("register");
            setMessage("");
          }}
        >
          Регистрация
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label>
            Имя
            <input type="text" name="name" autoComplete="name" required />
          </label>
        ) : null}

        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>

        <PasswordField
          label="Пароль"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
        />

        <button className="button dark" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        {mode === "login" ? (
          <a className="auth-secondary-link" href="/auth/forgot-password">
            Забыли пароль?
          </a>
        ) : null}

        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </div>
  );
}

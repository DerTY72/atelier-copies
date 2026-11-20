"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "../components/password-field";

type AccountSettingsFormProps = {
  initialName: string;
  email: string;
};

export function AccountSettingsForm({ initialName, email }: AccountSettingsFormProps) {
  const router = useRouter();
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.get("name"),
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось обновить профиль.");
      }

      setProfileMessage(result.message || "Профиль обновлен.");
      router.refresh();
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Не удалось обновить профиль.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingPassword(true);
    setPasswordMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") || "");
    const newPasswordConfirm = String(data.get("newPasswordConfirm") || "");

    if (newPassword !== newPasswordConfirm) {
      setPasswordMessage("Новые пароли не совпадают.");
      setIsSavingPassword(false);
      return;
    }

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось обновить пароль.");
      }

      form.reset();
      setPasswordMessage(result.message || "Пароль обновлен.");
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Не удалось обновить пароль.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="account-settings-grid">
      <form className="auth-form" onSubmit={handleProfileSubmit}>
        <div>
          <h3>Профиль</h3>
          <p className="muted">Email: {email}</p>
        </div>

        <label>
          Имя
          <input type="text" name="name" autoComplete="name" defaultValue={initialName} required />
        </label>

        <button className="button dark" type="submit" disabled={isSavingProfile}>
          {isSavingProfile ? "Сохраняем..." : "Сохранить имя"}
        </button>

        {profileMessage ? <p className="form-message">{profileMessage}</p> : null}
      </form>

      <form className="auth-form" onSubmit={handlePasswordSubmit}>
        <div>
          <h3>Пароль</h3>
          <p className="muted">Для смены пароля нужно знать текущий пароль.</p>
        </div>

        <PasswordField
          label="Текущий пароль"
          name="currentPassword"
          autoComplete="current-password"
          required
        />

        <PasswordField
          label="Новый пароль"
          name="newPassword"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <PasswordField
          label="Повторите новый пароль"
          name="newPasswordConfirm"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <button className="button dark" type="submit" disabled={isSavingPassword}>
          {isSavingPassword ? "Сохраняем..." : "Сменить пароль"}
        </button>

        {passwordMessage ? <p className="form-message">{passwordMessage}</p> : null}
      </form>
    </div>
  );
}

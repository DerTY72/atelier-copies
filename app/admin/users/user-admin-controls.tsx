"use client";

import { useState } from "react";

type UserRole = "ADMIN" | "CUSTOMER";

type UserAdminControlsProps = {
  userId: string;
  currentUserId: string;
  initialRole: UserRole;
  initialIsBlocked: boolean;
  emailVerified: boolean;
};

export function UserAdminControls({
  userId,
  currentUserId,
  initialRole,
  initialIsBlocked,
  emailVerified,
}: UserAdminControlsProps) {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [savedRole, setSavedRole] = useState<UserRole>(initialRole);
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isSelf = userId === currentUserId;

  const updateUser = async (payload: { role?: UserRole; isBlocked?: boolean }) => {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        message?: string;
        user?: {
          role: UserRole;
          isBlocked: boolean;
        };
      };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось обновить пользователя.");
      }

      if (result.user) {
        setRole(result.user.role);
        setSavedRole(result.user.role);
        setIsBlocked(result.user.isBlocked);
      }

      setMessage(result.message || "Пользователь обновлен.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить пользователя.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="user-admin-controls">
      <label>
        Роль
        <select
          value={role}
          disabled={isSaving || isSelf || !emailVerified || isBlocked}
          onChange={(event) => setRole(event.target.value as UserRole)}
        >
          <option value="CUSTOMER">Покупатель</option>
          <option value="ADMIN">Администратор</option>
        </select>
      </label>

      <button
        className="button light"
        type="button"
        disabled={isSaving || role === savedRole || isSelf || !emailVerified || isBlocked}
        onClick={() => updateUser({ role })}
      >
        Сохранить роль
      </button>

      <button
        className={isBlocked ? "button light" : "button dark"}
        type="button"
        disabled={isSaving || isSelf}
        onClick={() => updateUser({ isBlocked: !isBlocked })}
      >
        {isBlocked ? "Разблокировать" : "Заблокировать"}
      </button>

      {message ? <p className="form-message">{message}</p> : null}
    </div>
  );
}

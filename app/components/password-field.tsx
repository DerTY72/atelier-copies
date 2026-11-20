"use client";

import { Eye, EyeOff } from "lucide-react";
import { InputHTMLAttributes, useId, useState } from "react";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function PasswordField({ label, id, ...inputProps }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="password-field" htmlFor={inputId}>
      <span>{label}</span>
      <span className="password-control">
        <input {...inputProps} id={inputId} type={isVisible ? "text" : "password"} />
        <button
          className="password-toggle"
          type="button"
          aria-label={isVisible ? "Скрыть пароль" : "Показать пароль"}
          aria-pressed={isVisible}
          title={isVisible ? "Скрыть пароль" : "Показать пароль"}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}

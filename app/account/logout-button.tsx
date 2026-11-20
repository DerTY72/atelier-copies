"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    setIsSubmitting(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <button className="button light" type="button" onClick={handleLogout} disabled={isSubmitting}>
      {isSubmitting ? "Выходим..." : "Выйти"}
    </button>
  );
}

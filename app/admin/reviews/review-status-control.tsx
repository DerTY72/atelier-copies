"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const reviewStatuses = [
  { value: "PENDING", label: "На модерации" },
  { value: "APPROVED", label: "Одобрен" },
  { value: "REJECTED", label: "Отклонен" },
];

type ReviewStatusControlProps = {
  reviewId: string;
  status: string;
};

export function ReviewStatusControl({ reviewId, status }: ReviewStatusControlProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = selectedStatus !== status;

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: selectedStatus }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось обновить статус.");
      }

      setMessage("Сохранено");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить статус.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="status-control">
      <select
        aria-label="Статус отзыва"
        value={selectedStatus}
        onChange={(event) => setSelectedStatus(event.target.value)}
      >
        {reviewStatuses.map((statusOption) => (
          <option key={statusOption.value} value={statusOption.value}>
            {statusOption.label}
          </option>
        ))}
      </select>
      <button
        className="button compact"
        type="button"
        disabled={!hasChanges || isSaving}
        onClick={handleSave}
      >
        {isSaving ? "..." : "OK"}
      </button>
      {message ? <small className="status-message">{message}</small> : null}
    </div>
  );
}

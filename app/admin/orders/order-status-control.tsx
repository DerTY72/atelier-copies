"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const orderStatuses = [
  { value: "DRAFT", label: "Черновик" },
  { value: "PENDING_PAYMENT", label: "Ожидает оплаты" },
  { value: "PAID", label: "Оплачен" },
  { value: "FULFILLED", label: "Выполнен" },
  { value: "CANCELLED", label: "Отменен" },
];

type OrderStatusControlProps = {
  orderId: string;
  status: string;
};

export function OrderStatusControl({ orderId, status }: OrderStatusControlProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = selectedStatus !== status;

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
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
        aria-label="Статус заказа"
        value={selectedStatus}
        onChange={(event) => setSelectedStatus(event.target.value)}
      >
        {orderStatuses.map((statusOption) => (
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

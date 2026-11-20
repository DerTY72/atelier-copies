"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PaymentSnapshot = {
  id: string;
  status: string;
};

type TestPaymentPanelProps = {
  orderId: string;
  initialPayment: PaymentSnapshot | null;
};

export function TestPaymentPanel({ orderId, initialPayment }: TestPaymentPanelProps) {
  const router = useRouter();
  const [payment, setPayment] = useState(initialPayment);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPayment = async () => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST",
      });
      const result = (await response.json()) as { payment?: PaymentSnapshot; message?: string };

      if (!response.ok || !result.payment) {
        throw new Error(result.message || "Не удалось создать платеж.");
      }

      setPayment(result.payment);
      setMessage("Платёжная запись создана.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось создать платеж.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completePayment = async (status: "SUCCEEDED" | "FAILED") => {
    if (!payment) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/orders/${orderId}/payments/${payment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          failureReason: status === "FAILED" ? "Платёж отклонён покупателем." : undefined,
        }),
      });
      const result = (await response.json()) as { payment?: PaymentSnapshot; message?: string };

      if (!response.ok || !result.payment) {
        throw new Error(result.message || "Не удалось завершить платеж.");
      }

      setPayment(result.payment);
      setMessage("Статус платежа обновлён.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось завершить платеж.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCompletePayment = payment?.status === "PENDING";

  return (
    <div className="test-payment-flow">
      {!payment ? (
        <button className="button primary" type="button" disabled={isSubmitting} onClick={createPayment}>
          {isSubmitting ? "Создаём..." : "Создать платёжную запись"}
        </button>
      ) : null}

      {canCompletePayment ? (
        <div className="payment-choice-grid">
          <button
            className="button primary"
            type="button"
            disabled={isSubmitting}
            onClick={() => completePayment("SUCCEEDED")}
          >
            Отметить как оплаченный
          </button>
          <button
            className="button light"
            type="button"
            disabled={isSubmitting}
            onClick={() => completePayment("FAILED")}
          >
            Отметить как отклонённый
          </button>
        </div>
      ) : null}

      {payment && !canCompletePayment ? (
        <p className="muted">Текущий статус платежа: {payment.status}</p>
      ) : null}

      {message ? <p className="form-message">{message}</p> : null}
    </div>
  );
}

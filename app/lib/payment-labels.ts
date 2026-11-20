export const paymentProviderLabels: Record<string, string> = {
  TEST: "Внутренний учёт",
  YOOKASSA: "ЮKassa",
};

export function paymentFailureLabel(reason: string | null) {
  return reason === "Тестовая оплата отклонена покупателем."
    ? "Платёж отклонён покупателем."
    : reason;
}

import { NextResponse } from "next/server";
import type { DeliveryMethod } from "@prisma/client";
import { getCurrentUser } from "../../lib/auth";
import { notifyOrderCreated } from "../../lib/notifications";
import { getPrisma } from "../../lib/prisma";

export const runtime = "nodejs";

type OrderItemInput = {
  productId: unknown;
  quantity: unknown;
};

type CreateOrderPayload = {
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  deliveryMethod?: unknown;
  deliveryAddress?: unknown;
  customerComment?: unknown;
  items?: unknown;
};

const allowedDeliveryMethods = new Set<DeliveryMethod>([
  "COURIER",
  "PICKUP",
  "TRANSPORT_COMPANY",
]);

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function normalizeDeliveryMethod(value: unknown): DeliveryMethod {
  return typeof value === "string" && allowedDeliveryMethods.has(value as DeliveryMethod)
    ? (value as DeliveryMethod)
    : "COURIER";
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item: OrderItemInput) => ({
      productId: typeof item.productId === "string" ? item.productId : "",
      quantity: typeof item.quantity === "number" ? Math.floor(item.quantity) : 0,
    }))
    .filter((item) => item.productId && item.quantity > 0 && item.quantity <= 99);
}

export async function POST(request: Request) {
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json(
      { message: "База данных пока не настроена." },
      { status: 503 },
    );
  }

  const [payload, currentUser] = await Promise.all([
    request.json() as Promise<CreateOrderPayload>,
    getCurrentUser(),
  ]);
  const customerName = String(payload.customerName || currentUser?.name || "").trim();
  const customerEmail = String(payload.customerEmail || currentUser?.email || "")
    .trim()
    .toLowerCase();
  const customerPhone = String(payload.customerPhone || "").trim();
  const deliveryMethod = normalizeDeliveryMethod(payload.deliveryMethod);
  const deliveryAddress = String(payload.deliveryAddress || "").trim();
  const customerComment = String(payload.customerComment || "").trim();
  const items = normalizeItems(payload.items);

  if (!customerName) {
    return NextResponse.json({ message: "Укажите имя для заказа." }, { status: 400 });
  }

  if (!isValidEmail(customerEmail)) {
    return NextResponse.json({ message: "Укажите корректный email." }, { status: 400 });
  }

  if (!isValidPhone(customerPhone)) {
    return NextResponse.json({ message: "Укажите телефон для связи." }, { status: 400 });
  }

  if (deliveryMethod !== "PICKUP" && deliveryAddress.length < 5) {
    return NextResponse.json({ message: "Укажите адрес доставки." }, { status: 400 });
  }

  if (deliveryAddress.length > 500) {
    return NextResponse.json({ message: "Адрес должен быть не длиннее 500 символов." }, { status: 400 });
  }

  if (customerComment.length > 1000) {
    return NextResponse.json({ message: "Комментарий должен быть не длиннее 1000 символов." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ message: "Корзина пуста." }, { status: 400 });
  }

  const quantities = new Map(items.map((item) => [item.productId, item.quantity]));
  const products = await prisma.product.findMany({
    where: {
      id: { in: items.map((item) => item.productId) },
      isActive: true,
    },
  });

  if (products.length !== quantities.size) {
    return NextResponse.json(
      { message: "Один из товаров больше недоступен." },
      { status: 400 },
    );
  }

  const total = products.reduce((sum, product) => {
    return sum + product.price * (quantities.get(product.id) || 0);
  }, 0);

  const order = await prisma.order.create({
    data: {
      userId: currentUser?.id,
      customerName,
      customerEmail,
      customerPhone,
      deliveryMethod,
      deliveryAddress: deliveryMethod === "PICKUP" ? null : deliveryAddress,
      customerComment: customerComment || null,
      status: "PENDING_PAYMENT",
      total,
      items: {
        create: products.map((product) => ({
          productId: product.id,
          titleSnapshot: product.title,
          priceSnapshot: product.price,
          quantity: quantities.get(product.id) || 0,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  await notifyOrderCreated(order).catch((error) => {
    console.error("Failed to send order notifications", error);
  });

  return NextResponse.json(
    {
      id: order.id,
      total: order.total,
      status: order.status,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    },
    { status: 201 },
  );
}

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import { getPrisma } from "../../lib/prisma";

export const runtime = "nodejs";

type CreateReviewPayload = {
  productId?: unknown;
  rating?: unknown;
  text?: unknown;
};

type ParsedReviewPayload = {
  productId: string;
  rating: number | null;
  text: string;
  attachment: File | null;
};

const maxImageSize = 8 * 1024 * 1024;
const maxVideoSize = 50 * 1024 * 1024;

const allowedAttachmentTypes: ReadonlyMap<
  string,
  { extension: string; reviewType: "PHOTO" | "VIDEO"; maxSize: number }
> = new Map([
  ["image/jpeg", { extension: "jpg", reviewType: "PHOTO", maxSize: maxImageSize }],
  ["image/png", { extension: "png", reviewType: "PHOTO", maxSize: maxImageSize }],
  ["image/webp", { extension: "webp", reviewType: "PHOTO", maxSize: maxImageSize }],
  ["image/gif", { extension: "gif", reviewType: "PHOTO", maxSize: maxImageSize }],
  ["video/mp4", { extension: "mp4", reviewType: "VIDEO", maxSize: maxVideoSize }],
  ["video/webm", { extension: "webm", reviewType: "VIDEO", maxSize: maxVideoSize }],
  ["video/quicktime", { extension: "mov", reviewType: "VIDEO", maxSize: maxVideoSize }],
]);

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseRating(value: unknown) {
  if (typeof value === "number") {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    return Math.floor(Number(value));
  }

  return null;
}

async function parseReviewPayload(request: Request): Promise<ParsedReviewPayload | NextResponse> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ message: "Некорректная форма отзыва." }, { status: 400 });
    }

    const attachment = formData.get("attachment");

    return {
      productId: readString(formData.get("productId")),
      rating: parseRating(readString(formData.get("rating"))),
      text: readString(formData.get("text")),
      attachment: attachment instanceof File && attachment.size > 0 ? attachment : null,
    };
  }

  let payload: CreateReviewPayload;

  try {
    payload = (await request.json()) as CreateReviewPayload;
  } catch {
    return NextResponse.json({ message: "Некорректный отзыв." }, { status: 400 });
  }

  return {
    productId: typeof payload.productId === "string" ? payload.productId : "",
    rating: parseRating(payload.rating),
    text: typeof payload.text === "string" ? payload.text.trim() : "",
    attachment: null,
  };
}

async function saveAttachment(file: File) {
  const attachmentSettings = allowedAttachmentTypes.get(file.type);

  if (!attachmentSettings) {
    return {
      error: NextResponse.json(
        { message: "Поддерживаются фото JPG, PNG, WebP, GIF и видео MP4, WebM, MOV." },
        { status: 400 },
      ),
    };
  }

  if (file.size > attachmentSettings.maxSize) {
    const maxSizeMb = Math.floor(attachmentSettings.maxSize / 1024 / 1024);

    return {
      error: NextResponse.json(
        { message: `Файл должен быть не больше ${maxSizeMb} МБ.` },
        { status: 400 },
      ),
    };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "reviews");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}.${attachmentSettings.extension}`;
  const filepath = path.join(uploadDir, filename);
  const attachmentUrl = `/uploads/reviews/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filepath, buffer);

  return {
    attachmentUrl,
    reviewType: attachmentSettings.reviewType,
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const prisma = getPrisma();

  if (!user) {
    return NextResponse.json({ message: "Чтобы оставить отзыв, войдите в аккаунт." }, { status: 401 });
  }

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const parsedPayload = await parseReviewPayload(request);

  if (parsedPayload instanceof NextResponse) {
    return parsedPayload;
  }

  const { productId, rating, text, attachment } = parsedPayload;

  if (!productId) {
    return NextResponse.json({ message: "Товар не найден." }, { status: 400 });
  }

  if (text.length < 10 || text.length > 1000) {
    return NextResponse.json(
      { message: "Отзыв должен быть от 10 до 1000 символов." },
      { status: 400 },
    );
  }

  if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
    return NextResponse.json({ message: "Оценка должна быть от 1 до 5." }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!product) {
    return NextResponse.json({ message: "Товар не найден." }, { status: 404 });
  }

  let reviewType: "TEXT" | "PHOTO" | "VIDEO" = "TEXT";
  let attachmentUrl: string | null = null;

  if (attachment) {
    const savedAttachment = await saveAttachment(attachment);

    if (savedAttachment.error) {
      return savedAttachment.error;
    }

    reviewType = savedAttachment.reviewType;
    attachmentUrl = savedAttachment.attachmentUrl;
  }

  const review = await prisma.review.create({
    data: {
      productId,
      userId: user.id,
      authorName: user.name || user.email,
      rating,
      type: reviewType,
      text,
      videoUrl: attachmentUrl,
      status: "PENDING",
    },
    select: {
      id: true,
      status: true,
      type: true,
      videoUrl: true,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}

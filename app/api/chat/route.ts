import { NextResponse } from "next/server";
import { getCatalogProducts } from "../../lib/catalog";
import type { Product, ProductStyle } from "../../products";

type ChatPayload = {
  message?: unknown;
};

type ChatProduct = {
  id: string;
  title: string;
  artist: string;
  price: number;
  size: string;
  styleLabel: string;
  image: string;
};

type ChatAnswer = {
  reply: string;
  suggestions: string[];
  products?: ChatProduct[];
};

type FaqTopic = {
  keywords: string[];
  reply: string;
  suggestions: string[];
};

export const runtime = "nodejs";

const faqTopics: FaqTopic[] = [
  {
    keywords: ["достав", "курьер", "самовывоз", "транспорт", "тк", "привез", "город"],
    reply:
      "Доставка зависит от города и формата картины. При оформлении можно выбрать курьера, самовывоз или транспортную компанию.",
    suggestions: ["Как оплатить заказ?", "Какие сроки изготовления?", "Написать в поддержку"],
  },
  {
    keywords: ["оплат", "касс", "карта", "чек", "платеж", "юкас", "yookassa"],
    reply:
      "Онлайн-оплата недоступна. По вопросам оплаты можно обратиться в поддержку.",
    suggestions: ["Как оформить заказ?", "Статус заказа", "Написать в поддержку"],
  },
  {
    keywords: ["срок", "изготов", "когда", "долго", "готов", "производ"],
    reply:
      "Типовой процесс такой: выбор картины, подтверждение деталей, оплата, работа художника и доставка. Точный срок зависит от размера, сложности и оформления. Для нестандартного заказа лучше написать в поддержку.",
    suggestions: ["Подобрать картину", "Доставка", "Написать в поддержку"],
  },
  {
    keywords: ["размер", "рама", "холст", "оформ", "формат", "материал", "интерьер"],
    reply:
      "В карточке товара указан размер и стиль. Если нужен другой формат, рама или адаптация под интерьер, отправьте вопрос в поддержку: менеджер уточнит детали и передаст пожелания художнику.",
    suggestions: ["Подобрать картину", "Показать модерн", "Написать в поддержку"],
  },
  {
    keywords: ["цен", "стоим", "сколько", "бюджет", "дешев", "дорог"],
    reply:
      "Цена зависит от размера, стиля и сложности работы. Могу подобрать картины из каталога по бюджету: например, напишите «покажи картины до 50000».",
    suggestions: ["Покажи картины до 50000", "Покажи картины до 90000", "Показать модерн"],
  },
  {
    keywords: ["статус", "заказ", "кабинет", "личн", "аккаунт", "войти"],
    reply:
      "После оформления заказа его можно открыть на странице заказа или в личном кабинете. Если заказ привязан к аккаунту, войдите на сайт и перейдите в кабинет.",
    suggestions: ["Как оплатить заказ?", "Восстановить пароль", "Написать в поддержку"],
  },
  {
    keywords: ["возврат", "вернуть", "гарант", "претенз", "обмен"],
    reply:
      "По вопросам возврата и гарантий обратитесь в поддержку и укажите номер заказа.",
    suggestions: ["Написать в поддержку", "Доставка", "Оплата"],
  },
  {
    keywords: ["отзыв", "коммент", "фото", "видео", "модерац"],
    reply:
      "Авторизованный пользователь может оставить отзыв в карточке товара. Текст обязателен, а фото или видео можно прикрепить как вложение. Перед публикацией отзыв проходит модерацию.",
    suggestions: ["Как войти?", "Подобрать картину", "Написать в поддержку"],
  },
  {
    keywords: ["поддерж", "связ", "почт", "менедж", "вопрос", "помощ"],
    reply:
      "Вы можете написать в поддержку через форму внизу главной страницы. Сообщение сохранится в админке, а администратор получит уведомление.",
    suggestions: ["Доставка", "Оплата", "Подобрать картину"],
  },
  {
    keywords: ["парол", "восстанов", "регистрац", "email", "подтверж"],
    reply:
      "Регистрация требует подтверждения email. Если забыли пароль, используйте страницу восстановления: ссылка придет на почту или в dev-лог в локальной версии.",
    suggestions: ["Статус заказа", "Написать в поддержку", "Как оставить отзыв?"],
  },
];

const productKeywords = [
  "картин",
  "товар",
  "каталог",
  "подбери",
  "покажи",
  "есть",
  "найди",
  "до ",
  "стиль",
  "импрес",
  "ренесс",
  "модерн",
  "современ",
  "абстрак",
];

const stopWords = new Set([
  "мне",
  "для",
  "что",
  "как",
  "или",
  "это",
  "есть",
  "покажи",
  "найди",
  "подбери",
  "картины",
  "картину",
  "товары",
]);

function normalize(value: string) {
  return value.toLowerCase().replaceAll("ё", "е");
}

function hasAnyKeyword(message: string, keywords: string[]) {
  return keywords.some((keyword) => message.includes(keyword));
}

function parseMaxPrice(message: string) {
  const explicitMatch = message.match(/(?:до|дешевле|меньше|<=)\s*([0-9][0-9\s]{2,})/);
  const looseMatch = explicitMatch || message.match(/([0-9][0-9\s]{3,})/);
  const rawNumber = looseMatch?.[1]?.replace(/\s/g, "");
  const value = rawNumber ? Number(rawNumber) : null;

  return value && Number.isFinite(value) ? value : null;
}

function parseStyle(message: string): ProductStyle | null {
  if (message.includes("импрес")) {
    return "impressionism";
  }

  if (message.includes("ренесс") || message.includes("класс") || message.includes("музей")) {
    return "renaissance";
  }

  if (message.includes("модерн") || message.includes("современ") || message.includes("абстрак")) {
    return "modern";
  }

  return null;
}

function extractSearchWords(message: string) {
  return message
    .replace(/[^a-zа-я0-9\s]/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopWords.has(word));
}

function scoreProduct(product: Product, message: string, words: string[], maxPrice: number | null, style: ProductStyle | null) {
  const searchable = normalize(
    [product.title, product.artist, product.styleLabel, product.size, product.description].join(" "),
  );
  let score = 0;

  if (style) {
    if (product.style !== style) {
      return -1;
    }
    score += 5;
  }

  if (maxPrice) {
    if (product.price > maxPrice) {
      return -1;
    }
    score += 3;
  }

  for (const word of words) {
    if (searchable.includes(word)) {
      score += 2;
    }
  }

  if (message.includes("интерьер") && searchable.includes("интерьер")) {
    score += 2;
  }

  return score;
}

function findProducts(products: Product[], message: string) {
  const maxPrice = parseMaxPrice(message);
  const style = parseStyle(message);
  const words = extractSearchWords(message);
  const productIntent = hasAnyKeyword(message, productKeywords) || Boolean(maxPrice || style);

  if (!productIntent) {
    return [];
  }

  return products
    .map((product) => ({
      product,
      score: scoreProduct(product, message, words, maxPrice, style),
    }))
    .filter((item) => item.score >= 0 && (item.score > 0 || Boolean(maxPrice || style)))
    .sort((first, second) => second.score - first.score || first.product.price - second.product.price)
    .slice(0, 4)
    .map(({ product }) => ({
      id: product.id,
      title: product.title,
      artist: product.artist,
      price: product.price,
      size: product.size,
      styleLabel: product.styleLabel,
      image: product.image,
    }));
}

function findFaqAnswer(message: string): ChatAnswer | null {
  const topic = faqTopics.find((item) => hasAnyKeyword(message, item.keywords));

  if (!topic) {
    return null;
  }

  return {
    reply: topic.reply,
    suggestions: topic.suggestions,
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ChatPayload;
  const rawMessage = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!rawMessage) {
    return NextResponse.json<ChatAnswer>({
      reply: "Напишите вопрос, и я помогу с каталогом, доставкой, оплатой или поддержкой.",
      suggestions: ["Подобрать картину", "Доставка", "Оплата"],
    });
  }

  const message = normalize(rawMessage);
  const products = await getCatalogProducts();
  const matchedProducts = findProducts(products, message);

  if (matchedProducts.length > 0) {
    return NextResponse.json<ChatAnswer>({
      reply:
        "Нашел подходящие варианты в актуальном каталоге. Откройте каталог, чтобы посмотреть карточку и добавить работу в корзину.",
      suggestions: ["Покажи картины до 90000", "Показать модерн", "Доставка"],
      products: matchedProducts,
    });
  }

  const faqAnswer = findFaqAnswer(message);

  if (faqAnswer) {
    return NextResponse.json<ChatAnswer>(faqAnswer);
  }

  return NextResponse.json<ChatAnswer>({
    reply:
      "Я пока лучше всего помогаю с частыми вопросами и каталогом. Если вопрос нестандартный, напишите в поддержку через форму на сайте.",
    suggestions: ["Подобрать картину", "Доставка", "Оплата", "Написать в поддержку"],
  });
}

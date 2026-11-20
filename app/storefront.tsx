"use client";

import {
  Mail,
  Minus,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChatWidget } from "./chat-widget";
import type { AuthUser } from "./lib/auth-user";
import type { Product, ProductStyle } from "./products";

type Cart = Record<string, number>;

type PriceFilter = "all" | "50000" | "90000" | "140000";
type DeliveryMethod = "COURIER" | "PICKUP" | "TRANSPORT_COMPANY";
type FeaturedReview = {
  name: string;
  artwork: string;
  image?: string;
  text: string;
  imagePosition?: string;
};

const styleOptions: Array<{ value: "all" | ProductStyle; label: string }> = [
  { value: "all", label: "Все стили" },
  { value: "impressionism", label: "Импрессионизм" },
  { value: "renaissance", label: "Ренессанс" },
  { value: "modern", label: "Модерн" },
];

const priceOptions: Array<{ value: PriceFilter; label: string }> = [
  { value: "all", label: "Любая" },
  { value: "50000", label: "50 000 ₽" },
  { value: "90000", label: "90 000 ₽" },
  { value: "140000", label: "140 000 ₽" },
];

const deliveryOptions: Array<{ value: DeliveryMethod; label: string }> = [
  { value: "COURIER", label: "Курьерская доставка" },
  { value: "PICKUP", label: "Самовывоз" },
  { value: "TRANSPORT_COMPANY", label: "Транспортная компания" },
];

const featuredReviews: FeaturedReview[] = [
  {
    name: "Мария, Санкт-Петербург",
    artwork: "Венецианский вид в золоченой раме",
    image:
      "https://img.freepik.com/premium-photo/trendy-beautiful-hipster-girl-photo-of-positive-young-nice-woman-in-black-knee-high-socks-with-white-background-looks-at-the-camera_222877-10377.jpg?size=626&ext=jpg",
    text:
      "Заказывала копию для столовой, хотелось музейного настроения без холодной строгости. Рама, фактура и теплый свет в работе получились именно такими, как я представляла.",
  },
  {
    name: "Алина, Казань",
    artwork: "Штормовое море",
    image:
      "https://img.freepik.com/premium-photo/woman-resting-couch_357704-515.jpg?semt=ais_hybrid&w=740",
    text:
      "Картина стала главным акцентом в гостиной. Очень понравилось, что перед отправкой прислали фото деталей и спокойно внесли правки по оттенкам.",
  },
  {
    name: "Игорь, Москва",
    artwork: "Синяя интерьерная абстракция",
    image:
      "https://avatars.mds.yandex.net/i?id=6c44a98a5f5a3312d88dc127f8f37d02_l-7822413-images-thumbs&n=13",
    imagePosition: "center 18%",
    text:
      "Нужна была крупная работа под современный интерьер. По размеру попали идеально, холст приехал надежно упакованным, повесил в тот же день.",
  },
];

const demoReviews: FeaturedReview[] = [
  {
    name: "Пример отзыва №1",
    artwork: "Копия «Водяные лилии»",
    text: "В гостиной картина выглядит светлее, чем на экране. Особенно понравилась фактура мазков.",
  },
  {
    name: "Пример отзыва №2",
    artwork: "Классический натюрморт",
    text: "Выбрали работу для кабинета. В карточке удобно было сверить размеры перед тем, как подобрать раму.",
  },
  {
    name: "Пример отзыва №3",
    artwork: "Синий город",
    text: "Долго искали картину в холодных тонах. Эта хорошо подошла к стенам и мебели.",
  },
];

const formatPrice = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

export function Storefront({
  currentUser,
  products,
  demo = false,
}: {
  currentUser: AuthUser | null;
  products: Product[];
  demo?: boolean;
}) {
  const router = useRouter();
  const cartStorageKey = demo ? "atelier-portfolio-cart" : "atelier-cart";
  const [cart, setCart] = useState<Cart>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<"all" | ProductStyle>("all");
  const [selectedPrice, setSelectedPrice] = useState<PriceFilter>("all");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [customerName, setCustomerName] = useState(currentUser?.name || "");
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("COURIER");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerComment, setCustomerComment] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [supportFormMessage, setSupportFormMessage] = useState("");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [cartReady, setCartReady] = useState(false);

  useEffect(() => {
    const savedCart = window.localStorage.getItem(cartStorageKey);
    if (savedCart) {
      setCart(JSON.parse(savedCart) as Cart);
    }
    setCartReady(true);
  }, [cartStorageKey]);

  useEffect(() => {
    if (cartReady) {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    }
  }, [cart, cartReady, cartStorageKey]);

  useEffect(() => {
    document.body.classList.toggle("cart-open", isCartOpen || Boolean(selectedProduct));

    return () => {
      document.body.classList.remove("cart-open");
    };
  }, [isCartOpen, selectedProduct]);

  useEffect(() => {
    setReviewRating("5");
    setReviewText("");
    setReviewMessage("");
  }, [selectedProduct?.id]);

  const visibleProducts = useMemo(() => {
    const maxPrice = selectedPrice === "all" ? Infinity : Number(selectedPrice);

    return products.filter((product) => {
      const matchesStyle = selectedStyle === "all" || product.style === selectedStyle;
      return matchesStyle && product.price <= maxPrice;
    });
  }, [products, selectedPrice, selectedStyle]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = products.find((item) => item.id === id);
          return product ? { ...product, quantity } : null;
        })
        .filter((item): item is Product & { quantity: number } => Boolean(item)),
    [cart, products],
  );

  const cartCount = cartLines.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartLines.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (id: string) => {
    setCart((currentCart) => ({
      ...currentCart,
      [id]: (currentCart[id] || 0) + 1,
    }));
    setCheckoutNote("");
    setIsCartOpen(true);
  };

  const changeQuantity = (id: string, amount: number) => {
    setCheckoutNote("");
    setCart((currentCart) => {
      const nextQuantity = (currentCart[id] || 0) + amount;
      const nextCart = { ...currentCart };

      if (nextQuantity <= 0) {
        delete nextCart[id];
      } else {
        nextCart[id] = nextQuantity;
      }

      return nextCart;
    });
  };

  const handleSupportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    setIsSubmittingSupport(true);
    setSupportFormMessage("");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось отправить сообщение.");
      }

      form.reset();
      setSupportFormMessage("Сообщение отправлено. Мы ответим на указанную почту.");
    } catch (error) {
      setSupportFormMessage(
        error instanceof Error ? error.message : "Не удалось отправить сообщение.",
      );
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleOrderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (cartLines.length === 0) {
      setCheckoutNote("Добавьте картину в корзину, чтобы перейти к оформлению.");
      return;
    }

    setIsSubmittingOrder(true);
    setCheckoutNote("Создаем заказ...");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          deliveryMethod,
          deliveryAddress,
          customerComment,
          items: cartLines.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const result = (await response.json()) as { id?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось создать заказ.");
      }

      setCart({});
      setIsCartOpen(false);
      setCheckoutNote("Заказ создан.");

      if (result.id) {
        router.push(`/orders/${result.id}`);
      }
    } catch (error) {
      setCheckoutNote(error instanceof Error ? error.message : "Не удалось создать заказ.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    setIsSubmittingReview(true);
    setReviewMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("productId", selectedProduct.id);
    formData.set("rating", reviewRating);
    formData.set("text", reviewText);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось отправить отзыв.");
      }

      form.reset();
      setReviewText("");
      setReviewRating("5");
      setReviewMessage("Отзыв отправлен на модерацию.");
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Не удалось отправить отзыв.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#catalog" aria-label="Atelier Copies">
          <span className="brand-mark">AC</span>
          <span>
            <strong>Atelier Copies</strong>
            <small>музейные копии картин</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Основная навигация">
          <a href="#catalog">Каталог</a>
          <a href="#process">Как работаем</a>
          <a href="#reviews">Отзывы</a>
          <a href="#support">{demo ? "Частые вопросы" : "Поддержка"}</a>
          {demo ? null : currentUser ? (
            <a href={currentUser.role === "ADMIN" ? "/admin/orders" : "/account"}>
              {currentUser.role === "ADMIN" ? "Заказы" : "Кабинет"}
            </a>
          ) : (
            <a href="/auth">Вход</a>
          )}
        </nav>

        <button className="cart-button" type="button" onClick={() => setIsCartOpen(true)}>
          <ShoppingBag size={19} aria-hidden="true" />
          <span>Корзина</span>
          <strong>{cartCount}</strong>
        </button>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-content">
            <p className="eyebrow">
              {demo ? "Демо интернет-магазина" : "Ручная работа по фото и музейным референсам"}
            </p>
            <h1 id="hero-title">Копии картин для интерьера, коллекции и подарка</h1>
            <p>
              Подберите готовую работу из каталога или закажите копию в нужном размере,
              технике и настроении.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#catalog">
                Выбрать картину
              </a>
              <a className="button secondary" href="#support">
                {demo ? "Частые вопросы" : "Задать вопрос"}
              </a>
            </div>
          </div>
        </section>

        <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Каталог</p>
              <h2 id="catalog-title">Популярные копии</h2>
            </div>
            <div className="filter-badge">
              <SlidersHorizontal size={17} aria-hidden="true" />
              <span>{visibleProducts.length} работ</span>
            </div>
          </div>

          <div className="toolbar" aria-label="Фильтры каталога">
            <label>
              Стиль
              <select
                value={selectedStyle}
                onChange={(event) =>
                  setSelectedStyle(event.target.value as "all" | ProductStyle)
                }
              >
                {styleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Цена до
              <select
                value={selectedPrice}
                onChange={(event) => setSelectedPrice(event.target.value as PriceFilter)}
              >
                {priceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <img src={product.image} alt={product.title} loading="lazy" />
                <div className="product-body">
                  <div>
                    <h3>{product.title}</h3>
                    <p>{product.artist}</p>
                  </div>
                  <div className="product-meta">
                    <span className="tag">{product.styleLabel}</span>
                    <span className="tag">{product.size}</span>
                  </div>
                  <div className="price-row">
                    <span className="price">{formatPrice(product.price)}</span>
                  </div>
                  <div className="card-actions">
                    <button className="button primary" type="button" onClick={() => addToCart(product.id)}>
                      <ShoppingBag size={18} aria-hidden="true" />
                      В корзину
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                    >
                      Подробнее
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="process" id="process" aria-labelledby="process-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Процесс</p>
              <h2 id="process-title">От выбора до доставки</h2>
            </div>
          </div>
          <div className="steps">
            <article>
              <span>01</span>
              <h3>Выбор работы</h3>
              <p>Покупатель выбирает картину, размер и формат исполнения.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Подтверждение</h3>
              <p>Менеджер уточняет детали, сроки, упаковку и доставку.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Оплата и заказ</h3>
              <p>После подтверждения заказ переходит к оплате и работе художника.</p>
            </article>
          </div>
        </section>

        <section className="reviews" id="reviews" aria-labelledby="reviews-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Отзывы</p>
              <h2 id="reviews-title">{demo ? "Примеры отзывов" : "Комментарии покупателей"}</h2>
            </div>
          </div>
          <div className="review-layout">
            {(demo ? demoReviews : featuredReviews).map((review) => (
              <article
                className={review.image ? "review-card featured-review" : "review-card portfolio-review"}
                key={review.name}
              >
                {review.image ? (
                  <img
                    src={review.image}
                    alt={review.name}
                    loading="lazy"
                    style={{ objectPosition: review.imagePosition }}
                  />
                ) : null}
                <div className="featured-review-body">
                  <span>{review.artwork}</span>
                  <p>"{review.text}"</p>
                  <strong>{review.name}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="support" id="support" aria-labelledby="support-title">
          <div className="support-copy">
            <p className="eyebrow">{demo ? "Помощь" : "Поддержка"}</p>
            <h2 id="support-title">{demo ? "Частые вопросы" : "Напишите нам с сайта"}</h2>
            {demo ? (
              <p>Условия доставки, оформления и оплаты в демонстрационной версии.</p>
            ) : (
              <p>
                Задайте вопрос о размере, сроках, технике исполнения или доставке. Мы ответим на
                указанную почту.
              </p>
            )}
          </div>
          {demo ? (
            <div className="support-form portfolio-faq">
              <details>
                <summary>Можно оформить заказ?</summary>
                <p>Корзина работает в браузере. Заказы и платежи в демоверсии не принимаются.</p>
              </details>
              <details>
                <summary>Какие способы доставки предусмотрены?</summary>
                <p>В полной версии доступны курьер, самовывоз и транспортная компания.</p>
              </details>
              <details>
                <summary>Где найти размеры картины?</summary>
                <p>Размер указан в каталоге и в подробной карточке работы.</p>
              </details>
            </div>
          ) : <form className="support-form" onSubmit={handleSupportSubmit}>
            <label>
              Ваше имя
              <input
                type="text"
                name="name"
                autoComplete="name"
                defaultValue={currentUser?.name || ""}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                defaultValue={currentUser?.email || ""}
                required
              />
            </label>
            <label>
              Сообщение
              <textarea name="message" rows={5} minLength={10} maxLength={2000} required />
            </label>
            <button className="button primary" type="submit" disabled={isSubmittingSupport}>
              <Mail size={18} aria-hidden="true" />
              {isSubmittingSupport ? "Отправляем..." : "Отправить"}
            </button>
            {supportFormMessage ? <p className="form-message">{supportFormMessage}</p> : null}
          </form>}
        </section>
      </main>

      <ChatWidget demo={demo} />

      <aside className={`cart-panel ${isCartOpen ? "is-open" : ""}`} aria-hidden={!isCartOpen} inert={!isCartOpen}>
        <button
          className="cart-backdrop"
          type="button"
          aria-label="Закрыть корзину"
          onClick={() => setIsCartOpen(false)}
        />
        <section className="cart-sheet" aria-labelledby="cart-title" role="dialog" aria-modal="true">
          <div className="cart-header">
            <h2 id="cart-title">Корзина</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Закрыть корзину"
              onClick={() => setIsCartOpen(false)}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <div className="cart-items">
            {cartLines.map((item) => (
              <article className="cart-item" key={item.id}>
                <img src={item.image} alt="" />
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {formatPrice(item.price)} • {item.size}
                  </small>
                  <div className="quantity" aria-label="Количество">
                    <button
                      type="button"
                      aria-label="Уменьшить количество"
                      onClick={() => changeQuantity(item.id, -1)}
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Увеличить количество"
                      onClick={() => changeQuantity(item.id, 1)}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </article>
            ))}
          </div>

          {cartLines.length === 0 ? <div className="cart-empty">Корзина пока пуста.</div> : null}

          <div className="cart-summary">
            <span>Итого</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>
          {demo ? (
            <div className="checkout-form">
              <button
                className="button primary checkout-button"
                type="button"
                disabled={cartLines.length === 0}
                onClick={() => setCheckoutNote(`Демо-заказ на ${formatPrice(cartTotal)}. Оплата недоступна.`)}
              >
                Попробовать оформление
              </button>
            </div>
          ) : <form className="checkout-form" onSubmit={handleOrderSubmit}>
            <label>
              Имя
              <input
                type="text"
                name="customerName"
                autoComplete="name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                name="customerEmail"
                autoComplete="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Телефон
              <input
                type="tel"
                name="customerPhone"
                autoComplete="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="+7 999 000-00-00"
                required
              />
            </label>
            <label>
              Способ доставки
              <select
                name="deliveryMethod"
                value={deliveryMethod}
                onChange={(event) => setDeliveryMethod(event.target.value as DeliveryMethod)}
              >
                {deliveryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {deliveryMethod !== "PICKUP" ? (
              <label>
                Адрес доставки
                <textarea
                  name="deliveryAddress"
                  rows={3}
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  required
                />
              </label>
            ) : null}
            <label>
              Комментарий
              <textarea
                name="customerComment"
                rows={3}
                maxLength={1000}
                value={customerComment}
                onChange={(event) => setCustomerComment(event.target.value)}
              />
            </label>
            <button
              className="button primary checkout-button"
              type="submit"
              disabled={isSubmittingOrder || cartLines.length === 0}
            >
              {isSubmittingOrder ? "Создаем заказ..." : "Оформить заказ"}
            </button>
          </form>}
          <p className="checkout-note" aria-live="polite">{checkoutNote}</p>
        </section>
      </aside>

      {selectedProduct ? (
        <div className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-title">
          <button
            className="modal-backdrop"
            type="button"
            aria-label="Закрыть карточку товара"
            onClick={() => setSelectedProduct(null)}
          />
          <article className="product-detail">
            <button
              className="icon-button dialog-close"
              type="button"
              aria-label="Закрыть"
              onClick={() => setSelectedProduct(null)}
            >
              <X size={22} aria-hidden="true" />
            </button>
            <img src={selectedProduct.image} alt={selectedProduct.title} />
            <div className="product-detail-content">
              <p className="eyebrow">{selectedProduct.styleLabel}</p>
              <h2 id="product-title">{selectedProduct.title}</h2>
              <p>{selectedProduct.description}</p>
              <div className="product-meta">
                <span className="tag">{selectedProduct.artist}</span>
                <span className="tag">{selectedProduct.size}</span>
              </div>
              <strong className="price">{formatPrice(selectedProduct.price)}</strong>
              <button
                className="button primary"
                type="button"
                onClick={() => addToCart(selectedProduct.id)}
              >
                <ShoppingBag size={18} aria-hidden="true" />
                Добавить в корзину
              </button>

              <section className="product-reviews" aria-labelledby="product-reviews-title">
                <div>
                  <p className="eyebrow">Отзывы</p>
                  <h3 id="product-reviews-title">Отзывы о работе</h3>
                </div>

                {selectedProduct.reviews.length > 0 ? (
                  <div className="review-list">
                    {selectedProduct.reviews.map((review) => (
                      <article className="inline-review" key={review.id}>
                        <div>
                          <strong>{review.authorName}</strong>
                          {review.rating ? <span>{review.rating}/5</span> : null}
                        </div>
                        {review.type === "PHOTO" && review.attachmentUrl ? (
                          <img
                            className="inline-review-media"
                            src={review.attachmentUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : null}
                        {review.type === "VIDEO" && review.attachmentUrl ? (
                          <video className="inline-review-video" src={review.attachmentUrl} controls />
                        ) : null}
                        {review.text ? <p>{review.text}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Одобренных отзывов пока нет.</p>
                )}

                {demo ? null : currentUser ? (
                  <form className="review-form" onSubmit={handleReviewSubmit}>
                    <h4>Отзыв</h4>
                    <label>
                      Оценка
                      <select
                        value={reviewRating}
                        onChange={(event) => setReviewRating(event.target.value)}
                      >
                        <option value="5">5</option>
                        <option value="4">4</option>
                        <option value="3">3</option>
                        <option value="2">2</option>
                        <option value="1">1</option>
                      </select>
                    </label>
                    <label>
                      Текст отзыва
                      <textarea
                        minLength={10}
                        maxLength={1000}
                        rows={4}
                        value={reviewText}
                        onChange={(event) => setReviewText(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Фото или видео
                      <input
                        type="file"
                        name="attachment"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                      />
                    </label>
                    <button className="button dark" type="submit" disabled={isSubmittingReview}>
                      {isSubmittingReview ? "Отправляем..." : "Отправить отзыв"}
                    </button>
                    {reviewMessage ? <p className="form-message">{reviewMessage}</p> : null}
                  </form>
                ) : (
                  <a className="button light" href="/auth">
                    Войти, чтобы оставить отзыв
                  </a>
                )}
              </section>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}

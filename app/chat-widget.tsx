"use client";

import { Bot, MessageCircle, Send, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type ChatProduct = {
  id: string;
  title: string;
  artist: string;
  price: number;
  size: string;
  styleLabel: string;
  image: string;
};

type ChatResponse = {
  reply: string;
  suggestions: string[];
  products?: ChatProduct[];
};

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  suggestions?: string[];
  products?: ChatProduct[];
};

const initialSuggestions = ["Подобрать картину", "Доставка", "Оплата", "Сроки изготовления"];

const demoAnswers: Record<string, string> = {
  "Подобрать картину": "В каталоге можно отфильтровать работы по стилю и бюджету. Размеры каждой работы указаны в её карточке.",
  Доставка: "Предусмотрены курьерская доставка, самовывоз и транспортная компания.",
  Оплата: "Онлайн-оплата недоступна. Стоимость выбранных работ указана в корзине.",
  "Сроки изготовления": "Срок зависит от размера, техники и сложности работы. Детали уточняются перед подтверждением заказа.",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ChatWidget({ demo = false }: { demo?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: demo
        ? "Здравствуйте! Выберите вопрос о каталоге, доставке, оплате или сроках."
        : "Здравствуйте! Я помогу подобрать картину, объясню доставку, оплату, сроки, отзывы и регистрацию.",
      suggestions: initialSuggestions,
    },
  ]);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [isOpen, messages, isLoading]);

  const sendMessage = async (value: string) => {
    const text = value.trim();

    if (!text || isLoading) {
      return;
    }

    setInputValue("");
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: "user",
        text,
      },
    ]);

    if (demo) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "bot",
          text: demoAnswers[text] || "Выберите тему из списка.",
          suggestions: initialSuggestions,
        },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      const result = (await response.json()) as Partial<ChatResponse> & { message?: string };

      if (!response.ok || !result.reply) {
        throw new Error(result.message || "Не удалось получить ответ помощника.");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "bot",
          text: result.reply || "",
          suggestions: result.suggestions || initialSuggestions,
          products: result.products,
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "bot",
          text:
            error instanceof Error
              ? error.message
              : "Сейчас не получилось ответить. Попробуйте еще раз или напишите в поддержку.",
          suggestions: ["Написать в поддержку", "Подобрать картину"],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(inputValue);
  };

  return (
    <div className={`chat-widget ${isOpen ? "is-open" : ""}`}>
      {isOpen ? (
        <section className="chat-window" aria-label="Онлайн-помощник">
          <header className="chat-header">
            <div className="chat-title">
              <span aria-hidden="true">
                <Bot size={19} />
              </span>
              <div>
                <strong>Помощник Atelier</strong>
                <small>{demo ? "Частые вопросы" : "Сейчас на связи"}</small>
              </div>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Закрыть помощника"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="chat-messages" ref={messagesRef}>
            {messages.map((message, index) => {
              const isLatestBotMessage = message.role === "bot" && index === messages.length - 1;

              return (
                <article className={`chat-message ${message.role}`} key={message.id}>
                  <p>{message.text}</p>

                  {message.products && message.products.length > 0 ? (
                    <div className="chat-products">
                      {message.products.map((product) => (
                        <a
                          className="chat-product"
                          href="#catalog"
                          key={product.id}
                          onClick={() => setIsOpen(false)}
                        >
                          <img src={product.image} alt="" loading="lazy" />
                          <span>
                            <strong>{product.title}</strong>
                            <small>
                              {product.artist} · {product.size}
                            </small>
                            <b>{formatPrice(product.price)}</b>
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : null}

                  {isLatestBotMessage && message.suggestions && message.suggestions.length > 0 ? (
                    <div className="chat-suggestions">
                      {message.suggestions.map((suggestion) => (
                        <button
                          type="button"
                          key={suggestion}
                          onClick={() => void sendMessage(suggestion)}
                          disabled={isLoading}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
            {isLoading ? <div className="chat-typing">Печатает...</div> : null}
          </div>

          {demo ? null : <form className="chat-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Спросите о картине, доставке или оплате"
              aria-label="Сообщение помощнику"
            />
            <button type="submit" aria-label="Отправить сообщение" disabled={isLoading}>
              <Send size={18} aria-hidden="true" />
            </button>
          </form>}
        </section>
      ) : null}

      <button
        className="chat-toggle"
        type="button"
        aria-label={isOpen ? "Закрыть помощника" : "Открыть помощника"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        {isOpen ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}
        <span>{isOpen ? "Закрыть" : "Помощь"}</span>
      </button>
    </div>
  );
}

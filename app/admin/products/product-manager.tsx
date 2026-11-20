"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AdminProduct = {
  id: string;
  title: string;
  artist: string;
  style: "IMPRESSIONISM" | "RENAISSANCE" | "MODERN";
  styleLabel: string;
  size: string;
  price: number;
  image: string;
  description: string;
  isActive: boolean;
  createdAt: string;
};

type ProductFormState = {
  title: string;
  artist: string;
  style: AdminProduct["style"];
  size: string;
  price: string;
  imageUrl: string;
  description: string;
  isActive: boolean;
};

const emptyForm: ProductFormState = {
  title: "",
  artist: "",
  style: "IMPRESSIONISM",
  size: "",
  price: "",
  imageUrl: "",
  description: "",
  isActive: true,
};

const styleOptions = [
  { value: "IMPRESSIONISM", label: "Импрессионизм" },
  { value: "RENAISSANCE", label: "Ренессанс" },
  { value: "MODERN", label: "Модерн" },
];

const formatPrice = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

function productToForm(product: AdminProduct): ProductFormState {
  return {
    title: product.title,
    artist: product.artist,
    style: product.style,
    size: product.size,
    price: String(product.price),
    imageUrl: product.image,
    description: product.description,
    isActive: product.isActive,
  };
}

export function ProductManager({ initialProducts }: { initialProducts: AdminProduct[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) || null,
    [editingProductId, products],
  );

  const resetForm = () => {
    setEditingProductId(null);
    setForm(emptyForm);
    setMessage("");
  };

  const startEditing = (product: AdminProduct) => {
    setEditingProductId(product.id);
    setForm(productToForm(product));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateForm = <Key extends keyof ProductFormState>(
    key: Key,
    value: ProductFormState[Key],
  ) => {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("title", form.title);
    formData.set("artist", form.artist);
    formData.set("style", form.style);
    formData.set("size", form.size);
    formData.set("price", form.price);
    formData.set("imageUrl", form.imageUrl);
    formData.set("description", form.description);
    formData.set("isActive", String(form.isActive));

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        editingProductId ? `/api/admin/products/${editingProductId}` : "/api/admin/products",
        {
          method: editingProductId ? "PATCH" : "POST",
          body: formData,
        },
      );

      const result = (await response.json()) as { product?: AdminProduct; message?: string };

      if (!response.ok || !result.product) {
        throw new Error(result.message || "Не удалось сохранить товар.");
      }

      if (editingProductId) {
        setProducts((currentProducts) =>
          currentProducts.map((product) =>
            product.id === result.product?.id ? result.product : product,
          ),
        );
        setMessage("Товар обновлен.");
        setForm(productToForm(result.product));
      } else {
        setProducts((currentProducts) => [result.product as AdminProduct, ...currentProducts]);
        setForm(emptyForm);
        formElement.reset();
        setMessage("Товар добавлен.");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить товар.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="product-manager">
      <section className="product-editor" aria-labelledby="product-editor-title">
        <div>
          <p className="eyebrow">{editingProduct ? "Редактирование" : "Новый товар"}</p>
          <h2 id="product-editor-title">{editingProduct ? editingProduct.title : "Картина в каталоге"}</h2>
        </div>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <label>
              Название
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                required
              />
            </label>
            <label>
              Автор / источник
              <input
                type="text"
                value={form.artist}
                onChange={(event) => updateForm("artist", event.target.value)}
                required
              />
            </label>
            <label>
              Стиль
              <select
                value={form.style}
                onChange={(event) => updateForm("style", event.target.value as AdminProduct["style"])}
              >
                {styleOptions.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Размер
              <input
                type="text"
                value={form.size}
                onChange={(event) => updateForm("size", event.target.value)}
                placeholder="70 x 100 см"
                required
              />
            </label>
            <label>
              Цена, ₽
              <input
                type="number"
                min="1"
                step="1"
                value={form.price}
                onChange={(event) => updateForm("price", event.target.value)}
                required
              />
            </label>
            <label className="product-active-toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm("isActive", event.target.checked)}
              />
              Показывать в каталоге
            </label>
          </div>

          <label>
            Ссылка на изображение
            <input
              type="text"
              value={form.imageUrl}
              onChange={(event) => updateForm("imageUrl", event.target.value)}
              placeholder="https://... или /uploads/products/..."
            />
          </label>

          <label>
            Загрузить изображение
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" />
          </label>

          {form.imageUrl ? <img className="product-image-preview" src={form.imageUrl} alt="" /> : null}

          <label>
            Описание
            <textarea
              rows={5}
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              required
            />
          </label>

          <div className="product-form-actions">
            <button className="button dark" type="submit" disabled={isSaving}>
              {isSaving ? "Сохраняем..." : editingProduct ? "Сохранить товар" : "Добавить товар"}
            </button>
            {editingProduct ? (
              <button className="button light" type="button" onClick={resetForm}>
                Новый товар
              </button>
            ) : null}
          </div>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
      </section>

      <div className="orders-table-wrap">
        <table className="products-table">
          <thead>
            <tr>
              <th>Товар</th>
              <th>Стиль</th>
              <th>Цена</th>
              <th>Статус</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="product-table-title">
                    <img className="product-thumb" src={product.image} alt="" />
                    <div>
                      <strong>{product.title}</strong>
                      <small>{product.artist}</small>
                      <small>{product.id}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{product.styleLabel}</strong>
                  <small>{product.size}</small>
                </td>
                <td>{formatPrice(product.price)}</td>
                <td>
                  <span className="status-pill">
                    {product.isActive ? "В каталоге" : "Скрыт"}
                  </span>
                </td>
                <td>
                  <button className="button compact" type="button" onClick={() => startEditing(product)}>
                    Редактировать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

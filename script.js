const products = [
  {
    id: "water-lilies",
    title: "Копия \"Водяные лилии\"",
    artist: "по мотивам Клода Моне",
    style: "impressionism",
    styleLabel: "Импрессионизм",
    size: "70 x 100 см",
    price: 84000,
    image:
      "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1200&q=82",
    description:
      "Мягкая пастозная фактура, светлая палитра и спокойный ритм мазка для интерьера с воздухом и естественным светом.",
  },
  {
    id: "renaissance-portrait",
    title: "Ренессансный портрет",
    artist: "по музейному референсу",
    style: "renaissance",
    styleLabel: "Ренессанс",
    size: "60 x 80 см",
    price: 118000,
    image:
      "https://images.unsplash.com/photo-1578926375605-eaf7559b1458?auto=format&fit=crop&w=1200&q=82",
    description:
      "Портретная копия с глубокими тенями, лессировками и классической композицией для кабинета или частной коллекции.",
  },
  {
    id: "golden-abstraction",
    title: "Декоративная абстракция",
    artist: "авторская копия в стиле модерн",
    style: "modern",
    styleLabel: "Модерн",
    size: "90 x 120 см",
    price: 76000,
    image:
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=82",
    description:
      "Выразительная композиция с теплыми акцентами, подходит для современных гостиных, ресторанов и бутиков.",
  },
  {
    id: "garden-light",
    title: "Садовый свет",
    artist: "по мотивам импрессионистов",
    style: "impressionism",
    styleLabel: "Импрессионизм",
    size: "50 x 70 см",
    price: 49000,
    image:
      "https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=1200&q=82",
    description:
      "Легкая камерная работа с живой зеленью и солнечными бликами, хорошо смотрится в спальне или зоне отдыха.",
  },
  {
    id: "classic-still-life",
    title: "Классический натюрморт",
    artist: "по европейской школе",
    style: "renaissance",
    styleLabel: "Ренессанс",
    size: "65 x 90 см",
    price: 92000,
    image:
      "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=82",
    description:
      "Сдержанная работа с плотным цветом, глубоким фоном и предметной детализацией для спокойного интерьера.",
  },
  {
    id: "blue-city",
    title: "Синий город",
    artist: "современная интерьерная копия",
    style: "modern",
    styleLabel: "Модерн",
    size: "80 x 100 см",
    price: 64000,
    image:
      "https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?auto=format&fit=crop&w=1200&q=82",
    description:
      "Графичная городская композиция с холодными акцентами, рассчитана на минималистичные пространства.",
  },
];

const state = {
  cart: JSON.parse(localStorage.getItem("atelier-cart") || "{}"),
  filters: {
    style: "all",
    price: "all",
  },
};

const formatPrice = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const productGrid = document.querySelector("[data-products]");
const cartPanel = document.querySelector("[data-cart-panel]");
const cartItems = document.querySelector("[data-cart-items]");
const cartEmpty = document.querySelector("[data-cart-empty]");
const cartCount = document.querySelector("[data-cart-count]");
const cartTotal = document.querySelector("[data-cart-total]");
const productDialog = document.querySelector("[data-product-dialog]");
const productDetail = document.querySelector("[data-product-detail]");

function saveCart() {
  localStorage.setItem("atelier-cart", JSON.stringify(state.cart));
}

function getCartLines() {
  return Object.entries(state.cart)
    .map(([id, quantity]) => {
      const product = products.find((item) => item.id === id);
      return product ? { ...product, quantity } : null;
    })
    .filter(Boolean);
}

function renderProducts() {
  const maxPrice = state.filters.price === "all" ? Infinity : Number(state.filters.price);
  const visibleProducts = products.filter((product) => {
    const styleMatch = state.filters.style === "all" || product.style === state.filters.style;
    return styleMatch && product.price <= maxPrice;
  });

  productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="product-card">
          <img src="${product.image}" alt="${product.title}" loading="lazy" />
          <div class="product-body">
            <div>
              <h3>${product.title}</h3>
              <p>${product.artist}</p>
            </div>
            <div class="product-meta">
              <span class="tag">${product.styleLabel}</span>
              <span class="tag">${product.size}</span>
            </div>
            <div class="price-row">
              <span class="price">${formatPrice(product.price)}</span>
            </div>
            <div class="card-actions">
              <button class="button primary" type="button" data-add="${product.id}">
                В корзину
              </button>
              <button class="button secondary" type="button" data-view="${product.id}">
                Подробнее
              </button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderCart() {
  const lines = getCartLines();
  const totalCount = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);

  cartCount.textContent = totalCount;
  cartTotal.textContent = formatPrice(totalPrice);
  cartEmpty.hidden = lines.length > 0;

  cartItems.innerHTML = lines
    .map(
      (item) => `
        <article class="cart-item">
          <div>
            <strong>${item.title}</strong>
            <small>${formatPrice(item.price)} • ${item.size}</small>
            <div class="quantity" aria-label="Количество">
              <button type="button" data-decrease="${item.id}">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-increase="${item.id}">+</button>
            </div>
          </div>
          <strong>${formatPrice(item.price * item.quantity)}</strong>
        </article>
      `,
    )
    .join("");
}

function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveCart();
  renderCart();
}

function changeQuantity(id, amount) {
  state.cart[id] = (state.cart[id] || 0) + amount;
  if (state.cart[id] <= 0) {
    delete state.cart[id];
  }
  saveCart();
  renderCart();
}

function openCart() {
  cartPanel.classList.add("is-open");
  cartPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
}

function closeCart() {
  cartPanel.classList.remove("is-open");
  cartPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}

function openProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  productDetail.innerHTML = `
    <article class="product-detail">
      <img src="${product.image}" alt="${product.title}" />
      <div class="product-detail-content">
        <p class="eyebrow">${product.styleLabel}</p>
        <h2>${product.title}</h2>
        <p>${product.description}</p>
        <div class="product-meta">
          <span class="tag">${product.artist}</span>
          <span class="tag">${product.size}</span>
        </div>
        <strong class="price">${formatPrice(product.price)}</strong>
        <button class="button primary" type="button" data-add="${product.id}">
          Добавить в корзину
        </button>
      </div>
    </article>
  `;

  productDialog.showModal();
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const addId = target.dataset.add;
  const viewId = target.dataset.view;
  const increaseId = target.dataset.increase;
  const decreaseId = target.dataset.decrease;

  if (addId) {
    addToCart(addId);
    openCart();
  }

  if (viewId) {
    openProduct(viewId);
  }

  if (increaseId) {
    changeQuantity(increaseId, 1);
  }

  if (decreaseId) {
    changeQuantity(decreaseId, -1);
  }

  if (target.matches("[data-open-cart]")) {
    openCart();
  }

  if (target.matches("[data-close-cart]")) {
    closeCart();
  }

  if (target.matches("[data-close-product]")) {
    productDialog.close();
  }
});

document.querySelector("[data-filter-style]").addEventListener("change", (event) => {
  state.filters.style = event.target.value;
  renderProducts();
});

document.querySelector("[data-filter-price]").addEventListener("change", (event) => {
  state.filters.price = event.target.value;
  renderProducts();
});

renderProducts();
renderCart();

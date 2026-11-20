export type ProductStyle = "impressionism" | "renaissance" | "modern";

export type ProductReview = {
  id: string;
  authorName: string;
  rating: number | null;
  type: "TEXT" | "PHOTO" | "VIDEO";
  text: string | null;
  attachmentUrl: string | null;
  createdAt: string;
};

export type Product = {
  id: string;
  title: string;
  artist: string;
  style: ProductStyle;
  styleLabel: string;
  size: string;
  price: number;
  image: string;
  description: string;
  reviews: ProductReview[];
};

export const fallbackProducts: Product[] = [
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
    reviews: [],
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
    reviews: [],
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
    reviews: [],
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
    reviews: [],
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
    reviews: [],
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
    reviews: [],
  },
];

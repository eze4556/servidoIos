export interface DemoProduct {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  imageUrl?: string
  media?: { type: "image" | "video"; url: string; path: string }[]
  isService: boolean
  stock?: number
  sellerId: string
  sellerName?: string
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
  rating?: number
  reviewCount?: number
  createdAt: Date
}

export interface DemoCategory {
  id: string
  name: string
  description?: string
  imageUrl?: string
  iconQuery?: string
}

export interface DemoBrand {
  id: string
  name: string
  imageUrl?: string
}

export interface DemoBanner {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string
  subtitle?: string
  ctaText?: string
  order: number
  isActive: boolean
}

export interface DemoSeller {
  id: string
  name: string
  email: string
  displayName?: string
  location?: string
  photoURL?: string
}

const DEMO_SELLER_ID = "demo-seller-servido"

const img = (path: string) => `https://images.unsplash.com/${path}?auto=format&fit=crop&w=800&q=80`
const imgBanner = (path: string) => `https://images.unsplash.com/${path}?auto=format&fit=crop&w=1600&q=85`

export const demoSeller: DemoSeller = {
  id: DEMO_SELLER_ID,
  name: "Comercio Demo Rosario",
  displayName: "Comercio Demo Rosario",
  email: "demo@servido.com.ar",
  location: "Rosario, Santa Fe, Argentina",
}

export const demoCategories: DemoCategory[] = [
  {
    id: "demo-cat-electro",
    name: "Electrónica",
    description: "Audio, computación y accesorios",
    imageUrl: img("photo-1498049794561-7780e7231661"),
  },
  {
    id: "demo-cat-hogar",
    name: "Hogar",
    description: "Decoración y equipamiento",
    imageUrl: img("photo-1586023492125-27b2c045efd7"),
  },
  {
    id: "demo-cat-herramientas",
    name: "Herramientas",
    description: "Para obra y bricolaje",
    imageUrl: img("photo-1504148455324-f06788ec3f59"),
  },
  {
    id: "demo-cat-deportes",
    name: "Deportes",
    description: "Indumentaria y equipamiento",
    imageUrl: img("photo-1517836357463-d25dfeac3438"),
  },
  {
    id: "demo-cat-servicios",
    name: "Servicios",
    description: "Profesionales cerca tuyo",
    imageUrl: img("photo-1581578731548-c64695cc6952"),
  },
  {
    id: "demo-cat-moda",
    name: "Moda",
    description: "Ropa, calzado y accesorios",
    imageUrl: img("photo-1445205170230-053b83016050"),
  },
  {
    id: "demo-cat-mascotas",
    name: "Mascotas",
    description: "Alimento y accesorios",
    imageUrl: img("photo-1450778869180-41d0601e046e"),
  },
  {
    id: "demo-cat-belleza",
    name: "Belleza",
    description: "Cuidado personal y cosmética",
    imageUrl: img("photo-1596462502278-27bfdc403348"),
  },
]

export const demoBrands: DemoBrand[] = [
  { id: "demo-brand-tech", name: "TechHome", imageUrl: img("photo-1612815154850-874123d9b749") },
  { id: "demo-brand-fit", name: "FitPro", imageUrl: img("photo-1571902943202-507ec2618e8f") },
  { id: "demo-brand-casa", name: "Casa Bella", imageUrl: img("photo-1555041469-a586c61ea9bc") },
  { id: "demo-brand-tools", name: "ProTools", imageUrl: img("photo-1530124566582-6b6e8d3eec6f") },
]

export const demoBanners: DemoBanner[] = [
  {
    id: "demo-banner-1",
    title: "Todo lo que buscás, en un solo lugar",
    subtitle: "Miles de productos nuevos y usados con las mejores ofertas",
    ctaText: "Explorar productos",
    imageUrl: imgBanner("photo-1472851294258-6c3b7e85a155"),
    linkUrl: "/products",
    order: 1,
    isActive: true,
  },
  {
    id: "demo-banner-2",
    title: "Servicios profesionales cerca tuyo",
    subtitle: "Plomeros, electricistas, limpieza y más. Contratá con confianza",
    ctaText: "Ver servicios",
    imageUrl: imgBanner("photo-1504307651254-35680f356dfd"),
    linkUrl: "/services",
    order: 2,
    isActive: true,
  },
]

function product(
  id: string,
  data: Omit<DemoProduct, "id" | "sellerId" | "createdAt"> & { createdAt?: Date }
): DemoProduct {
  const imageUrl = data.imageUrl || data.media?.[0]?.url
  return {
    ...data,
    id,
    sellerId: DEMO_SELLER_ID,
    sellerName: demoSeller.displayName,
    imageUrl,
    createdAt: data.createdAt ?? new Date("2026-05-15"),
  }
}

export const demoProducts: DemoProduct[] = [
  product("demo-prod-auriculares", {
    name: "Auriculares Bluetooth Pro",
    description:
      "Sonido envolvente, cancelación de ruido y hasta 30 horas de batería. Ideales para trabajo y viajes.",
    price: 45999,
    category: "demo-cat-electro",
    brand: "demo-brand-tech",
    isService: false,
    stock: 24,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.8,
    reviewCount: 32,
    media: [{ type: "image", url: img("photo-1505740420928-5e560c06d30e"), path: "demo/auriculares" }],
  }),
  product("demo-prod-notebook", {
    name: "Notebook 14'' 16GB RAM",
    description: "Ultraliviana para estudio y oficina. SSD 512GB, pantalla Full HD y teclado retroiluminado.",
    price: 899999,
    category: "demo-cat-electro",
    brand: "demo-brand-tech",
    isService: false,
    stock: 8,
    condition: "nuevo",
    freeShipping: false,
    shippingCost: 4500,
    rating: 4.6,
    reviewCount: 11,
    media: [{ type: "image", url: img("photo-1496181133206-80ce9b88a853"), path: "demo/notebook" }],
  }),
  product("demo-prod-sillon", {
    name: "Sillón nordico 3 cuerpos",
    description: "Tela premium color gris. Estructura reforzada y diseño moderno para living o estudio.",
    price: 329999,
    category: "demo-cat-hogar",
    brand: "demo-brand-casa",
    isService: false,
    stock: 5,
    condition: "nuevo",
    freeShipping: false,
    shippingCost: 8900,
    rating: 4.9,
    reviewCount: 7,
    media: [{ type: "image", url: img("photo-1555041469-a586c61ea9bc"), path: "demo/sillon" }],
  }),
  product("demo-prod-lampara", {
    name: "Lámpara de pie LED regulable",
    description: "Luz cálida y fría ajustable. Perfecta para lectura y ambientación.",
    price: 38999,
    category: "demo-cat-hogar",
    brand: "demo-brand-casa",
    isService: false,
    stock: 18,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.5,
    reviewCount: 19,
    media: [{ type: "image", url: img("photo-1507473886341-444aaefead1f"), path: "demo/lampara" }],
  }),
  product("demo-prod-taladro", {
    name: "Taladro percutor 750W",
    description: "Incluye maletín y set de mechas. Ideal para trabajos domésticos y profesionales.",
    price: 67999,
    category: "demo-cat-herramientas",
    brand: "demo-brand-tools",
    isService: false,
    stock: 14,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.7,
    reviewCount: 25,
    media: [{ type: "image", url: img("photo-1504148455324-f06788ec3f59"), path: "demo/taladro" }],
  }),
  product("demo-prod-bici", {
    name: "Bicicleta urbana rodado 28",
    description: "Cuadro de aluminio, 21 velocidades y frenos a disco. Lista para usar en la ciudad.",
    price: 459999,
    category: "demo-cat-deportes",
    brand: "demo-brand-fit",
    isService: false,
    stock: 6,
    condition: "nuevo",
    freeShipping: false,
    shippingCost: 12000,
    rating: 4.8,
    reviewCount: 14,
    media: [{ type: "image", url: img("photo-1485965120188-e220f721d03f"), path: "demo/bici" }],
  }),
  product("demo-prod-zapatillas", {
    name: "Zapatillas running amortiguadas",
    description: "Ligeras y transpirables. Talles del 38 al 44 disponibles.",
    price: 79999,
    category: "demo-cat-deportes",
    brand: "demo-brand-fit",
    isService: false,
    stock: 30,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.4,
    reviewCount: 41,
    media: [{ type: "image", url: img("photo-1542291026-7eec264c27ff"), path: "demo/zapatillas" }],
  }),
  product("demo-prod-cafetera", {
    name: "Cafetera espresso automática",
    description: "Prepará cappuccino y espresso en segundos. Tanque de agua extraíble y apagado automático.",
    price: 189999,
    category: "demo-cat-hogar",
    brand: "demo-brand-casa",
    isService: false,
    stock: 10,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.6,
    reviewCount: 16,
    media: [{ type: "image", url: img("photo-1495474472282-4d71bcdd2085"), path: "demo/cafetera" }],
  }),
  product("demo-serv-plomero", {
    name: "Plomería a domicilio",
    description: "Reparación de pérdidas, instalaciones y destapaciones. Presupuesto sin cargo en Rosario y alrededores.",
    price: 15000,
    category: "demo-cat-servicios",
    isService: true,
    stock: 99,
    freeShipping: true,
    rating: 4.9,
    reviewCount: 58,
    media: [{ type: "image", url: img("photo-1585704032915-1dc3ac7124de"), path: "demo/plomero" }],
  }),
  product("demo-serv-electricista", {
    name: "Electricista matriculado",
    description: "Instalaciones, tableros, luminarias y urgencias. Trabajo garantizado y factura C.",
    price: 18000,
    category: "demo-cat-servicios",
    isService: true,
    stock: 99,
    freeShipping: true,
    rating: 4.8,
    reviewCount: 44,
    media: [{ type: "image", url: img("photo-1621905251189-08b45d6a269e"), path: "demo/electricista" }],
  }),
  product("demo-serv-limpieza", {
    name: "Limpieza profunda de hogar",
    description: "Servicio semanal o por única vez. Incluye productos ecológicos y personal capacitado.",
    price: 22000,
    category: "demo-cat-servicios",
    isService: true,
    stock: 99,
    freeShipping: true,
    rating: 4.7,
    reviewCount: 36,
    media: [{ type: "image", url: img("photo-1581578731548-c64695cc6952"), path: "demo/limpieza" }],
  }),
  product("demo-prod-monitor", {
    name: 'Monitor 27" QHD 144Hz',
    description: "Panel IPS, ideal para diseño y gaming. Entrada HDMI y DisplayPort.",
    price: 279999,
    category: "demo-cat-electro",
    brand: "demo-brand-tech",
    isService: false,
    stock: 12,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.7,
    reviewCount: 22,
    media: [{ type: "image", url: img("photo-1527443224154-c4a3942d3acf"), path: "demo/monitor" }],
  }),
  product("demo-prod-campera", {
    name: "Campera de abrigo unisex",
    description: "Impermeable y con capucha desmontable. Talles S al XXL.",
    price: 89999,
    category: "demo-cat-moda",
    brand: "demo-brand-fit",
    isService: false,
    stock: 40,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.5,
    reviewCount: 28,
    media: [{ type: "image", url: img("photo-1551028719-00167b16eac5"), path: "demo/campera" }],
  }),
  product("demo-prod-reloj", {
    name: "Reloj inteligente deportivo",
    description: "Monitoreo de ritmo cardíaco, GPS y notificaciones. Sumergible.",
    price: 124999,
    category: "demo-cat-moda",
    brand: "demo-brand-tech",
    isService: false,
    stock: 22,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.6,
    reviewCount: 33,
    media: [{ type: "image", url: img("photo-1523275335684-37898b6baf30"), path: "demo/reloj" }],
  }),
  product("demo-prod-alimento", {
    name: "Alimento premium para perros 15kg",
    description: "Balanceado para razas medianas y grandes. Con vitaminas y omega 3.",
    price: 54999,
    category: "demo-cat-mascotas",
    isService: false,
    stock: 35,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.8,
    reviewCount: 47,
    media: [{ type: "image", url: img("photo-1589924691995-400dc9ecc119"), path: "demo/alimento" }],
  }),
  product("demo-prod-cucha", {
    name: "Cucha para mascotas acolchada",
    description: "Suave y lavable. Base antideslizante. Disponible en varios tamaños.",
    price: 42999,
    category: "demo-cat-mascotas",
    isService: false,
    stock: 20,
    condition: "nuevo",
    freeShipping: false,
    shippingCost: 3500,
    rating: 4.7,
    reviewCount: 15,
    media: [{ type: "image", url: img("photo-1591768575198-88dac53fbd0a"), path: "demo/cucha" }],
  }),
  product("demo-prod-perfume", {
    name: "Perfume importado 100ml",
    description: "Fragancia amaderada de larga duración. Presentación en estuche.",
    price: 74999,
    category: "demo-cat-belleza",
    isService: false,
    stock: 26,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.6,
    reviewCount: 20,
    media: [{ type: "image", url: img("photo-1541643600914-78b084683601"), path: "demo/perfume" }],
  }),
  product("demo-prod-secador", {
    name: "Secador de pelo iónico 2200W",
    description: "Tecnología iónica para menos frizz. Dos velocidades y difusor incluido.",
    price: 48999,
    category: "demo-cat-belleza",
    brand: "demo-brand-tech",
    isService: false,
    stock: 18,
    condition: "nuevo",
    freeShipping: true,
    rating: 4.5,
    reviewCount: 24,
    media: [{ type: "image", url: img("photo-1522338242992-e1a54906a8da"), path: "demo/secador" }],
  }),
  product("demo-serv-gasista", {
    name: "Gasista matriculado",
    description: "Instalación y reparación de estufas, calefones y termotanques. Habilitaciones.",
    price: 20000,
    category: "demo-cat-servicios",
    isService: true,
    stock: 99,
    freeShipping: true,
    rating: 4.9,
    reviewCount: 39,
    media: [{ type: "image", url: img("photo-1607472586893-edb57bdc0e39"), path: "demo/gasista" }],
  }),
  product("demo-serv-pintura", {
    name: "Pintura de interiores y exteriores",
    description: "Trabajos prolijos con materiales de primera. Presupuesto sin cargo.",
    price: 25000,
    category: "demo-cat-servicios",
    isService: true,
    stock: 99,
    freeShipping: true,
    rating: 4.7,
    reviewCount: 31,
    media: [{ type: "image", url: img("photo-1562259949-e8e7689d7828"), path: "demo/pintura" }],
  }),
  product("demo-serv-fletes", {
    name: "Fletes y mudanzas",
    description: "Traslados dentro y fuera de la ciudad. Personal para carga y descarga.",
    price: 30000,
    category: "demo-cat-servicios",
    isService: true,
    stock: 99,
    freeShipping: true,
    rating: 4.6,
    reviewCount: 27,
    media: [{ type: "image", url: img("photo-1600585152220-90363fe7e115"), path: "demo/fletes" }],
  }),
  product("demo-serv-jardineria", {
    name: "Jardinería y parquización",
    description: "Corte de césped, poda y diseño de jardines. Mantenimiento mensual.",
    price: 17000,
    category: "demo-cat-servicios",
    isService: true,
    stock: 99,
    freeShipping: true,
    rating: 4.8,
    reviewCount: 22,
    media: [{ type: "image", url: img("photo-1416879595882-3373a0480b5b"), path: "demo/jardineria" }],
  }),
]

export function getDemoProduct(productId: string): DemoProduct | undefined {
  return demoProducts.find((product) => product.id === productId)
}

export function getDemoCategory(categoryId: string): DemoCategory | undefined {
  return demoCategories.find((category) => category.id === categoryId)
}

export function getDemoBrand(brandId: string): DemoBrand | undefined {
  return demoBrands.find((brand) => brand.id === brandId)
}

export function getDemoSeller(sellerId: string): DemoSeller | undefined {
  if (sellerId === DEMO_SELLER_ID) return demoSeller
  return undefined
}

export function getDemoProductsByCategory(categoryId: string): DemoProduct[] {
  return demoProducts.filter((product) => product.category === categoryId)
}

export function getDemoServices(): DemoProduct[] {
  return demoProducts.filter((product) => product.isService)
}

export function getDemoPhysicalProducts(): DemoProduct[] {
  return demoProducts.filter((product) => !product.isService)
}

export function getDemoRelatedProducts(productId: string, categoryId: string): DemoProduct[] {
  return demoProducts.filter((product) => product.category === categoryId && product.id !== productId).slice(0, 6)
}

export function isDemoProductId(productId: string): boolean {
  return productId.startsWith("demo-")
}

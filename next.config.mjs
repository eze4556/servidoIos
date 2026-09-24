import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

// CAPACITOR=1 produce el bundle estático que se empaqueta dentro del APK.
// Sin la variable, el build es el normal con SSR y rutas de API para Vercel.
const isCapacitor = process.env.CAPACITOR === "1"

/** @type {import('next').NextConfig} */
const baseConfig = {
  // Evita chunks server rotos (vendor-chunks/@firebase.js) en dev tras builds parciales
  serverExternalPackages: [
    "firebase",
    "firebase-admin",
    "@firebase/app",
    "@firebase/auth",
    "@firebase/firestore",
    "@firebase/storage",
  ],
  transpilePackages: ["@imgly/background-removal", "onnxruntime-web"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  trailingSlash: false,
}

/** @type {import('next').NextConfig} */
const webConfig = {
  ...baseConfig,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/v0/b/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Evita que el navegador/CDN guarde HTML viejo al recargar (F5)
        source: "/((?!_next/static|_next/image|api|images|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ]
  },
}

/** @type {import('next').NextConfig} */
const capacitorConfig = {
  ...baseConfig,
  output: "export",
  // Con output: "export" el sitio estático queda en el propio distDir, así que
  // se apunta directo a out/, que es lo que lee capacitor.config.ts. Mantenerlo
  // separado de .next evita pisar la caché del build web.
  distDir: "out",
  // Dentro del APK no hay servidor que optimice imágenes ni aplique headers.
  images: { unoptimized: true },
  // Genera out/product/index.html en lugar de out/product.html. El WebView de
  // Android resuelve el index de un directorio, pero no prueba agregar ".html"
  // a la ruta pedida, así que sin esto las pantallas darían pantalla en blanco.
  trailingSlash: true,
}

export default withNextIntl(isCapacitor ? capacitorConfig : webConfig)

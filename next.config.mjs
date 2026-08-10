import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita chunks server rotos (vendor-chunks/@firebase.js) en dev tras builds parciales
  serverExternalPackages: [
    "firebase",
    "firebase-admin",
    "@firebase/app",
    "@firebase/auth",
    "@firebase/firestore",
    "@firebase/storage",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  trailingSlash: false,
  async headers() {
    return [
      {
        // Evita que el navegador/CDN guarde HTML viejo al recargar (F5)
        source: '/((?!_next/static|_next/image|api|images|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)

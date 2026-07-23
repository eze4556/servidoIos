import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/contexts/cart-context"
import { FoodCartProvider } from "@/contexts/food-cart-context"
import { AuthProvider } from "@/contexts/auth-context"
import { LocationProvider } from "@/contexts/location-context"
import { CacheProvider } from "@/contexts/cache-context"
import { AppChrome } from "@/components/layout/app-chrome"
import { NProgressProvider } from "@/components/providers/nprogress-provider"
import { SafeArea } from "@/components/ui/safe-area"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Servido - Marketplace de Productos y Servicios",
  description: "Compra y vende productos y servicios en el marketplace más completo de Argentina. Conectamos compradores con vendedores de calidad.",
  generator: 'Next.js',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  openGraph: {
    title: 'Servido - Marketplace de Productos y Servicios',
    description: 'Estamos trabajando para ofrecerte la mejor experiencia. Muy pronto podrás encontrar miles de productos, servicios y comercios en Argentina.',
    url: 'https://www.servido.com.ar',
    siteName: 'Servido',
    images: [
      {
        url: '/images/logo-512.png',
        width: 512,
        height: 512,
        alt: 'Servido Logo'
      }
    ],
    locale: 'es_AR',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Servido - Marketplace de Productos y Servicios',
    description: 'Estamos trabajando para ofrecerte la mejor experiencia. Muy pronto podrás encontrar miles de productos, servicios y comercios en Argentina.',
    images: ['/images/logo-512.png']
  },
  icons: {
    icon: [
      { url: '/images/logo-128.png', sizes: '128x128', type: 'image/png' },
      { url: '/images/logo-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/logo-512.png', sizes: '512x512', type: 'image/png' }
    ]
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} flex min-h-full flex-col`}>
        <NProgressProvider>
          <CacheProvider>
            <AuthProvider>
              <LocationProvider>
                <CartProvider>
                  <FoodCartProvider>
                    <SafeArea>
                      <AppChrome>{children}</AppChrome>
                      <Toaster />
                    </SafeArea>
                  </FoodCartProvider>
                </CartProvider>
              </LocationProvider>
            </AuthProvider>
          </CacheProvider>
        </NProgressProvider>
      </body>
    </html>
  )
}

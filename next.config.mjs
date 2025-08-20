/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
  trailingSlash: false,
  async rewrites() {
    return [
      {
        source: '/api/mercadopago/:path*',
        destination: 'https://5318-2803-9800-b8ca-7f5c-250c-fcf5-7ea3-8941.ngrok-free.app/:path*',
        basePath: false
      }
    ]
  }
}

export default nextConfig

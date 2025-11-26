/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  typescript: {
    // Enable strict type checking
    tsconfigPath: './tsconfig.json',
  },
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    resolveAlias: {
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    },
  },
}

module.exports = nextConfig
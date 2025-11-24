/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true, // Cache Components support
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
}

module.exports = nextConfig
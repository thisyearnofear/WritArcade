/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true, // Partial Pre-Rendering
    reactCompiler: true, // React Compiler for auto-memoization
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  typescript: {
    // Enable strict type checking
    tsconfigPath: './tsconfig.json',
  },
}

module.exports = nextConfig
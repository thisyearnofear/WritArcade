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
  webpack: (config) => {
    config.ignoreWarnings = [
      ...config.ignoreWarnings || [],
      // Ignore pino/thread-stream test files
      /thread-stream\/test/,
    ]
    return config
  },
}

module.exports = nextConfig
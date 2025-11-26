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
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      ...config.ignoreWarnings || [],
      // Ignore pino/thread-stream test files
      /thread-stream\/test/,
      // Ignore MetaMask SDK React Native warnings
      /Can't resolve '@react-native-async-storage\/async-storage'/,
      /Can't resolve 'pino-pretty'/,
    ]

    // Suppress React Native module resolution for browser builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
      }
    }

    return config
  },
}

module.exports = nextConfig
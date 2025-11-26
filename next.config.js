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
    // Exclude test files and unnecessary files from bundle
    config.module.rules.push({
      test: /node_modules\/@wagmi\/connectors\/node_modules\/thread-stream\/(test|bench)/,
      use: 'null-loader'
    });
    return config;
  },
  experimental: {
    turbotrace: {
      logLevel: 'error'
    }
  }
}

module.exports = nextConfig
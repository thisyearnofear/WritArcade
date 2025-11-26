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
    // Exclude test files and unnecessary files from bundle
    config.module.rules.push({
      test: /\.(test|spec)\.(js|ts)$/,
      use: 'null-loader'
    });
    // Also exclude thread-stream test directory entirely
    config.module.rules.push({
      test: /thread-stream\/test/,
      use: 'null-loader'
    });
    return config;
  }
}

module.exports = nextConfig
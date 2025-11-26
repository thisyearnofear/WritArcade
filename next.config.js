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
    tsconfigPath: './tsconfig.json',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    config.module.rules.push({
      test: /\.(test|spec)\.(js|ts|mjs)$/,
      loader: 'ignore-loader',
    });
    
    config.module.rules.push({
      test: /node_modules\/@wagmi\/connectors\/node_modules\/thread-stream\/(test|bench)/,
      loader: 'ignore-loader',
    });
    
    return config;
  },
}

module.exports = nextConfig
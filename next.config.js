/** @type {import('next').NextConfig} */

// Hetzner backend for heavy API routes (image gen, audio gen, balance)
const API_BACKEND_URL = process.env.API_BACKEND_URL || 'https://api.snel.famile.xyz/writersarcade'

const nextConfig = {
  output: 'standalone',
  // ── Mezo Passport compatibility ──────────────────────────────────────────
  // The Mezo Passport ecosystem ships some packages with raw, untranspiled
  // TypeScript (`main: "index.ts"`).  `transpilePackages` tells Next/SWC to
  // transpile them like our own source code, so webpack can consume them.
  transpilePackages: [
    '@mezo-org/orangekit-contracts',      // ABI constants, ships raw .ts
    '@mezo-org/orangekit-smart-account',  // chains/utils ship raw .ts; deep-imported by orangekit dist
    '@mezo-org/orangekit',                // ESM dist that deep-imports raw .ts above
  ],
  // Web3Provider is dynamically imported with `ssr: false` (see
  // ClientProvidersLoader), so the Mezo Passport graph never runs at
  // prerender. The list below covers a few packages that other server-side
  // code might still touch (RainbowKit theme imports, wagmi connectors).
  // Note: @mezo-org/* must NOT appear here when listed in transpilePackages.
  serverExternalPackages: [
    '@rainbow-me/rainbowkit',
    '@wagmi/connectors',
  ],
  async rewrites() {
    return {
      // beforeFiles rewrites run before Next.js API routes — ensures Hetzner backend takes priority
      beforeFiles: [
        { source: '/api/generate-image', destination: `${API_BACKEND_URL}/api/generate-image` },
        { source: '/api/generate-image/:path*', destination: `${API_BACKEND_URL}/api/generate-image/:path*` },
        { source: '/api/generate-audio', destination: `${API_BACKEND_URL}/api/generate-audio` },
        { source: '/api/user/balance', destination: `${API_BACKEND_URL}/api/user/balance` },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
  images: {
    // Scoped remotePatterns — avoids the wildcard '**' security footgun that
    // allows any HTTPS image to be proxied/optimised through our Next.js server.
    // Add new hostnames here as image sources are introduced.
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: '*.ipfs.io' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: '*.pinata.cloud' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: '*.nft.storage' },
      { protocol: 'https', hostname: '*.venice.ai' },
      { protocol: 'https', hostname: '*.openai.com' },
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
      { protocol: 'https', hostname: '*.paragraph.xyz' },
      { protocol: 'https', hostname: 'paragraph.xyz' },
      { protocol: 'https', hostname: '*.vercel.app' },
      // Story Protocol media
      { protocol: 'https', hostname: '*.storyprotocol.xyz' },
    ],
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  experimental: {
    optimizeCss: false, // Disable CSS optimization that may cause issues
  },
  webpack: (config, { webpack, isServer }) => {
    // Ignore test files from problematic dependencies
    config.module.rules.push({
      test: /\.(test|spec)\.(js|ts|mjs)$/,
      loader: 'ignore-loader',
    });

    config.module.rules.push({
      test: /node_modules\/(thread-stream|pino)\/.*\.(test|spec|indexes)/,
      loader: 'ignore-loader',
    });

    // Stub out the problematic baseAccount connector (wagmi/connectors).
    // We don't use Coinbase Smart Wallet's baseAccount; this avoids the `ox`
    // import compatibility issue at build time.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@wagmi\/connectors\/dist\/esm\/baseAccount\.js$/,
        require.resolve('./webpack-stubs/baseAccount-stub.js')
      )
    );

    if (!isServer) {
      // ── CLIENT bundle ─────────────────────────────────────────────
      // Force a single React instance for the entire client bundle so
      // packages that bundle their own React copy (e.g. @mezo-org/mezo-clay
      // which ships a vendored baseui) don't end up with two React copies
      // (the classic ReactCurrentOwner / ReactCurrentDispatcher crash).
      const path = require('path');
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      };
    }

    return config;
  },
}

module.exports = nextConfig

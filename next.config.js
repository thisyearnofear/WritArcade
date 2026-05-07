/** @type {import('next').NextConfig} */

// Hetzner backend for heavy API routes (image gen, audio gen, balance)
const API_BACKEND_URL = process.env.API_BACKEND_URL || 'https://api.snel.famile.xyz/writersarcade'

const nextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    // These packages use ESM bare directory imports or bundle their own React copy.
    // Marking them external prevents SSR prerender crashes.
    '@mezo-org/passport',
    '@mezo-org/orangekit',
    '@mezo-org/orangekit-contracts',
    '@mezo-org/orangekit-smart-account',
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
  webpack: (config, { webpack }) => {
    // Ignore test files from problematic dependencies
    config.module.rules.push({
      test: /\.(test|spec)\.(js|ts|mjs)$/,
      loader: 'ignore-loader',
    });
    
    config.module.rules.push({
      test: /node_modules\/(thread-stream|pino)\/.*\.(test|spec|indexes)/,
      loader: 'ignore-loader',
    });

    // Stub out the problematic baseAccount connector since we're not using it
    // This avoids the ox import compatibility issue
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@wagmi\/connectors\/dist\/esm\/baseAccount\.js$/,
        require.resolve('./webpack-stubs/baseAccount-stub.js')
      )
    );

    // Treat Mezo orangekit packages as external - they use advanced TS features webpack can't parse
    // Also treat @metamask/sdk as external in the CLIENT bundle to prevent it bundling
    // its own React copy which causes "ReactCurrentOwner" duplicate-React runtime errors.
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push(function({ request }, callback) {
        if (request && (
          request.includes('@mezo-org/orangekit-contracts') ||
          request.includes('@mezo-org/orangekit-smart-account') ||
          request.includes('@mezo-org/orangekit') ||
          request.includes('@metamask/sdk')
        )) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      });
    }

    return config;
  },
}

module.exports = nextConfig

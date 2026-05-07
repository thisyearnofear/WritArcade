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
    '@mezo-org/mezo-clay',
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

    // Stub out the problematic baseAccount connector since we're not using it
    // This avoids the ox import compatibility issue
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@wagmi\/connectors\/dist\/esm\/baseAccount\.js$/,
        require.resolve('./webpack-stubs/baseAccount-stub.js')
      )
    );

    if (isServer) {
      // ── SERVER builds ──────────────────────────────────────────────
      // Node.js has require(), so commonjs externals are safe here.
      // These packages use ESM bare directory imports or bundle their own
      // React copy — externalizing avoids SSR prerender crashes.
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(function({ request }, callback) {
          if (request && (
            request.includes('@mezo-org/orangekit-contracts') ||
            request.includes('@mezo-org/orangekit-smart-account') ||
            request.includes('@mezo-org/orangekit') ||
            request.includes('@mezo-org/mezo-clay') ||
            request.includes('@metamask/sdk')
          )) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        });
      }
    } else {
      // ── CLIENT builds ─────────────────────────────────────────────
      // The browser has no require(). Using "commonjs" externals in the
      // client bundle generates require() calls → ReferenceError crash.
      // Instead:
      //   1. Stub @metamask/sdk so it never enters the bundle (it bundles
      //      its own React copy causing ReactCurrentOwner errors).
      //   2. Force a single React instance via resolve.alias so that any
      //      @mezo-org/* packages that get bundled all use the same React.

      // ① Stub packages that ship untranspiled TypeScript or bundle their
      //    own React copy, which would crash the client bundle.
      //    Using resolve.alias (not NormalModuleReplacementPlugin) because
      //    NormalModuleReplacementPlugin matches resolved absolute paths, not
      //    bare specifiers, and the pnpm virtual-store layout makes the path
      //    unpredictable.
      //
      //    On the server side these are handled by serverExternalPackages and
      //    the commonjs externals callback above.
      const path = require('path');
      config.resolve.alias = {
        ...config.resolve.alias,
        // @metamask/sdk bundles its own React → duplicate React → ReactCurrentOwner
        '@metamask/sdk': require.resolve('./webpack-stubs/metamask-sdk-stub.js'),
        // @mezo-org/orangekit-contracts ships raw index.ts → webpack can't parse
        '@mezo-org/orangekit-contracts': require.resolve('./webpack-stubs/orangekit-contracts-stub.js'),
        // @mezo-org/orangekit-smart-account has untranspiled TS in re-exports
        '@mezo-org/orangekit-smart-account': require.resolve('./webpack-stubs/orangekit-smart-account-stub.js'),
        // @mezo-org/orangekit umbrella: must also be stubbed because it uses
        // deep import paths (e.g. orangekit-smart-account/src/lib/utils/chains)
        // that bypass the bare-specifier aliases for the sub-packages above.
        '@mezo-org/orangekit': require.resolve('./webpack-stubs/orangekit-stub.js'),
        // ② Force a single React instance for the entire client bundle.
        //    Any remaining packages that get bundled and depend on React
        //    will use this single copy, preventing duplicate-React errors.
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      };
    }

    return config;
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */

// Hetzner backend for heavy API routes (image gen, audio gen, balance)
const API_BACKEND_URL = process.env.API_BACKEND_URL || 'https://api.snel.famile.xyz/writersarcade'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withSentryConfig } = require('@sentry/nextjs');

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
    // pdfmake must run as a Node package so it can use PDFKit streams.
    // Bundling it with webpack causes `TypeError: b.on is not a function` at runtime.
    'pdfmake',
  ],
  async headers() {
    return [
      {
        // /embed is the only frameable surface — the customer-site iframe player
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
      {
        // Everything else denies framing (clickjacking hardening).
        // /mini-app is exempt — Farcaster clients render it inside an iframe/webview.
        source: '/((?!embed|mini-app).*)',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
  async rewrites() {
    return {
      // beforeFiles rewrites run before Next.js API routes — ensures Hetzner backend takes priority
      beforeFiles: [
        { source: '/api/generate-image', destination: `${API_BACKEND_URL}/api/generate-image` },
        { source: '/api/generate-image/:path*', destination: `${API_BACKEND_URL}/api/generate-image/:path*` },
        { source: '/api/generate-audio', destination: `${API_BACKEND_URL}/api/generate-audio` },
        { source: '/api/user/balance', destination: `${API_BACKEND_URL}/api/user/balance` },
        { source: '/api/cdr/vault', destination: `${API_BACKEND_URL}/api/cdr/vault` },
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

    // The @piplabs/cdr-crypto Emscripten loader does `await import('node:module')`
    // and `require('node:fs' | 'node:url' | 'node:path')`. Webpack 5 throws
    // `UnhandledSchemeError` on `node:` URIs before any resolver runs, so we
    // rewrite `node:foo` → `foo` and then stub the bare names. The calls are
    // guarded by `if (ENVIRONMENT_IS_NODE)` in the loader and are never reached
    // in the browser.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      module: false,
      fs: false,
      path: false,
      crypto: false,
      url: false,
    };

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
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        // Stub @mezo-org/mezo-clay: baseui/styletron use React 18 internals
        // (__SECRET_INTERNALS) and trigger "Rendered more hooks" (#310) under
        // React 19's concurrent renderer. The app never renders passport's
        // Dropdown/ConnectedTrigger — it uses its own UserMenu — so these
        // UI stubs are never actually called at runtime.
        '@mezo-org/mezo-clay': path.resolve(__dirname, 'webpack-stubs/mezo-clay-stub.js'),
      };
    }

    return config;
  },
}

// Sentry is only wired into the build when a DSN is configured, so local
// development and CI without Sentry env vars are unaffected.
const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)

module.exports = sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      // Only upload sourcemaps when an auth token is available (CI/Vercel)
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig

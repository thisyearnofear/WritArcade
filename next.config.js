/** @type {import('next').NextConfig} */
const nextConfig = {
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
  webpack: (config, { _isServer, webpack }) => {
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

    return config;
  },
}

module.exports = nextConfig

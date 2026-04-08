/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: [
    '@defi-intent/shared',
    '@defi-intent/intent-engine',
    '@defi-intent/protocol-adapters',
    '@defi-intent/yield',
    '@defi-intent/liquidator',
    '@defi-intent/hyperliquid',
    '@defi-intent/mev',
    '@defi-intent/bundler',
  ],
  webpack: (config, { isServer }) => {
    // Handle node modules that don't work in browser
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      crypto: false,
    };
    
    // Externalize problematic modules for server
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // Fix for @metamask/sdk react-native dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': require.resolve('./lib/empty-module.js'),
    };
    
    return config;
  },
};

module.exports = nextConfig;

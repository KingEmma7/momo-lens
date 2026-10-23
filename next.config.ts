import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  // Strict ESLint 10 runs explicitly in CI; Next 15's bundled lint runner targets older ESLint.
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  webpack(config) {
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default config;

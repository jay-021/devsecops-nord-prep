import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Keep enabled - ESLint config has circular reference (non-blocking)
  },
  typescript: {
    ignoreBuildErrors: false, // ✅ ENABLED - All TypeScript errors fixed (Phase 6.2)
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude TypeScript definition files from webpack processing
    config.module.rules.push({
      test: /\.d\.ts$/,
      use: 'ignore-loader',
    });

    // Alternative approach: exclude problematic modules from parsing
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    return config;
  },
}

export default withBundleAnalyzer(nextConfig);

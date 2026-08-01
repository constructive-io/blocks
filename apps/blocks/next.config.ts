import path from 'node:path';
import type { NextConfig } from 'next';

const isPagesBuild = process.env.BLOCKS_PAGES === '1';

const nextConfig: NextConfig = {
  ...(process.env.CONSOLE_KIT_INTEGRATION === '1'
    ? { allowedDevOrigins: ['127.0.0.1'] }
    : {}),
  ...(isPagesBuild
    ? {
        output: 'export',
        basePath: '/blocks',
        assetPrefix: '/blocks',
        trailingSlash: true,
        images: { unoptimized: true }
      }
    : {}),
  transpilePackages: ['@constructive-io/ui'],
  experimental: {
    // Do not include @constructive-io/ui: subpath exports like /ai, /tabs, /button
    // break under optimizePackageImports (client components resolve to undefined → blank page).
    optimizePackageImports: ['@base-ui/react', 'lucide-react'],
  },
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
};

export default nextConfig;

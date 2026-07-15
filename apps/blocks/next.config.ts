import path from 'node:path';
import type { NextConfig } from 'next';

const isPagesBuild = process.env.BLOCKS_PAGES === '1';

const nextConfig: NextConfig = {
  ...(isPagesBuild
    ? {
        output: 'export',
        basePath: '/blocks',
        assetPrefix: '/blocks',
        trailingSlash: true,
        images: { unoptimized: true }
      }
    : {}),
  // Transpile both public workspace packages while developing from source.
  transpilePackages: ['@constructive-io/ui', '@constructive-io/schema-builder'],
  experimental: {
    optimizePackageImports: ['@base-ui/react', '@constructive-io/ui', '@constructive-io/schema-builder', 'lucide-react'],
  },
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
};

export default nextConfig;

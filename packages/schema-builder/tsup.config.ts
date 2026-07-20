import { defineConfig } from 'tsup';

const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@constructive-io/ui',
  /^@constructive-io\/ui\//,
  '@tanstack/react-query',
  '@dnd-kit/core',
  '@dnd-kit/utilities',
  '@fluentui/react-context-selector',
  '@pgsql/types',
  '@remixicon/react',
  'lucide-react',
  'motion',
  'motion/react',
  'node-type-registry',
  'pg-ast',
  'zustand',
  'zustand/vanilla',
  'zustand/react'
];

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    fields: 'src/fields/index.ts',
    relationships: 'src/relationships/index.ts',
    indexes: 'src/indexes/index.ts',
    policies: 'src/policies/index.ts',
    tables: 'src/tables/index.ts',
    testing: 'src/testing.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external,
  onSuccess: 'tsx scripts/add-use-client-banner.ts',
  esbuildOptions(options) {
    options.sourcesContent = false;
  },
  banner: {
    js: "'use client';"
  }
});

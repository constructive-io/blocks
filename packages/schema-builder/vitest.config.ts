import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const srcRoot = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@/blocks/schema/schema-builder-core/context/block-config',
        replacement: `${srcRoot}/compat/block-config.tsx`
      },
      { find: '@/generated/schema-builder', replacement: `${srcRoot}/compat/schema-builder-sdk.ts` },
      { find: '@/generated/auth/hooks', replacement: `${srcRoot}/compat/auth-sdk.ts` },
      { find: '@/generated/admin/hooks', replacement: `${srcRoot}/compat/admin-sdk.ts` },
      { find: '@/generated/modules/hooks/client', replacement: `${srcRoot}/compat/modules-client.ts` },
      {
        find: '@/generated/modules/hooks/queries/useRelationProvisionsQuery',
        replacement: `${srcRoot}/compat/relation-provisions.ts`
      },
      { find: '@/generated/modules', replacement: `${srcRoot}/compat/modules-sdk.ts` },
      { find: /^@\/blocks\/schema\/(.*)$/, replacement: `${srcRoot}/schema/$1` },
      { find: '@/lib/utils', replacement: `${srcRoot}/lib/utils.ts` }
    ]
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}']
  }
});

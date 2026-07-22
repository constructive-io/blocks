import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';

/**
 * Replaces CJS-only `use-sync-external-store` with ESM re-exports from React.
 * React 18+ ships useSyncExternalStore natively — the shim package is only
 * needed for React <18. Bundling the CJS shim produces require() calls that
 * Turbopack SSR rejects.
 */
const useSyncExternalStoreESM: Plugin = {
	name: 'use-sync-external-store-esm',
	setup(build) {
		// Shim: re-export from React
		build.onResolve({ filter: /^use-sync-external-store\/shim$/ }, (args) => ({
			path: args.path,
			namespace: 'use-sync-esm',
		}));
		build.onLoad({ filter: /.*/, namespace: 'use-sync-esm' }, () => ({
			contents: `export { useSyncExternalStore } from 'react';`,
			loader: 'js',
		}));

		// With-selector: inline the tiny utility (not in React itself)
		build.onResolve(
			{ filter: /^use-sync-external-store\/shim\/with-selector$/ },
			(args) => ({ path: args.path, namespace: 'use-sync-esm-sel' }),
		);
		build.onLoad({ filter: /.*/, namespace: 'use-sync-esm-sel' }, () => ({
			contents: `
import { useSyncExternalStore, useRef, useCallback, useMemo } from 'react';
export function useSyncExternalStoreWithSelector(
  subscribe, getSnapshot, getServerSnapshot, selector, isEqual
) {
  const instRef = useRef(null);
  let inst;
  if (instRef.current === null) {
    inst = { hasValue: false, value: null };
    instRef.current = inst;
  } else {
    inst = instRef.current;
  }
  const getSelection = useMemo(() => {
    let memoizedSnapshot;
    let memoizedSelection;
    const memoizedSelector = (nextSnapshot) => {
      if (memoizedSnapshot !== undefined && memoizedSnapshot === nextSnapshot) {
        return memoizedSelection;
      }
      const nextSelection = selector(nextSnapshot);
      if (inst.hasValue) {
        const currentSelection = inst.value;
        if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
          memoizedSnapshot = nextSnapshot;
          return currentSelection;
        }
      }
      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      inst.hasValue = true;
      inst.value = nextSelection;
      return nextSelection;
    };
    return [() => memoizedSelector(getSnapshot()), getServerSnapshot ? () => memoizedSelector(getServerSnapshot()) : undefined];
  }, [getSnapshot, getServerSnapshot, selector, isEqual]);
  const value = useSyncExternalStore(subscribe, getSelection[0], getSelection[1]);
  return value;
}`,
			loader: 'js',
		}));
	},
};

/**
 * Vendor build — bundles all dependencies (data, ui, remixicon, etc.)
 * into a single self-contained dist. Only host-provided peer deps are external.
 *
 * Usage: pnpm tsup --config tsup.vendor.config.ts
 */
export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	platform: 'browser',
	target: 'es2022',
	sourcemap: true,
	clean: true,
	treeshake: true,
	splitting: false,
	outDir: 'dist-vendor',
	external: [
		// Only externalize what the host app provides
		'react',
		'react-dom',
		'react/jsx-runtime',
		'@tanstack/react-query',
		'@tanstack/react-form',
	],
	noExternal: [
		// Bundle these INTO the vendor dist
		'@constructive-io/data',
		'@constructive-io/ui',
		'@remixicon/react',
		'lucide-react',
		'@internationalized/date',
		'@tanstack/react-virtual',
		'react-aria-components',
		'motion',
		'clsx',
		'graphql',
		'inflekt',
		'tailwind-merge',
		'zod',
		'zustand',
	],
	env: { NODE_ENV: 'production' },
	esbuildPlugins: [useSyncExternalStoreESM],
	banner: { js: '"use client";' },
});

/**
 * The real exports of a dynamically imported package, whatever shape the bundler
 * gives it. A CommonJS or UMD package (leaflet 1.9 ships only a UMD `main`) can
 * arrive as a namespace whose only member is `default`; an ES module arrives with
 * its named exports. A namespace that has named exports is used as it is, even when
 * it also has a default export.
 */
export function moduleExports<T extends object>(namespace: T): T {
	const named = Object.keys(namespace).filter((key) => key !== 'default' && key !== '__esModule');
	if (named.length > 0) return namespace;
	const inner: unknown = (namespace as { default?: unknown }).default;
	if ((typeof inner === 'object' && inner !== null) || typeof inner === 'function') return inner as T;
	return namespace;
}

// Vendored from @constructive-io/sheets — trimmed to the surface the schema-builder blocks use. Do not edit to track upstream.

export type DashboardCacheScopeKey = { databaseId: string; endpoint: string };

export function isDashboardCacheScopeKey(value: unknown): value is DashboardCacheScopeKey {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return 'databaseId' in candidate && 'endpoint' in candidate;
}

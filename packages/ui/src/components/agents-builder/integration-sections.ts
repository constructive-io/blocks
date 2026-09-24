import type { Integration, IntegrationCategory } from './types';

export type IntegrationScope = 'all' | 'connected';

export type IntegrationSection = { id: string; label: string; items: Integration[] };

type SectionOptions = {
	scope: IntegrationScope;
	query: string;
	isConnected: (id: string) => boolean;
};

function matchesQuery(integration: Integration, term: string) {
	return `${integration.name} ${integration.description} ${integration.vendor}`.toLowerCase().includes(term);
}

/**
 * Groups the directory into sections. Browsing everything leads with a
 * Recommended section and keeps those apps out of their categories; filtering
 * (connected only, or a search) lists every match in its category, with model
 * providers last.
 */
export function buildIntegrationSections(
	integrations: Integration[],
	categories: IntegrationCategory[],
	{ scope, query, isConnected }: SectionOptions,
): IntegrationSection[] {
	const term = query.trim().toLowerCase();
	const browsing = scope === 'all' && !term;
	const recommended: Integration[] = [];
	const grouped = new Map<string, Integration[]>();

	for (const integration of integrations) {
		if (scope === 'connected' && !isConnected(integration.id)) continue;
		if (term && !matchesQuery(integration, term)) continue;
		if (browsing && integration.recommended) {
			recommended.push(integration);
			continue;
		}
		const key = integration.categoryId ?? (browsing ? null : 'models');
		if (!key) continue;
		const group = grouped.get(key);
		if (group) group.push(integration);
		else grouped.set(key, [integration]);
	}

	return [
		{ id: 'recommended', label: 'Recommended', items: recommended },
		...categories.map((category) => ({ ...category, items: grouped.get(category.id) ?? [] })),
		{ id: 'models', label: 'Models', items: grouped.get('models') ?? [] },
	].filter((section) => section.items.length > 0);
}

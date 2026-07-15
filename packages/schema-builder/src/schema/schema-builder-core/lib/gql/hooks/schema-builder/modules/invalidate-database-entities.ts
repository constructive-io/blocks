import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { isDashboardCacheScopeKey } from '../../dashboard/dashboard-query-keys';

import { blueprintTemplateKeys } from '@/generated/modules';
import { apiKeys, domainKeys, schemaKeys, siteKeys } from '@/generated/schema-builder';
import { databasePoliciesQueryKeys } from '../policies/use-database-policies';
import { accessibleDatabasesQueryKeys } from '../use-accessible-databases';
import { databaseConstraintsQueryKeys } from '../use-database-constraints';
import { databaseTablesQueryKeys } from '../use-database-tables';
import { userDatabasesQueryKeys } from '../use-user-databases';

const invalidateQueryKey = (queryClient: QueryClient, queryKey: QueryKey) =>
	queryClient.invalidateQueries({ queryKey });

function invalidateDashboardQueries(queryClient: QueryClient, databaseId?: string | null) {
	const matchesDashboard = (queryKey: readonly unknown[]): boolean => {
		const [root, scope] = queryKey as unknown[];
		if (root !== 'sheets') return false;
		if (!databaseId) return true;
		return isDashboardCacheScopeKey(scope) && scope.databaseId === databaseId;
	};

	// 1. REMOVE schema queries (meta + relations) — force fresh fetch, no stale data.
	//    This prevents stale-while-revalidate from showing wrong columns/tables after schema changes.
	queryClient.removeQueries({
		predicate: (query) => {
			if (!matchesDashboard(query.queryKey)) return false;
			const type = query.queryKey[2];
			return type === 'meta' || type === 'relations';
		},
	});

	// 2. INVALIDATE data queries (rows, counts) — stale-while-revalidate is fine for row data
	return queryClient.invalidateQueries({
		predicate: (query) => matchesDashboard(query.queryKey),
	});
}

export async function invalidateDatabaseEntities(queryClient: QueryClient, databaseId?: string | null) {
	const tasks: Array<Promise<unknown>> = [];
	tasks.push(invalidateQueryKey(queryClient, ['@constructive-io/schema-builder']));

	if (databaseId) {
		tasks.push(invalidateQueryKey(queryClient, databaseTablesQueryKeys.byDatabase(databaseId)));
		tasks.push(invalidateQueryKey(queryClient, databasePoliciesQueryKeys.byDatabase(databaseId)));
		tasks.push(invalidateQueryKey(queryClient, domainKeys.lists()));
		// These queries use the table id or other params; the prefix ensures all cached tables refresh.
		tasks.push(invalidateQueryKey(queryClient, ['database-table']));
	}

	// Dashboard/CRM queries (secondary auth /data). These are scoped by { databaseId, endpoint }.
	tasks.push(invalidateDashboardQueries(queryClient, databaseId));

	// Global database context
	// CRITICAL: Must invalidate BOTH split query keys since useSchemaBuilderSelectors uses them
	tasks.push(invalidateQueryKey(queryClient, userDatabasesQueryKeys.all));
	tasks.push(invalidateQueryKey(queryClient, accessibleDatabasesQueryKeys.all));
	tasks.push(invalidateQueryKey(queryClient, databaseConstraintsQueryKeys.all));

	// SDK query keys (for hooks using generated SDK)
	tasks.push(invalidateQueryKey(queryClient, apiKeys.all));
	tasks.push(invalidateQueryKey(queryClient, schemaKeys.all));
	tasks.push(invalidateQueryKey(queryClient, siteKeys.all));
	tasks.push(invalidateQueryKey(queryClient, blueprintTemplateKeys.all));

	// Hand-written wrapper query keys (for hooks using fetchXxxQuery with custom keys)
	tasks.push(invalidateQueryKey(queryClient, databaseTablesQueryKeys.all));
	tasks.push(invalidateQueryKey(queryClient, databasePoliciesQueryKeys.all));
	tasks.push(invalidateQueryKey(queryClient, domainKeys.all));

	await Promise.allSettled(tasks);
}

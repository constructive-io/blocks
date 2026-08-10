/**
 * Hook for fetching app and membership capabilities
 * Tier 4 wrapper: Uses SDK hooks + cache invalidation
 */
import { useQuery } from '@tanstack/react-query';
import {
	schemaBuilderQueryKey,
	useAdminSdkClient,
	useSchemaBuilderRuntime,
} from '@/blocks/schema/schema-builder-core/context/block-config';

export interface CapabilityNode {
	bitnum: number | null;
	bitstr: string | null;
	description: string | null;
	id: string;
	name: string;
}

export type AppCapability = CapabilityNode;
export type MembershipCapability = CapabilityNode;

export const capabilitiesQueryKeys = {
	all: ['capabilities'] as const,
};

export interface UseCapabilitiesOptions {
	enabled?: boolean;
}

export function useCapabilities(options: UseCapabilitiesOptions = {}) {
	const isEnabled = options.enabled !== false;
	const { scope } = useSchemaBuilderRuntime();
	const { fetchAppCapabilitiesQuery, fetchOrgCapabilitiesQuery } = useAdminSdkClient();

	return useQuery<{ appCapabilities: AppCapability[]; membershipCapabilities: MembershipCapability[] }>({
		queryKey: schemaBuilderQueryKey(scope, 'policies', 'capabilities'),
		queryFn: async () => {
			// Fetch both capability types in parallel using SDK fetch functions
			const [appResult, orgResult] = await Promise.all([
				fetchAppCapabilitiesQuery({ selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true }, orderBy: ['NAME_ASC'] } }),
				fetchOrgCapabilitiesQuery({ selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true }, orderBy: ['NAME_ASC'] } }),
			]);

			const appCapabilities: AppCapability[] = (appResult.appCapabilities?.nodes ?? []).map((node) => ({
				id: node.id ?? '',
				name: node.name ?? '',
				bitnum: node.bitnum ?? null,
				bitstr: node.bitstr ?? null,
				description: node.description ?? null,
			}));

			const membershipCapabilities: MembershipCapability[] = (orgResult.orgCapabilities?.nodes ?? []).map((node) => ({
				id: node.id ?? '',
				name: node.name ?? '',
				bitnum: node.bitnum ?? null,
				bitstr: node.bitstr ?? null,
				description: node.description ?? null,
			}));

			return {
				appCapabilities,
				membershipCapabilities,
			};
		},
		enabled: isEnabled,
		staleTime: 5 * 60 * 1000,
		refetchOnMount: isEnabled,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
}

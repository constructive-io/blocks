import { Shield } from 'lucide-react';

import { POLICY_TYPE_UI_CONFIG } from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import { getDiagramTheme } from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/diagram-themes';
import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';

/** How one policy reads in the Policies view: its title, icon, description, colours, and diagram. */
export function policyPresentation(policy: DatabasePolicy, mode: 'light' | 'dark') {
	const known = policy.policyType !== null && policy.policyType in POLICY_TYPE_UI_CONFIG;
	const config = known ? POLICY_TYPE_UI_CONFIG[policy.policyType!] : undefined;
	return {
		title: config?.fallbackTitle ?? policy.policyType ?? policy.name ?? 'Policy',
		description: config?.description,
		Icon: config?.icon ?? Shield,
		theme: getDiagramTheme(known ? policy.policyType! : 'AuthzAllowAll', mode),
		/** Types without UI config have no diagram. */
		diagramKey: known ? policy.policyType : null,
		disabled: policy.disabled === true,
	};
}

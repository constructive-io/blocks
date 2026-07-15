'use client';

import { Pencil, Shield } from 'lucide-react';
import { useSchemaBuilderRuntime } from '@/blocks/schema/schema-builder-core/context/block-config';

import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { cn } from '@/lib/utils';
import { POLICY_TYPE_UI_CONFIG } from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import { getDiagramTheme } from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/diagram-themes';

interface PolicyPillProps {
	policy: DatabasePolicy;
	onClick: () => void;
}

function getPolicyThemeKey(policyType: string | null): string {
	if (!policyType) return 'AuthzAllowAll';
	return policyType in POLICY_TYPE_UI_CONFIG ? policyType : 'AuthzAllowAll';
}

export function PolicyPill({ policy, onClick }: PolicyPillProps) {
	const config = policy.policyType ? POLICY_TYPE_UI_CONFIG[policy.policyType] : null;
	const title = config?.fallbackTitle ?? policy.policyType ?? policy.name ?? 'Policy';
	const isDisabled = policy.disabled === true;

	// Get the policy type's icon, fallback to Shield
	const Icon = config?.icon ?? Shield;

	// Get the diagram theme colors for this policy type
	const { colorMode: resolvedTheme } = useSchemaBuilderRuntime();
	const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
	const themeKey = getPolicyThemeKey(policy.policyType);
	const theme = getDiagramTheme(themeKey, mode);

	// Make the background lighter by adding transparency
	const lighterBg = theme.fill + '80'; // 50% opacity

	return (
		<button
			type='button'
			onClick={onClick}
			className={cn(
				'group inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-1',
				'border text-xs font-semibold',
				`cursor-pointer transition-[scale,box-shadow] duration-150 ease-out
				motion-safe:active:scale-[0.96]`,
				'hover:scale-[1.02] hover:shadow-sm',
				'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
				isDisabled && 'opacity-60',
			)}
			style={{
				backgroundColor: lighterBg,
				borderColor: theme.border,
				color: theme.primary,
			}}
		>
			<Icon className='size-3 group-hover:hidden' style={{ color: theme.primary }} />
			<Pencil className='hidden size-3 group-hover:block' style={{ color: theme.primary }} />
			<span>{title}</span>
		</button>
	);
}

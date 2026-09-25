'use client';

import { Pencil } from 'lucide-react';
import { useSchemaBuilderRuntime } from '@/blocks/schema/schema-builder-core/context/block-config';

import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { focusRingClass } from '@constructive-io/ui/workspace-kit';
import { cn } from '@/lib/utils';
import { policyPresentation } from './policy-presentation';

interface PolicyPillProps {
	policy: DatabasePolicy;
	onClick: () => void;
}

/** One policy as a compact chip in its type's colours; hovering swaps the icon for the edit action. */
export function PolicyPill({ policy, onClick }: PolicyPillProps) {
	const { colorMode } = useSchemaBuilderRuntime();
	const { title, Icon, theme, disabled: isDisabled } = policyPresentation(policy, colorMode === 'dark' ? 'dark' : 'light');

	return (
		<button
			type='button'
			aria-label={`Edit ${title}${isDisabled ? ' (disabled)' : ''}`}
			onClick={(event) => {
				event.stopPropagation();
				onClick();
			}}
			className={cn(
				'group/pill inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium pointer-coarse:h-9',
				'motion-safe:active:scale-[0.97] transition-transform duration-(--duration-fast)',
				focusRingClass,
				isDisabled && 'opacity-60',
			)}
			style={{ backgroundColor: theme.fill + '4d', borderColor: theme.border, color: theme.primary }}
		>
			<Icon aria-hidden='true' className='size-3 group-hover/pill:hidden' />
			<Pencil aria-hidden='true' className='hidden size-3 group-hover/pill:block' />
			<span>{title}</span>
			{isDisabled ? <span className='text-[10px] font-normal uppercase opacity-80'>Off</span> : null}
		</button>
	);
}

'use client';

import { useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@constructive-io/ui/collapsible';
import { ChevronDown, Eye, Pencil, Plus, PlusCircle, Trash2 } from 'lucide-react';
import { useSchemaBuilderRuntime } from '@/blocks/schema/schema-builder-core/context/block-config';

import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { focusRingClass } from '@constructive-io/ui/workspace-kit';
import { cn } from '@/lib/utils';
import { POLICY_TYPE_UI_CONFIG } from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import { PolicyDiagramByKey } from '../../policies/policy-diagram/policy-diagram';
import { OPERATION_STYLES, type CrudOperation } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';

import { PolicyPill } from './policy-pill';
import { policyPresentation } from './policy-presentation';

const OPERATION_ICONS = {
	Plus: PlusCircle,
	Search: Eye,
	Pencil: Pencil,
	Trash2: Trash2,
} as const;

const OPERATION_DISPLAY_NAMES: Record<CrudOperation, string> = {
	read: 'Read',
	create: 'Create',
	update: 'Update',
	delete: 'Delete',
};

interface PolicyOperationGroupProps {
	operation: CrudOperation;
	policies: DatabasePolicy[];
	tableName: string;
	onPolicyClick: (policy: DatabasePolicy) => void;
	onAddClick: () => void;
}

export function PolicyOperationGroup({
	operation,
	policies,
	tableName,
	onPolicyClick,
	onAddClick,
}: PolicyOperationGroupProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { colorMode: resolvedTheme } = useSchemaBuilderRuntime();
	const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
	const style = OPERATION_STYLES[operation];
	const Icon = OPERATION_ICONS[style.iconName];

	// Filter out policies whose type is disabled in UI config
	const visiblePolicies = policies.filter((p) => !POLICY_TYPE_UI_CONFIG[p.policyType ?? '']?.disabled);
	const hasPolicies = visiblePolicies.length > 0;

	// Collapse when all policies are removed (adjusted during render, not in an effect).
	if (!hasPolicies && isOpen) setIsOpen(false);

	return (
		<Collapsible open={isOpen} onOpenChange={hasPolicies ? setIsOpen : undefined}>
			<div
				data-chat-component='policy-operation-group'
				data-chat-operation={operation}
				data-chat-policy-count={String(visiblePolicies.length)}
				data-chat-policy-types={visiblePolicies
					.map((p) => {
						const cfg = POLICY_TYPE_UI_CONFIG[p.policyType ?? ''];
						const label = cfg?.fallbackTitle ?? p.policyType ?? 'unknown';
						return `${label} (${p.policyType ?? 'unknown'})`;
					})
					.join(', ')}
				className='bg-card overflow-hidden rounded-xl shadow-card'
			>
				{/* Header row — operation, count, and actions; pills below */}
				<div className='px-4 py-3'>
					<div className='flex items-center gap-2.5'>
						<span className='bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-lg'>
							<Icon aria-hidden='true' className='size-3.5' />
						</span>
						<h3 className='text-foreground min-w-0 flex-1 text-[13px] font-medium'>
							{OPERATION_DISPLAY_NAMES[operation]}
							<span className='text-subtle-foreground ml-1.5 font-normal tabular-nums'>{visiblePolicies.length}</span>
						</h3>
						<div className='flex shrink-0 items-center gap-0.5'>
							<Button className='h-7 px-2 text-xs' onClick={onAddClick} size='sm' variant='ghost'>
								<Plus aria-hidden='true' className='size-3.5' />
								Add policy
							</Button>
							{hasPolicies ? (
								<CollapsibleTrigger asChild>
									<button
										type='button'
										aria-label={isOpen ? 'Hide policy details' : 'Show policy details'}
										className={cn(
											'text-muted-foreground hover:text-foreground hover:bg-overlay-hover grid size-7 cursor-pointer place-items-center rounded-md',
											focusRingClass,
										)}
									>
										<ChevronDown aria-hidden='true' className={cn('size-3.5 transition-transform duration-(--duration-moderate)', isOpen && 'rotate-180')} />
									</button>
								</CollapsibleTrigger>
							) : (
								<span aria-hidden='true' className='size-7' />
							)}
						</div>
					</div>

					{/* Pills — below the header row; the details replace them when expanded */}
					{isOpen ? null : (
						<div className='mt-2 flex flex-wrap items-center gap-1.5 pl-[38px]'>
							{hasPolicies ? (
								visiblePolicies.map((policy) => (
									<PolicyPill key={policy.id} onClick={() => onPolicyClick(policy)} policy={policy} />
								))
							) : (
								<span className='text-muted-foreground text-xs'>No policies yet</span>
							)}
						</div>
					)}
				</div>

				{/* Expanded diagrams */}
				{hasPolicies && (
					<CollapsibleContent innerClassName='px-4 pb-4 pt-0'>
						<div className='flex flex-col gap-2'>
							{visiblePolicies.map((policy) => (
								<PolicyDetailRow
									key={policy.id}
									mode={mode}
									onEdit={() => onPolicyClick(policy)}
									policy={policy}
									tableName={tableName}
								/>
							))}
						</div>
					</CollapsibleContent>
				)}
			</div>
		</Collapsible>
	);
}

/** An expanded policy: its diagram beside its title, description, and edit action. */
function PolicyDetailRow({
	policy,
	tableName,
	mode,
	onEdit,
}: {
	policy: DatabasePolicy;
	tableName: string;
	mode: 'light' | 'dark';
	onEdit: () => void;
}) {
	const { title, description, Icon, theme, diagramKey, disabled } = policyPresentation(policy, mode);
	return (
		<div
			className={cn('group/diagram flex w-full items-stretch overflow-hidden rounded-lg border text-left', disabled && 'opacity-60')}
			style={{ borderColor: theme.border }}
		>
			<div className='flex w-1/2 items-center justify-center p-3' style={{ backgroundColor: theme.fill + '30' }}>
				{diagramKey ? (
					<PolicyDiagramByKey config={(policy.data as Record<string, unknown>) ?? {}} diagramKey={diagramKey} tableName={tableName} />
				) : (
					<span className='text-muted-foreground text-[13px]'>{title}</span>
				)}
			</div>

			<div className='flex w-1/2 flex-col justify-center gap-1.5 px-4 py-3'>
				<div className='flex items-center justify-between gap-2'>
					<div className='flex min-w-0 items-center gap-2'>
						<span className='grid size-6 shrink-0 place-items-center rounded-md' style={{ backgroundColor: theme.fill, color: theme.primary }}>
							<Icon aria-hidden='true' className='size-3.5' />
						</span>
						<span className='truncate text-[13px] font-medium' style={{ color: theme.primary }}>
							{title}
						</span>
						{disabled ? <span className='text-muted-foreground text-[10px] uppercase'>Off</span> : null}
					</div>
					<button
						type='button'
						onClick={onEdit}
						aria-label={`Edit ${title}`}
						className={cn(
							'flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium hover:bg-overlay-hover',
							'opacity-100 sm:opacity-0 pointer-coarse:opacity-100 group-hover/diagram:opacity-100 focus-visible:opacity-100',
							focusRingClass,
						)}
						style={{ color: theme.primary }}
					>
						<Pencil aria-hidden='true' className='size-3' />
						Edit
					</button>
				</div>
				{description ? <p className='text-muted-foreground text-pretty text-xs leading-5'>{description}</p> : null}
			</div>
		</div>
	);
}

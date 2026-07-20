'use client';

import { useEffect, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@constructive-io/ui/collapsible';
import { ChevronDown, Eye, Pencil, Plus, PlusCircle, Shield, Trash2 } from 'lucide-react';
import { useSchemaBuilderRuntime } from '@/blocks/schema/schema-builder-core/context/block-config';

import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { cn } from '@/lib/utils';
import { POLICY_TYPE_UI_CONFIG } from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import { getDiagramTheme } from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/diagram-themes';
import { PolicyDiagramByKey } from '../../policies/policy-diagram/policy-diagram';
import { OPERATION_STYLES, type CrudOperation } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';

import { PolicyPill } from './policy-pill';

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

function getDiagramKey(policyType: string | null): string | null {
	if (!policyType || !(policyType in POLICY_TYPE_UI_CONFIG)) return null;
	return policyType;
}

function getPolicyThemeKey(policyType: string | null): string {
	if (!policyType) return 'AuthzAllowAll';
	return policyType in POLICY_TYPE_UI_CONFIG ? policyType : 'AuthzAllowAll';
}

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

	// Collapse when all policies are removed
	useEffect(() => {
		if (!hasPolicies) setIsOpen(false);
	}, [hasPolicies]);

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
				className='border-border/60 bg-card overflow-hidden rounded-lg border'
			>
				{/* Header row — icon + title aligned center, pills below */}
				<div className='p-4'>
					<div className='flex items-center gap-3'>
						{/* Operation Icon */}
						<div className='bg-muted/60 flex size-8 shrink-0 items-center justify-center rounded-lg'>
							<Icon className='text-muted-foreground size-4' />
						</div>

						{/* Title */}
						<h3 className='min-w-0 flex-1 text-balance text-sm font-semibold'>{OPERATION_DISPLAY_NAMES[operation]}</h3>

						{/* Add Button + Chevron */}
						<div className='flex shrink-0 items-center gap-2'>
							<Button variant='outline' size='sm' onClick={onAddClick} className='px-3'>
								<Plus className='size-4' />
								Add Policy
							</Button>
							{hasPolicies ? (
								<CollapsibleTrigger asChild>
									<button
										type='button'
										aria-label={isOpen ? 'Collapse policies' : 'Expand policies'}
										className='text-muted-foreground hover:text-foreground hover:bg-muted/60 grid size-10 place-items-center rounded-lg
											transition-[background-color,color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] focus-visible:outline-none'
									>
										<ChevronDown className={cn('size-4 transition-transform duration-200', isOpen && 'rotate-180')} />
									</button>
								</CollapsibleTrigger>
							) : (
								<div className='size-8' />
							)}
						</div>
					</div>

					{/* Pills — below the header row, fade out when expanded */}
					<div
						className={cn(
							'mt-2 flex flex-wrap items-center gap-2 pl-11 transition-opacity duration-150',
							isOpen && 'pointer-events-none h-0 mt-0 overflow-hidden opacity-0',
						)}
					>
						{hasPolicies ? (
							visiblePolicies.map((policy) => (
								<PolicyPill key={policy.id} policy={policy} onClick={() => onPolicyClick(policy)} />
							))
						) : (
							<span className='text-muted-foreground text-sm italic'>No active policies.</span>
						)}
					</div>
				</div>

				{/* Expanded diagrams */}
				{hasPolicies && (
					<CollapsibleContent innerClassName='px-4 pb-4 pt-0'>
						<div className='space-y-3'>
							{visiblePolicies.map((policy) => {
								const diagramKey = getDiagramKey(policy.policyType);
								const themeKey = getPolicyThemeKey(policy.policyType);
								const theme = getDiagramTheme(themeKey, mode);
								const config = POLICY_TYPE_UI_CONFIG[policy.policyType ?? ''];
								const title = config?.fallbackTitle ?? policy.policyType ?? policy.name ?? 'Policy';

								const PolicyIcon = config?.icon ?? Shield;
								const description = config?.description;
								const isPolicyDisabled = policy.disabled === true;

								return (
									<div
										key={policy.id}
										className={cn(
											'group/diagram flex w-full items-stretch rounded-lg border text-left',
											'transition-[border-color,box-shadow,opacity] duration-150 ease-out',
											'hover:shadow-sm',
											`focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2
											focus-visible:outline-none`,
											isPolicyDisabled && 'opacity-60',
										)}
										style={{ borderColor: theme.border }}
									>
										{/* Diagram — left half */}
										<div
											className='flex w-1/2 items-center justify-center rounded-l-lg p-3'
											style={{ backgroundColor: theme.fill + '30' }}
										>
											{diagramKey ? (
												<PolicyDiagramByKey
													diagramKey={diagramKey}
													tableName={tableName}
													config={(policy.data as Record<string, unknown>) ?? {}}
												/>
											) : (
												<span className='text-muted-foreground text-sm'>{title}</span>
											)}
										</div>

										{/* Info — right half */}
										<div className='flex w-1/2 flex-col justify-center gap-2 p-4 pl-6'>
											<div className='flex items-center justify-between gap-2'>
												<div className='flex items-center gap-2'>
													<div
														className='flex size-7 shrink-0 items-center justify-center rounded-full'
														style={{ backgroundColor: theme.fill, color: theme.primary }}
													>
														<PolicyIcon className='size-4' />
													</div>
													<span className='text-sm font-semibold' style={{ color: theme.primary }}>
														{title}
													</span>
												</div>
												<button
													type='button'
													onClick={() => onPolicyClick(policy)}
													className='flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full px-3 text-xs font-medium opacity-100
														transition-[opacity,scale] duration-150 ease-out motion-safe:active:scale-[0.96] sm:opacity-0
														pointer-coarse:opacity-100 group-hover/diagram:opacity-100 focus-visible:opacity-100'
													style={{ color: theme.primary }}
												>
													<Pencil className='size-3' />
													Edit
												</button>
											</div>
											{description && <p className='text-muted-foreground text-xs leading-relaxed'>{description}</p>}
										</div>
									</div>
								);
							})}
						</div>
					</CollapsibleContent>
				)}
			</div>
		</Collapsible>
	);
}

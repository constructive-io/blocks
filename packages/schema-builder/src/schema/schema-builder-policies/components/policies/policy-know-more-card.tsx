'use client';

import { Button } from '@constructive-io/ui/button';
import { ResponsiveDiagram } from '@constructive-io/ui/responsive-diagram';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import type { CardComponent } from '@constructive-io/ui/stack';
import { Check, Code2, Info, Rocket, Shield } from 'lucide-react';

import { cn } from '@/lib/utils';

import { getPolicyKnowMoreContent } from './policy-content';
import { PolicyDiagramByKey } from './policy-diagram';
import type { MergedPolicyType } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';

export interface PolicyKnowMoreCardProps {
	policyType: MergedPolicyType;
	onApply?: () => void;
}

/**
 * "Know More" card showing detailed information about a policy type.
 * Displays vibe check description, security features, use cases, and generated fields.
 */
export const PolicyKnowMoreCard: CardComponent<PolicyKnowMoreCardProps> = ({ policyType, onApply, card }) => {
	const Icon = policyType.icon;
	const content = getPolicyKnowMoreContent(policyType.name);
	const generatedFields = policyType.generatedFields;

	return (
		<div className='flex h-full flex-col'>
			<ScrollArea className='min-h-0 flex-1'>
				<div className='space-y-5 p-6'>
					{/* Header with icon, title, subtitle */}
					<div className='flex items-start gap-3'>
						<div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
							<Icon className='text-primary h-5 w-5' />
						</div>
						<div className='min-w-0 flex-1'>
							<h2 className='text-base font-semibold'>{policyType.title}</h2>
							<p className='text-muted-foreground text-sm'>{policyType.description}</p>
						</div>
						<div className='shrink-0'>
							<span className='bg-primary flex h-6 w-6 items-center justify-center rounded-full'>
								<Check className='h-3.5 w-3.5 text-white' />
							</span>
						</div>
					</div>

					{/* Policy Diagram */}
					{policyType.diagramKey && (
						<div className='flex h-36 items-center justify-center'>
							<ResponsiveDiagram className='h-full w-full [&>div]:border-0'>
								<PolicyDiagramByKey diagramKey={policyType.diagramKey} tableName='table' />
							</ResponsiveDiagram>
						</div>
					)}

					{/* The Vibe Check */}
					{content && (
						<div className='bg-muted/50 rounded-xl p-4'>
							<div className='mb-2 flex items-center gap-2'>
								<Info className='text-muted-foreground h-4 w-4' />
								<p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>The Vibe Check</p>
							</div>
							<p className='text-sm leading-relaxed'>{content.vibeCheck}</p>
						</div>
					)}

					{/* Two columns: Security Superpowers | Perfect For Building */}
					{content && (
						<div className='flex flex-col gap-3'>
							{/* Security Superpowers */}
							<div className='rounded-xl border p-4'>
								<div className='mb-3 flex items-center gap-2'>
									<Shield className='h-4 w-4 text-green-500' />
									<h4 className='text-sm font-semibold'>Security Superpowers</h4>
								</div>
								<ul className='space-y-2'>
									{content.securityFeatures.map((feature) => (
										<li key={feature} className='flex items-start gap-2'>
											<div className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500' />
											<span className='text-muted-foreground text-xs'>{feature}</span>
										</li>
									))}
								</ul>
							</div>

							{/* Perfect For Building */}
							<div className='rounded-xl border p-4'>
								<div className='mb-3 flex items-center gap-2'>
									<Rocket className='h-4 w-4 text-purple-500' />
									<h4 className='text-sm font-semibold'>Perfect For Building</h4>
								</div>
								<ul className='space-y-2'>
									{content.useCases.map((useCase) => (
										<li key={useCase} className='flex items-start gap-2'>
											<div className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500' />
											<span className='text-muted-foreground text-xs'>{useCase}</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					)}

					{/* What's Under The Hood? */}
					{generatedFields.length > 0 && (
						<div>
							<div className='mb-2 flex items-center gap-2'>
								<Code2 className='text-muted-foreground h-4 w-4' />
								<p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
									What&apos;s Under The Hood?
								</p>
							</div>
							<div className='overflow-hidden rounded-xl border'>
								<table className='w-full'>
									<thead className='bg-muted/50'>
										<tr>
											<th
												className='text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wider
													uppercase'
											>
												Hidden Field
											</th>
											<th
												className='text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wider
													uppercase'
											>
												Type
											</th>
											<th
												className='text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wider
													uppercase'
											>
												Logic
											</th>
										</tr>
									</thead>
									<tbody className='divide-y'>
										{generatedFields.map((field) => (
											<tr key={field.name}>
												<td className='px-3 py-2 font-mono text-xs text-blue-500'>{field.name}</td>
												<td className='text-muted-foreground px-3 py-2 font-mono text-xs'>{field.type}</td>
												<td
													className={cn(
														'px-3 py-2 text-xs italic',
														field.nullable ? 'text-muted-foreground' : 'text-muted-foreground',
													)}
												>
													{field.nullable ? 'optional' : 'required'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* No generated fields message */}
					{generatedFields.length === 0 && (
						<div className='text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm'>
							{policyType.name === 'AuthzComposite'
								? 'Fields are determined by the individual rules you combine.'
								: 'No fields will be auto-generated for this policy type.'}
						</div>
					)}
				</div>
			</ScrollArea>

			{/* Footer */}
			<div className='flex justify-end gap-2 border-t p-4'>
				<Button variant='outline' onClick={() => card.close()}>
					Back
				</Button>
				{onApply && (
					<Button data-testid='policy-apply-button' onClick={onApply}>
						Apply This Policy
					</Button>
				)}
			</div>
		</div>
	);
};

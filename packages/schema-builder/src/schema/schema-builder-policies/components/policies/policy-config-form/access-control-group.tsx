'use client';

import { Switch } from '@constructive-io/ui/switch';

import type { FormFieldSchema } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';

interface AccessControlGroupProps {
	fields: FormFieldSchema[];
	values: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
	disabled?: boolean;
}

function getAccessSummary(fields: FormFieldSchema[], values: Record<string, unknown>): string {
	const enabled = fields.filter((f) => values[f.key] === true || values[f.key] === 'true');
	if (enabled.length === 0) return 'Members';
	const labels = enabled.map((f) => f.label);
	if (labels.length === 1) return `Members who are ${labels[0]}`;
	return `Members who are ${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

/**
 * Grouped card for is_admin / is_owner boolean fields.
 * Renders a "Who can access this?" card with checkboxes, switches, and a dynamic summary.
 */
export function AccessControlGroup({ fields, values, onChange, disabled }: AccessControlGroupProps) {
	const summary = getAccessSummary(fields, values);
	return (
		<div data-chat-component='access-control-group' className='rounded-lg border'>
			{/* Header */}
			<div className='px-4 pt-4 pb-3'>
				<h4 className='text-sm font-semibold'>Who can access this?</h4>
				<p className='text-muted-foreground text-xs'>
					Limit access to certain members. Choose which types of members can access.
				</p>
			</div>

			{/* Rows */}
			{fields.map((field) => {
				const checked = values[field.key] === true || values[field.key] === 'true';
				return (
					<div key={field.key} className='flex items-center justify-between border-t px-4 py-3'>
						<div className='min-w-0 flex-1 space-y-0.5'>
							<p className='text-sm font-medium leading-none'>{field.label}</p>
							<p className='text-muted-foreground text-xs'>{field.description}</p>
						</div>
						<Switch
							checked={checked}
							onCheckedChange={(v) => onChange(field.key, v)}
							disabled={disabled}
						/>
					</div>
				);
			})}

			{/* Summary */}
			<div className='border-t px-4 py-3'>
				<p className='text-xs'>
					<span className='font-semibold'>Access:</span> {summary}
				</p>
			</div>
		</div>
	);
}

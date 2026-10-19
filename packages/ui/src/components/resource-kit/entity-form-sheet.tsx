'use client';

import * as React from 'react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../sheet';
import { useResourceDefinition } from './context';
import { EntityForm } from './entity-form';
import { inSentence, recordId } from './fields';
import type { FormMode, FormValues, SaveFailure } from './form-values';
import { useRowTitles } from './labels';
import type { ResourceRef, ResourceRow } from './types';

export type EntityFormSheetProps = {
	resource: ResourceRef;
	/** The record to edit. Without one the sheet creates a record. */
	record?: ResourceRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Runs after the record and its links are written. */
	onSaved?: (record: ResourceRow, mode: FormMode) => void;
	/** Starting values for a new record, e.g. the parent of a related list. Fields the form does not show are still saved. */
	defaultValues?: ResourceRow;
};

/** A record the sheet created whose links failed: it stays open as an edit of that record, so a retry never creates it twice. */
type Created = { record: ResourceRow; draft: FormValues; failure: SaveFailure };

/**
 * Create or edit one record in a right-hand sheet. Validates required and
 * typed fields before writing, maps inputs to stored values, writes
 * many-to-many links after the record, and keeps the sheet open with the
 * source's message when a write is rejected.
 */
export function EntityFormSheet({ resource: resourceRef, record, open, onOpenChange, onSaved, defaultValues }: EntityFormSheetProps) {
	const resource = useResourceDefinition(resourceRef);
	const [created, setCreated] = React.useState<Created | null>(null);
	// Opening the sheet again starts fresh, adjusted during render.
	const [wasOpen, setWasOpen] = React.useState(open);
	if (wasOpen !== open) {
		setWasOpen(open);
		if (open) setCreated(null);
	}
	const current = record ?? created?.record ?? null;
	const mode: FormMode = current ? 'edit' : 'create';
	const title = mode === 'create' ? `New ${inSentence(resource.singular)}` : `Edit ${inSentence(resource.singular)}`;
	const recordName = useRowTitles(resource, current ? [current] : []);
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
				<SheetHeader className="space-y-1 p-4 pe-12 pb-3 text-start">
					<SheetTitle className="text-sm font-medium [overflow-wrap:anywhere]">{title}</SheetTitle>
					<SheetDescription className="text-[0.8125rem] [overflow-wrap:anywhere]">
						{current ? (recordName(current) ?? '…') : 'Fill in the details, then save.'}
					</SheetDescription>
				</SheetHeader>
				{open ? (
					<EntityForm
						key={current ? recordId(resource, current) : 'new'}
						resource={resource}
						record={current}
						mode={mode}
						defaultValues={defaultValues}
						draft={created && !record ? created.draft : undefined}
						failure={created && !record ? created.failure : undefined}
						onClose={() => onOpenChange(false)}
						onSaved={onSaved}
						onCreatedPartially={(row, draft, failure) => setCreated({ record: row, draft, failure })}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

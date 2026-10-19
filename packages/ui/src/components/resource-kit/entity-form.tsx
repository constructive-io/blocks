'use client';

import { useQueries } from '@tanstack/react-query';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '../field';
import { SheetFooter } from '../sheet';
import { Spinner } from '../spinner';
import { dashedRule } from '../workspace-kit/surface';
import { FieldControl } from './field-control';
import { inSentence, isManyRelation, recordId } from './fields';
import {
	buildSubmission,
	describeSaveFailure,
	errorMessage,
	type FormErrors,
	formFieldsFor,
	type FormMode,
	type FormValue,
	type FormValues,
	initialFormValues,
	type SaveFailure,
	validateFormValues,
} from './form-values';
import { PartialSaveError, resourceKeys, useSaveRecord } from './queries';
import { SaveFailureAlert } from './save-failure';
import type { AnyResource, ResourceField, ResourceRow } from './types';

export type EntityFormProps = {
	resource: AnyResource;
	record: ResourceRow | null;
	mode: FormMode;
	defaultValues?: ResourceRow;
	/** Values to start from instead of the record's, e.g. links a partial create did not save. */
	draft?: FormValues;
	/** A failure to show when the form opens, e.g. after a partial create. */
	failure?: SaveFailure | null;
	onClose: () => void;
	onSaved?: (record: ResourceRow, mode: FormMode) => void;
	/** The record was created but its links were not; the sheet reopens it for editing. */
	onCreatedPartially: (record: ResourceRow, draft: FormValues, failure: SaveFailure) => void;
};

type LinkRead = { ids?: string[]; error?: unknown; retry: () => void };

/**
 * Reads the linked ids of many-to-many fields before the form starts, so
 * editing begins from the saved set. A failed read leaves that field out of
 * the form until it loads: starting it empty would unlink everything on save.
 */
export function EntityForm(props: EntityFormProps) {
	const { resource, record, mode } = props;
	const fields = React.useMemo(() => formFieldsFor(resource, mode), [resource, mode]);
	const id = record ? recordId(resource, record) : '';
	const manyFields = fields.filter((field) => isManyRelation(field) && !Array.isArray(record?.[field.name]));
	const canRead = Boolean(resource.source.linked) && mode === 'edit';
	const reads = useQueries({
		queries: manyFields.map((field) => ({
			queryKey: resourceKeys.linked(resource.name, id, field.name),
			queryFn: () => resource.source.linked!(id, field.name),
			enabled: canRead,
		})),
	});
	if (canRead && reads.some((read) => read.isPending && read.fetchStatus !== 'idle' && !read.failureReason)) {
		return (
			<div className={cn('flex flex-1 items-center justify-center gap-2 border-t text-[0.8125rem] text-muted-foreground', dashedRule)}>
				<Spinner decorative className="size-4" />
				Loading…
			</div>
		);
	}
	const linked: Record<string, LinkRead> = canRead
		? Object.fromEntries(
				manyFields.map((field, index) => {
					const read = reads[index]!;
					const error = read.data ? undefined : (read.error ?? read.failureReason ?? undefined);
					return [field.name, { ids: read.data, error, retry: () => void read.refetch() }];
				}),
			)
		: {};
	return <FormBody {...props} fields={fields} linked={linked} />;
}

function FormBody({
	resource,
	record,
	mode,
	defaultValues,
	draft,
	failure: openingFailure,
	onClose,
	onSaved,
	onCreatedPartially,
	fields,
	linked,
}: EntityFormProps & { fields: ResourceField[]; linked: Record<string, LinkRead> }) {
	const formId = React.useId();
	const loadedIds = Object.fromEntries(Object.entries(linked).flatMap(([name, read]) => (read.ids ? [[name, read.ids]] : [])));
	const [initial, setInitial] = React.useState(() => initialFormValues(fields, record, defaultValues, loadedIds));
	const [values, setValues] = React.useState<FormValues>(() => ({ ...initial, ...draft }));
	const [adopted, setAdopted] = React.useState(() => new Set(Object.keys(loadedIds)));
	const [errors, setErrors] = React.useState<FormErrors>(openingFailure?.fields ?? {});
	const [failure, setFailure] = React.useState<SaveFailure | null>(openingFailure ?? null);
	const save = useSaveRecord(resource);
	const formRef = React.useRef<HTMLFormElement>(null);

	// A link read that failed and then loaded on retry joins the form now, adjusted during render.
	const newlyLoaded = Object.keys(loadedIds).filter((name) => !adopted.has(name));
	if (newlyLoaded.length > 0) {
		setAdopted(new Set([...adopted, ...newlyLoaded]));
		const loaded = Object.fromEntries(newlyLoaded.map((name) => [name, loadedIds[name]!]));
		setInitial((current) => ({ ...current, ...loaded }));
		setValues((current) => ({ ...current, ...loaded, ...Object.fromEntries(newlyLoaded.flatMap((name) => (draft?.[name] ? [[name, draft[name]!]] : []))) }));
	}
	const unavailable = (field: ResourceField) => Boolean(linked[field.name] && !linked[field.name]!.ids);
	const writable = fields.filter((field) => !unavailable(field));

	const focusField = (name: string) => {
		formRef.current?.querySelector<HTMLElement>(`[id="${formId}-${name}"]`)?.focus();
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const nextErrors = validateFormValues(writable, values);
		setErrors(nextErrors);
		setFailure(null);
		const firstInvalid = writable.find((field) => nextErrors[field.name]);
		if (firstInvalid) {
			focusField(firstInvalid.name);
			return;
		}
		const noun = inSentence(resource.singular);
		try {
			const submission = buildSubmission(writable, values, initial, mode, defaultValues);
			const saved = await save.mutateAsync({ id: record ? recordId(resource, record) : undefined, submission });
			onSaved?.(saved, mode);
			onClose();
		} catch (error) {
			if (error instanceof PartialSaveError) {
				const label = resource.fields[error.field]?.label ?? error.field;
				const partial = describeSaveFailure(error.cause, `The ${noun} was saved, but its ${inSentence(label)} were not. Check them and save again.`);
				if (mode === 'create') {
					onCreatedPartially(error.record, Object.fromEntries(writable.filter(isManyRelation).map((field) => [field.name, values[field.name] ?? []])), partial);
					return;
				}
				// The columns are saved; the next save only re-sends the links.
				setInitial((current) => ({ ...current, ...Object.fromEntries(writable.filter((field) => !isManyRelation(field)).map((field) => [field.name, values[field.name] ?? ''])) }));
				setFailure(partial);
				return;
			}
			const described = describeSaveFailure(error, `The ${noun} could not be saved. Try again.`);
			setErrors(described.fields);
			setFailure(described);
		}
	};

	const set = (name: string, value: FormValue) => {
		setValues((current) => ({ ...current, [name]: value }));
		if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }));
	};

	return (
		<form ref={formRef} noValidate onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
			<div className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t px-4 py-4', dashedRule)}>
				{failure ? <SaveFailureAlert failure={failure} /> : null}
				{fields.length === 0 ? <p className="text-[0.8125rem] text-muted-foreground">This {inSentence(resource.singular)} has no editable fields.</p> : null}
				<FieldGroup className="gap-4">
					{fields.map((field) => {
						const id = `${formId}-${field.name}`;
						const read = linked[field.name];
						const loadError = read && !read.ids ? `Couldn’t load the linked ${inSentence(field.label)}: ${errorMessage(read.error)}` : undefined;
						const error = errors[field.name];
						const descriptionId = field.description ? `${id}-description` : undefined;
						const errorId = error || loadError ? `${id}-error` : undefined;
						const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
						const control = (
							<FieldControl
								field={field}
								id={id}
								value={values[field.name] ?? (isManyRelation(field) ? [] : '')}
								onChange={(value) => set(field.name, value)}
								invalid={Boolean(error)}
								describedBy={describedBy}
								disabled={Boolean(loadError)}
							/>
						);
						if (field.input === 'boolean') {
							return (
								<Field key={field.name} orientation="horizontal" className="items-start justify-between gap-3">
									<span className="flex min-w-0 flex-col gap-0.5">
										<FieldLabel htmlFor={id} className="text-[0.8125rem] font-medium">
											{field.label}
										</FieldLabel>
										{field.description ? <FieldDescription id={descriptionId} className="text-xs">{field.description}</FieldDescription> : null}
									</span>
									{control}
								</Field>
							);
						}
						return (
							<Field key={field.name} data-invalid={Boolean(error) || undefined} className="gap-1.5">
								<FieldLabel htmlFor={id} className="text-[0.8125rem] font-medium">
									<span>
										{field.label}
										{field.required && !field.readOnly ? (
											<span aria-hidden="true" className="ms-1 text-destructive">
												*
											</span>
										) : null}
									</span>
								</FieldLabel>
								{control}
								{field.description ? <FieldDescription id={descriptionId} className="text-xs">{field.description}</FieldDescription> : null}
								{loadError ? (
									<FieldError id={errorId} className="flex flex-wrap items-baseline gap-x-2 text-xs">
										<span className="[overflow-wrap:anywhere]">{loadError}</span>
										<Button type="button" size="xs" variant="outline" onClick={read!.retry}>
											Try again
										</Button>
									</FieldError>
								) : error ? (
									<FieldError id={errorId} className="text-xs">
										{error}
									</FieldError>
								) : null}
							</Field>
						);
					})}
				</FieldGroup>
			</div>
			<SheetFooter className={cn('flex-row justify-end gap-2 border-t bg-muted/40 p-3', dashedRule)}>
				<Button type="button" size="sm" variant="outline" wrap onClick={onClose}>
					Cancel
				</Button>
				<Button type="submit" size="sm" wrap disabled={save.isPending} aria-busy={save.isPending || undefined}>
					{save.isPending ? <Spinner decorative className="size-3.5" /> : null}
					{save.isPending ? 'Saving…' : mode === 'create' ? `Create ${inSentence(resource.singular)}` : 'Save changes'}
				</Button>
			</SheetFooter>
		</form>
	);
}

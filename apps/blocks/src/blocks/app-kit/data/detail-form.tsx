'use client';

import * as React from 'react';
import { SaveIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import { Separator } from '@constructive-io/ui/separator';
import { Switch } from '@constructive-io/ui/switch';
import { Textarea } from '@constructive-io/ui/textarea';

import type {
  AppActionDefinition,
  AppError,
  AppFieldDefinition,
  AppQueryDefinition,
  AppResourceDefinition
} from '../core';
import { useAppAction, useAppQuery } from '../core/runtime';

import { formatAppValue } from './collections';
import { AppDataStateView } from './states';
import type {
  AppDataState,
  AppFieldInputRenderer,
  AppFieldRenderer,
  AppSurface
} from './types';

export type AppRecordDetailProps<
  TRecord extends Record<string, unknown>,
  TIdentity = unknown
> = Readonly<{
  resource: Pick<
    AppResourceDefinition<TRecord, TIdentity>,
    '__types' | 'label' | 'fields' | 'displayField' | 'identity'
  >;
  state: AppDataState<NoInfer<TRecord>>;
  renderField?: AppFieldRenderer<TRecord>;
  actions?: React.ReactNode;
  surface?: AppSurface;
  onRetry?: () => void;
  className?: string;
}>;

export function AppRecordDetail<
  TRecord extends Record<string, unknown>,
  TIdentity = unknown
>({
  resource,
  state,
  renderField,
  actions,
  surface = 'card',
  onRetry,
  className
}: AppRecordDetailProps<TRecord, TIdentity>) {
  const content = (
    <AppDataStateView onRetry={onRetry} state={state}>
      {(record) => (
        <dl className='grid gap-x-8 gap-y-4 sm:grid-cols-2'>
          {resource.fields.map((field) => (
            <div className='min-w-0' key={field.key}>
              <dt className='text-sm text-muted-foreground'>{field.label}</dt>
              <dd className='mt-1 min-w-0 break-words text-sm'>
                {renderField
                  ? renderField(record[field.key], record, field)
                  : formatAppValue(record[field.key])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </AppDataStateView>
  );

  if (surface !== 'card') {
    return (
      <section
        aria-label={`${resource.label} details`}
        className={className}
        data-surface={surface}
      >
        {content}
        {actions ? (
          <>
            <Separator className='my-4' />
            {actions}
          </>
        ) : null}
      </section>
    );
  }

  const readyRecord = state.status === 'ready' ? state.data : undefined;
  return (
    <Card className={className} variant='flat'>
      <CardHeader>
        <CardTitle>
          {readyRecord
            ? String(readyRecord[resource.displayField] ?? resource.label)
            : resource.label}
        </CardTitle>
        <CardDescription>
          {resource.identity
            ? `${resource.label} details`
            : 'Read-only because this resource has no stable identity.'}
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
      {actions ? <CardFooter>{actions}</CardFooter> : null}
    </Card>
  );
}

export type ConnectedAppRecordDetailProps<
  TRecord extends Record<string, unknown>,
  TIdentity
> = Omit<AppRecordDetailProps<TRecord, TIdentity>, 'state' | 'onRetry'> &
  Readonly<{
    query: AppQueryDefinition<TIdentity, TRecord | null>;
    identity: TIdentity;
    enabled?: boolean;
  }>;

export function ConnectedAppRecordDetail<
  TRecord extends Record<string, unknown>,
  TIdentity
>(props: ConnectedAppRecordDetailProps<TRecord, TIdentity>) {
  const { query, identity, enabled, ...detailProps } = props;
  const result = useAppQuery(query, identity, { enabled });
  let state: AppDataState<TRecord>;
  if (result.isLoading) state = { status: 'loading' };
  else if (result.isError) {
    const error = result.error.appError;
    state =
      error.kind === 'authorization' || error.kind === 'authentication'
        ? { error, status: 'denied' }
        : { error, status: 'error' };
  } else if (!result.data) state = { status: 'empty' };
  else state = { data: result.data, refreshing: result.isFetching, status: 'ready' };

  return (
    <AppRecordDetail
      {...detailProps}
      onRetry={() => void result.refetch()}
      state={state}
    />
  );
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function parseArray(kind: AppFieldDefinition<Record<string, unknown>>['kind'], value: string) {
  const items = value
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean);
  if (kind === 'integer-array') return items.map(Number);
  if (kind === 'float-array') return items.map(Number);
  return items;
}

function structuredInputValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    return 'Structured value';
  }
}

function padDateTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

function padMilliseconds(value: number): string {
  return String(value).padStart(3, '0');
}

/** Converts an instant-bearing ISO value to the browser's datetime-local wall time. */
export function toAppDateTimeLocalValue(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [
    `${date.getFullYear()}-${padDateTimePart(date.getMonth() + 1)}-${padDateTimePart(date.getDate())}`,
    `${padDateTimePart(date.getHours())}:${padDateTimePart(date.getMinutes())}:${padDateTimePart(date.getSeconds())}.${padMilliseconds(date.getMilliseconds())}`
  ].join('T');
}

/** Converts datetime-local wall time to an offset-aware ISO instant (`Z`). */
export function fromAppDateTimeLocalValue(value: string): string {
  if (value.length === 0) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function GeneratedField<TRecord extends Record<string, unknown>>({
  field,
  value,
  error,
  disabled,
  required,
  renderer,
  onChange
}: Readonly<{
  field: AppFieldDefinition<TRecord>;
  value: unknown;
  error?: string;
  disabled: boolean;
  required: boolean;
  renderer?: AppFieldInputRenderer<TRecord>;
  onChange: (value: unknown) => void;
}>) {
  const id = React.useId();
  const descriptionId = field.description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(error);
  const fieldDisabled = disabled || field.readOnly === true;

  let control: React.ReactNode;
  if (renderer) {
    control = renderer.render({
      'aria-describedby': describedBy,
      descriptionId,
      disabled: fieldDisabled,
      errorId,
      field,
      id,
      invalid,
      onChange,
      required,
      value
    });
  } else if (field.kind === 'boolean') {
    control = (
      <Switch
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-required={required}
        checked={Boolean(value)}
        disabled={fieldDisabled}
        id={id}
        onCheckedChange={onChange}
      />
    );
  } else if (
    field.kind === 'enum' ||
    (field.kind === 'string' && Boolean(field.options?.length))
  ) {
    const items = [
      ...(field.nullable ? [{ label: 'None', value: '__app-kit-null__' }] : []),
      ...(field.options ?? [])
    ];
    control = (
      <Select
        disabled={fieldDisabled}
        items={items}
        onValueChange={(nextValue) =>
          onChange(nextValue === '__app-kit-null__' ? null : nextValue)
        }
        value={typeof value === 'string' ? value : undefined}
      >
        <SelectTrigger
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-required={required}
          id={id}
        >
          <SelectValue placeholder={`Select ${field.label.toLocaleLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  } else if (field.kind.endsWith('-array')) {
    control = (
      <Textarea
        aria-describedby={describedBy}
        aria-invalid={invalid}
        disabled={fieldDisabled}
        id={id}
        onChange={(event) =>
          onChange(
            parseArray(
              field.kind as AppFieldDefinition<Record<string, unknown>>['kind'],
              event.currentTarget.value
            )
          )
        }
        placeholder='One value per line'
        required={required}
        value={arrayValue(value)}
      />
    );
  } else if (field.kind === 'json' || field.kind === 'custom') {
    control = (
      <Input
        aria-describedby={describedBy}
        disabled
        id={id}
        value={structuredInputValue(value)}
      />
    );
  } else {
    const inputType =
      field.kind === 'integer' || field.kind === 'float'
        ? 'number'
        : field.kind === 'date'
          ? 'date'
          : field.kind === 'datetime'
            ? 'datetime-local'
            : 'text';
    control = (
      <Input
        aria-describedby={describedBy}
        aria-invalid={invalid}
        disabled={fieldDisabled}
        id={id}
        onChange={(event) => {
          const rawValue = event.currentTarget.value;
          onChange(
            inputType === 'number'
              ? rawValue === ''
                ? null
                : Number(rawValue)
              : inputType === 'datetime-local'
                ? fromAppDateTimeLocalValue(rawValue)
              : rawValue
          );
        }}
        required={required}
        step={
          inputType === 'datetime-local'
            ? 0.001
            : field.kind === 'float'
              ? 'any'
              : undefined
        }
        type={inputType}
        value={
          inputType === 'datetime-local'
            ? toAppDateTimeLocalValue(value)
            : typeof value === 'string' || typeof value === 'number'
              ? value
              : ''
        }
      />
    );
  }

  return (
    <Field data-disabled={fieldDisabled || undefined} data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      {control}
      {field.description ? (
        <FieldDescription id={descriptionId}>{field.description}</FieldDescription>
      ) : null}
      {!renderer && (field.kind === 'json' || field.kind === 'custom') ? (
        <FieldDescription>
          Add an explicit input renderer to edit this structured field.
        </FieldDescription>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

export type AppRecordFormProps<
  TRecord extends Record<string, unknown>,
  TIdentity = unknown
> = Readonly<{
  resource: Pick<
    AppResourceDefinition<TRecord, TIdentity>,
    '__types' | 'label' | 'fields' | 'forms' | 'identity'
  >;
  mode: 'create' | 'update';
  values: Partial<NoInfer<TRecord>>;
  onChange: (values: Partial<NoInfer<TRecord>>) => void;
  onSubmit: (values: Partial<NoInfer<TRecord>>) => void | Promise<void>;
  errors?: Readonly<Partial<Record<keyof TRecord & string, string>>>;
  inputRenderers?: Readonly<
    Partial<Record<keyof TRecord & string, AppFieldInputRenderer<TRecord>>>
  >;
  disabled?: boolean;
  submitting?: boolean;
  submitLabel?: string;
  error?: AppError;
  actions?: React.ReactNode;
  className?: string;
}>;

export function AppRecordForm<
  TRecord extends Record<string, unknown>,
  TIdentity = unknown
>({
  resource,
  mode,
  values,
  onChange,
  onSubmit,
  errors,
  inputRenderers,
  disabled = false,
  submitting = false,
  submitLabel = 'Save changes',
  error,
  actions,
  className
}: AppRecordFormProps<TRecord, TIdentity>) {
  const formDefinition = resource.forms?.[mode];
  const formFields = resource.forms
    ? (formDefinition?.fields ?? []).flatMap((formField) => {
        const field = resource.fields.find(
          (candidate) => candidate.key === formField.field
        );
        return field ? [{ field, required: formField.required }] : [];
      })
    : resource.fields.map((field) => ({ field, required: undefined }));
  const readOnlyReason = !resource.identity
    ? 'This record has no stable identity, so App Kit will not issue writes.'
    : resource.forms && !formDefinition
      ? `This resource does not configure a ${mode} form.`
      : undefined;
  const readOnly = Boolean(readOnlyReason);
  const resolvedErrors: Readonly<
    Partial<Record<keyof TRecord & string, string>>
  > = errors ?? ({} as Partial<Record<keyof TRecord & string, string>>);
  const resolvedInputRenderers: Readonly<
    Partial<Record<keyof TRecord & string, AppFieldInputRenderer<TRecord>>>
  > = inputRenderers ??
    ({} as Partial<
      Record<keyof TRecord & string, AppFieldInputRenderer<TRecord>>
    >);
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(values);
      }}
    >
      <FieldGroup>
        {error ? (
          <Alert variant='destructive'>
            <AlertTitle>Changes were not saved</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        {readOnly ? (
          <Alert>
            <AlertTitle>Read-only resource</AlertTitle>
            <AlertDescription>{readOnlyReason}</AlertDescription>
          </Alert>
        ) : null}
        {formFields.map(({ field, required }) => (
          <GeneratedField
            disabled={disabled || readOnly}
            error={resolvedErrors[field.key]}
            field={field}
            key={field.key}
            onChange={(value) => onChange({ ...values, [field.key]: value })}
            renderer={resolvedInputRenderers[field.key]}
            required={required ?? !field.nullable}
            value={values[field.key]}
          />
        ))}
        <Field orientation='horizontal'>
          <Button disabled={disabled || readOnly || submitting} type='submit'>
            <SaveIcon data-icon='inline-start' />
            {submitting ? 'Saving…' : submitLabel}
          </Button>
          {actions}
        </Field>
      </FieldGroup>
    </form>
  );
}

export type ConnectedAppRecordFormProps<
  TRecord extends Record<string, unknown>,
  TInput,
  TOutput,
  TIdentity = unknown
> = Omit<
  AppRecordFormProps<TRecord, TIdentity>,
  'values' | 'onChange' | 'onSubmit' | 'errors' | 'submitting' | 'error'
> &
  Readonly<{
    initialValues: Partial<TRecord>;
    action: AppActionDefinition<TInput, TOutput>;
    toInput: (values: Partial<TRecord>) => TInput;
    onCompleted?: (output: TOutput, values: Partial<TRecord>) => void;
    /** Change this when the host selects a different record. */
    resetKey?: string | number;
  }>;

export function ConnectedAppRecordForm<
  TRecord extends Record<string, unknown>,
  TInput,
  TOutput,
  TIdentity = unknown
>(props: ConnectedAppRecordFormProps<TRecord, TInput, TOutput, TIdentity>) {
  const {
    initialValues,
    action,
    toInput,
    onCompleted,
    resetKey,
    ...formProps
  } = props;
  const [values, setValues] = React.useState(initialValues);
  const [error, setError] = React.useState<AppError>();
  const dirtyFieldsRef = React.useRef(new Set<keyof TRecord & string>());
  const initialValuesRef = React.useRef(initialValues);
  const resetKeyRef = React.useRef(resetKey);
  const runner = useAppAction(action);

  React.useEffect(() => {
    const reset = !Object.is(resetKeyRef.current, resetKey);
    resetKeyRef.current = resetKey;
    if (initialValuesRef.current === initialValues && !reset) return;
    initialValuesRef.current = initialValues;
    if (reset) dirtyFieldsRef.current.clear();
    setValues((currentValues) => {
      if (reset || dirtyFieldsRef.current.size === 0) return initialValues;
      const merged = { ...initialValues };
      for (const field of dirtyFieldsRef.current) {
        merged[field] = currentValues[field];
      }
      return merged;
    });
  }, [initialValues, resetKey]);

  const fieldErrors = Object.fromEntries(
    (error?.fieldErrors ?? []).map((fieldError) => [
      fieldError.field,
      fieldError.message
    ])
  ) as Partial<Record<keyof TRecord & string, string>>;

  return (
    <AppRecordForm
      {...formProps}
      error={error}
      errors={fieldErrors}
      onChange={(nextValues) => {
        setValues((currentValues) => {
          const keys = new Set([
            ...Object.keys(currentValues),
            ...Object.keys(nextValues)
          ] as (keyof TRecord & string)[]);
          for (const field of keys) {
            if (!Object.is(currentValues[field], nextValues[field])) {
              dirtyFieldsRef.current.add(field);
            }
          }
          return nextValues;
        });
      }}
      onSubmit={async (nextValues) => {
        setError(undefined);
        const result = await runner.execute(toInput(nextValues));
        if (result.ok) {
          dirtyFieldsRef.current.clear();
          onCompleted?.(result.data, nextValues);
        }
        else setError(result.error);
      }}
      submitting={runner.mutation.isPending}
      values={values}
    />
  );
}

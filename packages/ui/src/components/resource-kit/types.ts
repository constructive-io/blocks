import type * as React from 'react';

/** How a field is edited. */
export type FieldInput =
	| 'text'
	| 'textarea'
	| 'email'
	| 'url'
	| 'number'
	| 'integer'
	| 'currency'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'time'
	| 'select'
	| 'relation'
	| 'json'
	| 'uuid';

/** How a field reads in lists and on the detail view. */
export type FieldFormat = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'relative' | 'boolean' | 'badge';

export type FieldTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type FieldOption = { value: string; label: string; tone?: FieldTone };

export type ResourceField = {
	/** Row key as the data source returns it (camelCase). */
	name: string;
	label: string;
	input: FieldInput;
	/** List and detail display; defaults from `input`. */
	format?: FieldFormat;
	required?: boolean;
	/** Shown, never written (e.g. createdAt). */
	readOnly?: boolean;
	/** Never shown (e.g. ownerId). */
	hidden?: boolean;
	description?: string;
	placeholder?: string;
	options?: FieldOption[];
	relation?: {
		/** Target resource name. */
		resource: string;
		/** Many-to-many through a junction: values come from `source.linked` and are written with `source.link`. */
		many?: boolean;
		/** Defaults to the target's `titleField`. */
		labelField?: string;
	};
};

export type ListQuery = {
	search?: string;
	sort?: { field: string; direction: 'asc' | 'desc' };
	offset: number;
	limit: number;
	/** Equality filters, e.g. `{ status: 'open' }`. */
	filters?: Record<string, unknown>;
};

export type ListResult<Row> = { rows: Row[]; totalCount: number };

export interface ResourceSource<Row extends Record<string, unknown> = Record<string, unknown>> {
	list(query: ListQuery): Promise<ListResult<Row>>;
	get(id: string): Promise<Row | null>;
	create(values: Partial<Row>): Promise<Row>;
	update(id: string, patch: Partial<Row>): Promise<Row>;
	remove(id: string): Promise<void>;
	/** Many-to-many: replaces the set of linked ids for one relation field. */
	link?(id: string, field: string, targetIds: string[]): Promise<void>;
	linked?(id: string, field: string): Promise<string[]>;
}

export type ResourceDefinition<Row extends Record<string, unknown> = Record<string, unknown>> = {
	/** Stable id, kebab-case plural (the route segment). */
	name: string;
	/** Plural display name, e.g. "Shifts". */
	label: string;
	/** Singular display name, e.g. "Shift". */
	singular: string;
	/** Lucide icon name, resolved through the provider's `icons` map. */
	icon?: string;
	/** Usually "id". */
	primaryKey: string;
	/** Row label in pickers, breadcrumbs, and titles. */
	titleField: string;
	/** List columns, in order. */
	columns: string[];
	/** Create and edit fields, in order. */
	formFields: string[];
	/** Detail fields; defaults to every visible field. */
	detailFields?: string[];
	/** Text fields the toolbar search covers. */
	searchFields?: string[];
	defaultSort?: { field: string; direction: 'asc' | 'desc' };
	fields: Record<string, ResourceField>;
	source: ResourceSource<Row>;
};

/** Identity helper that keeps a resource definition typed against its row. */
export function defineResource<Row extends Record<string, unknown>>(definition: ResourceDefinition<Row>): ResourceDefinition<Row> {
	return definition;
}

/** The host's router, injected so the kit never imports one. */
export type ResourceRouter = {
	Link: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
	navigate(href: string): void;
	/** e.g. "/shifts" */
	listHref(resource: string): string;
	/** e.g. "/shifts/<id>" */
	detailHref(resource: string, id: string): string;
};

/** A resource with any row shape, as the provider holds them. */
export type AnyResource = ResourceDefinition<any>;

/** A row as the kit reads it. */
export type ResourceRow = Record<string, unknown>;

/** A resource passed by name (resolved through the provider) or by definition. */
export type ResourceRef = string | AnyResource;

import { schemaToDocument } from 'json-schema-to-blocks';
import { composeRegistry, DocumentRenderer, missingTypes } from 'blocks-renderer';
import { walkNodes } from 'blocks-schema';
import type { UIDocument, UINode } from 'blocks-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultBlockRegistry, widgetRegistry } from '../registry';

function doc(page: UINode): UIDocument {
	return { formatVersion: '1.0', type: 'UISchema', id: 'doc-1', page };
}

function form(...children: UINode[]): UIDocument {
	return doc({
		type: 'Page',
		key: 'page',
		props: { title: 'New post' },
		children: [{ type: 'Form', key: 'form', props: {}, children }],
	});
}

function field(type: string, props: Record<string, unknown>): UINode {
	return { type, key: String(props.name ?? 'field'), props, children: [] };
}

describe('defaultBlockRegistry', () => {
	it('covers every widget and container type a generated document can use', () => {
		const document = schemaToDocument({
			$id: 'post',
			type: 'object',
			required: ['title'],
			properties: {
				title: { type: 'string', maxLength: 120 },
				body: { type: 'string' },
				status: { type: 'string', enum: ['draft', 'review', 'live', 'archived'] },
				visibility: { type: 'string', enum: ['public', 'private'] },
				published_at: { type: 'string', format: 'date-time' },
				reading_time: { type: 'integer' },
				featured: { type: 'boolean' },
				attachment: { type: 'string', format: 'data-url' },
				metadata: { type: 'object' },
			},
		});

		const used = [...walkNodes(document.page)].map((node) => node.type);
		expect(missingTypes(defaultBlockRegistry, used)).toEqual([]);
	});

	it('renders a generated document as a working form', () => {
		const document = schemaToDocument({
			$id: 'post',
			type: 'object',
			required: ['title'],
			properties: {
				title: { type: 'string', maxLength: 120, title: 'Title' },
				featured: { type: 'boolean', title: 'Featured' },
			},
		});

		render(<DocumentRenderer document={document} registry={defaultBlockRegistry} />);

		expect(screen.getByLabelText(/Title/)).toBeDefined();
		expect(screen.getByText('Featured')).toBeDefined();
		expect(screen.getByRole('button', { name: 'Submit' })).toBeDefined();
	});

	it('reads and writes the renderer form state rather than owning it', () => {
		const onChange = vi.fn();
		render(
			<DocumentRenderer
				document={form(field('Input', { name: 'title', label: 'Title' }))}
				registry={defaultBlockRegistry}
				initialValues={{ title: 'Draft' }}
				onChange={onChange}
			/>,
		);

		const input = screen.getByLabelText(/Title/) as HTMLInputElement;
		expect(input.value).toBe('Draft');

		fireEvent.change(input, { target: { value: 'Published' } });

		expect(onChange).toHaveBeenCalledWith({ title: 'Published' });
	});

	it('submits through the renderer, which validates the document constraints first', () => {
		const onSubmit = vi.fn();
		render(
			<DocumentRenderer
				document={form(field('Input', { name: 'title', label: 'Title', required: true }))}
				registry={defaultBlockRegistry}
				onSubmit={onSubmit}
			/>,
		);

		fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByText(/required/i)).toBeDefined();
	});

	it('renders a hidden field as nothing while keeping it in the document', () => {
		render(
			<DocumentRenderer
				document={form(field('Input', { name: 'tenant', label: 'Tenant', hidden: true }))}
				registry={defaultBlockRegistry}
			/>,
		);

		expect(screen.queryByLabelText(/Tenant/)).toBeNull();
	});

	it('marks every widget disabled in edit mode, where the document is the subject', () => {
		render(
			<DocumentRenderer
				document={form(field('Input', { name: 'title', label: 'Title' }))}
				registry={defaultBlockRegistry}
				mode="edit"
			/>,
		);

		expect((screen.getByLabelText(/Title/) as HTMLInputElement).disabled).toBe(true);
	});

	it('lets a host override one type without forking the set', () => {
		const registry = composeRegistry(defaultBlockRegistry, {
			Input: ({ props }) => <input data-custom="yes" name={String(props.name)} />,
		});

		render(<DocumentRenderer document={form(field('Input', { name: 'title' }))} registry={registry} />);

		expect(document.querySelector('[data-custom="yes"]')).not.toBeNull();
	});

	it('leaves data blocks unregistered, so an unsatisfied node stays visible', () => {
		expect(widgetRegistry.DataTable).toBeUndefined();
		expect(missingTypes(defaultBlockRegistry, ['DataTable'])).toEqual(['DataTable']);
	});
});

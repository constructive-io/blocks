// Showcase/Editing: editing cells on the DOM grid, with no network.
//
// The grid runs against `createMockExecute` from the package's `/testing` entry: a
// PostGraphile-shaped schema synthesized from the table below, with every document
// executed by graphql-js over in-memory rows. Each column's kind comes from its
// GraphQL type through the table model, as against a live server, so the cells
// edit with the same editors and parsers. Committed edits write to the story's rows.
//
// Stories with a play() (Storybook interaction tests):
//   - EditTextCell:   double-click a text cell, type, Enter; the cell shows the new value.
//   - EditJsonCell:   double-click the JSON cell, replace the text with valid JSON, Save.
//   - EditTypedCells: activation follows the column: a boolean toggles in place, a whole
//                     number edits inline, and the primary key is read-only with its reason.
//
// Stable selectors: each cell wrapper has the id `sheets-cell-<row>-<column>`; the inline
// editor is [data-slot="inline-cell-editor"]; the JSON overlay is a <textarea> with Save.
// Linked records, files and every other column kind are in Showcase/All Cell Types.
import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient } from '@tanstack/react-query';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { SheetsConfig } from '../context/sheets-context';
import { SheetsProvider } from '../context/sheets-provider';
import { Sheets } from '../grid/sheets';
import { createMockExecute, type MockTable } from '../testing/mock-sheets-provider';

const TABLE_NAME = 'Record';
const KEY_REASON = 'This field identifies the record, so it cannot be changed here.';

// A small mixed table in an explicit column order, so the play()s can find cells by value.
function buildTable(): MockTable {
	return {
		name: TABLE_NAME,
		fields: [
			{ name: 'id', gqlType: 'UUID', pgType: 'uuid' },
			{ name: 'title', gqlType: 'String', pgType: 'text' },
			{ name: 'score', gqlType: 'Int', pgType: 'int4' },
			{ name: 'config', gqlType: 'JSON', pgType: 'json' },
			{ name: 'dueDate', gqlType: 'Date', pgType: 'date' },
			{ name: 'isActive', gqlType: 'Boolean', pgType: 'bool' },
			{ name: 'homepage', gqlType: 'String', pgType: 'url' },
			{ name: 'tags', gqlType: 'String', pgType: 'text', isArray: true },
		],
		rows: [
			{
				id: '00000000-0000-4000-8000-000000000001',
				title: 'Quarterly report',
				score: 42,
				config: { draft: true, reviewers: 2 },
				dueDate: '2026-07-01',
				isActive: true,
				homepage: 'https://example.com/reports',
				tags: ['urgent', 'finance'],
			},
			{
				id: '00000000-0000-4000-8000-000000000002',
				title: 'Onboarding guide',
				score: 17,
				config: { draft: false, reviewers: 1 },
				dueDate: '2026-08-15',
				isActive: false,
				homepage: 'https://example.com/onboarding',
				tags: ['docs'],
			},
			{
				id: '00000000-0000-4000-8000-000000000003',
				title: 'Roadmap sync',
				score: 88,
				config: { draft: true, reviewers: 5 },
				dueDate: '2026-09-30',
				isActive: true,
				homepage: 'https://example.com/roadmap',
				tags: ['planning', 'team', 'q3'],
			},
		],
	};
}

// Each render builds fresh rows and a fresh backend, so committed edits never leak across stories.
function EditingGrid() {
	const config = useMemo<SheetsConfig>(() => ({
		endpoint: 'mock://editing',
		auth: { mode: 'embedded', getToken: () => 'story' },
		execute: createMockExecute({ tables: [buildTable()] }).execute,
		queryClient: new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
		}),
	}), []);
	return (
		<div style={{ height: 520, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
			<SheetsProvider config={config}>
				<Sheets tableName={TABLE_NAME} __impl='dom' />
			</SheetsProvider>
		</div>
	);
}

function cellOf(element: HTMLElement): HTMLElement {
	const cell = element.closest<HTMLElement>('[id^="sheets-cell-"]');
	expect(cell).not.toBeNull();
	return cell as HTMLElement;
}

const meta: Meta<typeof EditingGrid> = {
	title: 'Showcase/Editing',
	component: EditingGrid,
	parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof EditingGrid>;

// ─── Manual story: double-click any cell to edit it.
export const Overlays: Story = {
	render: () => <EditingGrid />,
	parameters: {
		docs: {
			description: {
				story:
					'Double-click a cell to edit it. Text and numbers edit in place (Enter commits, Escape cancels). JSON, dates, links and lists open an editor beside the cell; a click on a checkbox flips it. The `id` column identifies the record, so it is read-only and says why.',
			},
		},
	},
};

// ─── play(): text round trip on the `title` cell of row 1.
export const EditTextCell: Story = {
	render: () => <EditingGrid />,
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const cell = cellOf(await canvas.findByText('Quarterly report'));

		await step('Open the inline editor', async () => {
			await userEvent.dblClick(cell);
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).not.toBeNull());
		});

		const input = document.querySelector<HTMLInputElement>('[data-slot="inline-cell-editor"]');
		expect(input).toHaveValue('Quarterly report');

		await step('Type a new value and commit with Enter', async () => {
			await userEvent.clear(input as HTMLInputElement);
			await userEvent.type(input as HTMLInputElement, 'Annual report{Enter}');
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).toBeNull());
		});

		await step('The cell shows the committed value', async () => {
			await waitFor(() => expect(canvas.getByText('Annual report')).toBeInTheDocument());
			expect(canvas.queryByText('Quarterly report')).toBeNull();
		});
	},
};

// ─── play(): JSON round trip on the `config` cell of row 1. Save stays disabled on invalid JSON.
export const EditJsonCell: Story = {
	render: () => <EditingGrid />,
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const body = within(document.body);
		// A JSON cell shows its compact text: {"draft":true,"reviewers":2}.
		const cell = cellOf(await canvas.findByText(/"reviewers":2/));

		await step('Open the JSON editor', async () => {
			await userEvent.dblClick(cell);
			await waitFor(() => expect(document.querySelector('textarea')).not.toBeNull());
		});

		const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
		expect(JSON.parse((textarea as HTMLTextAreaElement).value)).toEqual({ draft: true, reviewers: 2 });

		await step('Replace with valid JSON and Save', async () => {
			await userEvent.clear(textarea as HTMLTextAreaElement);
			// `{` is a userEvent special character: type it escaped.
			await userEvent.type(textarea as HTMLTextAreaElement, '{{"draft":false,"reviewers":9}');
			const save = await body.findByRole('button', { name: /save/i });
			expect(save).toBeEnabled();
			await userEvent.click(save);
			await waitFor(() => expect(document.querySelector('textarea')).toBeNull());
		});

		await step('The cell shows the new value', async () => {
			await waitFor(() => expect(canvas.getByText(/"reviewers":9/)).toBeInTheDocument());
			expect(canvas.queryByText(/"reviewers":2/)).toBeNull();
		});
	},
};

// ─── play(): activation follows the column kind.
export const EditTypedCells: Story = {
	render: () => <EditingGrid />,
	parameters: {
		docs: {
			description: {
				story:
					'A click on the checkbox of a boolean flips it in place (no editor; Enter and double-click do the same), a whole number edits inline, and the primary key opens nothing and shows why it cannot be changed.',
			},
		},
	},
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('Boolean: one click on the checkbox flips it in place and opens no editor', async () => {
			// Row 1's isActive is true: a checked checkbox.
			const boolCell = await waitFor(() => {
				const found = canvasElement.querySelector<HTMLElement>('[data-slot="boolean-cell"]');
				expect(found).not.toBeNull();
				return found as HTMLElement;
			});
			expect(boolCell.querySelector('[data-slot="checkbox"]')?.getAttribute('aria-checked')).toBe('true');
			await userEvent.click(boolCell.querySelector<HTMLElement>('[data-slot="boolean-toggle"]')!);
			expect(document.querySelector('[data-slot="inline-cell-editor"]')).toBeNull();
			await waitFor(() => {
				const cell = canvasElement.querySelector<HTMLElement>('[data-slot="boolean-cell"]');
				expect(cell?.querySelector('[data-slot="checkbox"]')?.getAttribute('aria-checked')).toBe('false');
			});
		});

		await step('Whole number: double-click edits inline', async () => {
			const cell = cellOf(await canvas.findByText('42'));
			await userEvent.dblClick(cell);
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).not.toBeNull());
			const input = document.querySelector<HTMLInputElement>('[data-slot="inline-cell-editor"]');
			expect(input).toHaveValue('42');
			await userEvent.clear(input as HTMLInputElement);
			await userEvent.type(input as HTMLInputElement, '99{Enter}');
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).toBeNull());
			await waitFor(() => expect(canvas.getByText('99')).toBeInTheDocument());
		});

		await step('Primary key: read-only with its reason', async () => {
			const cell = cellOf(await canvas.findByText('00000000-0000-4000-8000-000000000001'));
			expect(cell.getAttribute('title')).toBe(KEY_REASON);
			await userEvent.dblClick(cell);
			expect(document.querySelector('[data-slot="inline-cell-editor"]')).toBeNull();
		});
	},
};

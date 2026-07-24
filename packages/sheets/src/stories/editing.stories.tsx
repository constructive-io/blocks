// Showcase/Editing — overlay editing on the ported TanStack DOM grid, driven by mocked
// in-memory data (no GraphQL / no hub server). Double-clicking a cell opens the NATIVE
// React-portal overlay editor (OverlayManager portals into document.body); committing
// flows through shell.commitCellValue -> the mock adapter's updateRow -> an optimistic
// re-render of the cell. The canvas path is untouched; every story renders the PUBLIC
// <Sheets tableName=… __impl="dom"> through the mock adapter for fidelity.
//
// Stories carrying a play() (Storybook interaction test, run by the test-runner / Gate):
//   - EditTextCell  : dbl-click a text cell -> inline [data-slot="inline-cell-editor"] <input>
//                     -> type -> Enter -> assert the cell shows the new value (inline round-trip).
//   - EditJsonCell  : dbl-click the json cell -> overlay <textarea> -> replace with valid
//                     JSON -> click Save -> assert the cell preview reflects the new object
//                     (json editor round-trip; the reused JsonEditor disables Save on invalid).
//   - EditTypedCells: the routing showcase — proves activation routes by the RESOLVED cell type.
//                     (a) a boolean column toggles in place on activate (NO editor; commits
//                     !current), (b) a number column edits IN PLACE (inline input — simple
//                     text-representable), (c) a color column edits inline too (`color` is just
//                     a hex/text string, no dedicated editor). url/json/date/relation keep overlays.
//
// play() uses `storybook/test` (Storybook v10's home of @storybook/test): within/userEvent/
// waitFor/expect. Stable selectors: the focusable cell wrapper is [tabindex="0"]; the inline
// editor input is [data-slot="inline-cell-editor"]; the json overlay exposes a <textarea> + Save.
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { MetaTable, MetaField } from '../forms/types';
import type { SheetsRow } from '../grid/row-model';
import { Sheets } from '../grid/sheets';
import { createMockAdapter } from './_support/mock-adapter';
import { ProviderHost } from './_support/decorators';

// ─── A mixed-type table built locally: text / number / json / date / relation / boolean /
// array columns, in an explicit order so the play()s can address columns by header text.
// Cell type is forced via field.type.pgAlias (the forcing channel resolveCellType reads).
const TABLE_NAME = 'records';

function field(name: string, gqlType: string, pgAlias: string, extra: Partial<MetaField['type']> = {}): MetaField {
	return {
		name,
		isNotNull: false,
		hasDefault: false,
		type: {
			gqlType,
			isArray: false,
			pgType: 'text',
			pgAlias,
			isNotNull: false,
			hasDefault: false,
			subtype: null,
			...extra
		}
	} as MetaField;
}

function buildEditingTable(): MetaTable {
	return {
		name: TABLE_NAME,
		schemaName: 'public',
		query: {
			all: 'records',
			create: 'createRecord',
			delete: 'deleteRecord',
			one: 'record',
			update: 'updateRecord'
		},
		fields: [
			field('id', 'UUID', 'uuid', { pgType: 'uuid', isNotNull: true }),
			field('title', 'String', 'text'),
			field('score', 'Int', 'integer', { pgType: 'int4' }),
			field('config', 'JSON', 'json', { pgType: 'json' }),
			field('dueDate', 'Date', 'date', { pgType: 'date' }),
			field('owner', 'JSON', 'relation'),
			field('isActive', 'Boolean', 'boolean', { pgType: 'bool' }),
			// `color` forces pgAlias 'color' -> resolveCellType => CellType 'color', which the
			// edit-intent enumeration routes to the plain TextEditor (no dedicated color editor).
			field('color', 'String', 'color'),
			field('tags', 'String', 'array', { isArray: true })
		],
		inflection: { allRows: 'records', connection: 'records', tableType: 'record' },
		indexes: [],
		constraints: { primaryKey: null, unique: [], foreignKey: [] },
		foreignKeyConstraints: [],
		primaryKeyConstraints: [],
		uniqueConstraints: [],
		relations: { belongsTo: [], has: [], hasOne: [], hasMany: [], manyToMany: [] }
	} as unknown as MetaTable;
}

// Deterministic, hand-authored rows — small + legible so the overlay editors and their
// committed results are easy to see (and to assert) in the showcase.
function buildRows(): SheetsRow[] {
	return [
		{
			id: 'rec-1',
			title: 'Quarterly report',
			score: 42,
			config: { draft: true, reviewers: 2 },
			dueDate: '2026-07-01',
			owner: { id: 'u-1', displayName: 'Grace Hopper' },
			isActive: true,
			color: '#3b82f6',
			tags: ['urgent', 'finance']
		},
		{
			id: 'rec-2',
			title: 'Onboarding guide',
			score: 17,
			config: { draft: false, reviewers: 1 },
			dueDate: '2026-08-15',
			owner: { id: 'u-2', displayName: 'Alan Turing' },
			isActive: false,
			color: '#ef4444',
			tags: ['docs']
		},
		{
			id: 'rec-3',
			title: 'Roadmap sync',
			score: 88,
			config: { draft: true, reviewers: 5 },
			dueDate: '2026-09-30',
			owner: { id: 'u-3', displayName: 'Ada Lovelace' },
			isActive: true,
			color: '#22c55e',
			tags: ['planning', 'team', 'q3']
		}
	];
}

// Each render gets a FRESH table+rows+adapter so committed edits never leak across stories
// (the mock adapter mutates its rows array in place).
function renderEditingSheets(): React.ReactElement {
	const table = buildEditingTable();
	const adapter = createMockAdapter({ table, rows: buildRows() });
	return (
		<ProviderHost adapter={adapter} height={520}>
			<Sheets tableName={TABLE_NAME} __impl='dom' />
		</ProviderHost>
	);
}

const meta: Meta<typeof Sheets> = {
	title: 'Showcase/Editing',
	component: Sheets,
	parameters: { layout: 'fullscreen' }
};

export default meta;

type Story = StoryObj<typeof Sheets>;

// ─── Manual story: the editable grid. Double-click any non-readonly cell (title/score/
// config/dueDate/owner/isActive/tags) to open its native overlay editor. `id` is a UUID,
// so it resolves readonly and won't open — parity with production.
export const Overlays: Story = {
	render: renderEditingSheets,
	parameters: {
		docs: {
			description: {
				story:
					'Double-click a cell to edit it. Simple text-representable cells (text / number / color) edit IN PLACE with a bare inline input (Enter commits, Escape cancels). The richer types open a native overlay editor — JSON a validated textarea, plus date / array / relation / url; booleans toggle in place. The `id` column is readonly.'
			}
		}
	}
};

// ─── play(): TEXT editor round-trip. Double-click the `title` cell of row 1, clear it,
// type a new value, press Enter, then assert the cell renders the committed text.
export const EditTextCell: Story = {
	render: renderEditingSheets,
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const body = within(document.body);

		// The first row's title cell — found by its current value text, then walked up to
		// the focusable wrapper that carries the double-click activation handler.
		const titleText = await canvas.findByText('Quarterly report');
		const cell = titleText.closest<HTMLElement>('[tabindex="0"]');
		expect(cell).not.toBeNull();

		await step('Open the inline text editor', async () => {
			await userEvent.dblClick(cell as HTMLElement);
			// Text edits IN PLACE — a bare <input> rendered inside the cell (NOT a portal overlay);
			// the input itself carries data-slot="inline-cell-editor".
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).not.toBeNull());
		});

		const input = document.querySelector<HTMLInputElement>('[data-slot="inline-cell-editor"]');
		expect(input).not.toBeNull();
		// Seeded from the cell's current value (and selected, so the first keystroke replaces).
		expect(input).toHaveValue('Quarterly report');

		await step('Type a new value and commit with Enter', async () => {
			await userEvent.clear(input as HTMLInputElement);
			await userEvent.type(input as HTMLInputElement, 'Annual report{Enter}');
			// The inline input unmounts on commit.
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).toBeNull());
		});

		await step('The cell shows the committed value', async () => {
			// commitCellValue -> adapter.updateRow -> optimistic re-render of the cell.
			await waitFor(() => expect(body.getByText('Annual report')).toBeInTheDocument());
			expect(canvas.queryByText('Quarterly report')).toBeNull();
		});
	}
};

// ─── play(): JSON editor round-trip. Double-click the `config` cell of row 1, replace the
// textarea contents with valid JSON, click Save, then assert the cell preview updated.
// (The reused JsonEditor keeps Save disabled on invalid JSON, so a malformed value can't commit.)
export const EditJsonCell: Story = {
	render: renderEditingSheets,
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const body = within(document.body);

		// The json cell renders a compact JSON preview (text.ts -> compactJsonPreview), so
		// row 1's config is the literal string {"draft":true,"reviewers":2}. Locate the cell
		// by a distinctive fragment of that preview, then walk up to the focusable wrapper —
		// the same idiom as the text story, immune to virtualized column ordering.
		const preview = await canvas.findByText(/"reviewers":2/);
		const cell = preview.closest<HTMLElement>('[tabindex="0"]');
		expect(cell).not.toBeNull();

		await step('Open the JSON overlay editor', async () => {
			await userEvent.dblClick(cell as HTMLElement);
			// The reused JsonEditor exposes a <textarea> seeded from the value.
			await waitFor(() => expect(document.querySelector('textarea')).not.toBeNull());
		});

		const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
		expect(textarea).not.toBeNull();
		expect(JSON.parse((textarea as HTMLTextAreaElement).value)).toEqual({ draft: true, reviewers: 2 });

		await step('Replace with valid JSON and Save', async () => {
			await userEvent.clear(textarea as HTMLTextAreaElement);
			// `{` is a userEvent special char — type it escaped so the literal brace lands.
			await userEvent.type(textarea as HTMLTextAreaElement, '{{"draft":false,"reviewers":9}');
			const save = await body.findByRole('button', { name: /save/i });
			expect(save).toBeEnabled();
			await userEvent.click(save);
			// Overlay closes on a successful (valid) commit.
			await waitFor(() => expect(document.querySelector('textarea')).toBeNull());
		});

		await step('The cell preview reflects the new committed object', async () => {
			// commitCellValue -> adapter.updateRow -> optimistic re-render; the new compact
			// preview {"draft":false,"reviewers":9} replaces the old one.
			await waitFor(() => expect(body.getByText(/"reviewers":9/)).toBeInTheDocument());
			expect(canvas.queryByText(/"reviewers":2/)).toBeNull();
		});
	}
};

// ─── play(): the routing showcase. Proves activation routes by the RESOLVED cell type. Three cells:
//   (a) BOOLEAN (isActive) — double-click toggles in place (commit !current); NO editor opens
//       and the cell flips from the token check (true) to the muted dash (false).
//   (b) NUMBER (score)     — double-click edits IN PLACE (inline [data-slot="inline-cell-editor"]
//       input — number is a simple text-representable type); typing + Enter commits the number.
//   (c) COLOR (color)      — double-click edits inline too. `color` is just a hex/text string with
//       no dedicated editor, so it edits in place like any simple text cell.
export const EditTypedCells: Story = {
	render: renderEditingSheets,
	parameters: {
		docs: {
			description: {
				story:
					'Routing-fix showcase: a boolean column toggles in place on activate (no overlay), a number column opens the native NumberEditor, and a color column opens the plain TextEditor (`color` is just a hex/text string, so it has no dedicated editor).'
			}
		}
	},
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const body = within(document.body);

		await step('(a) BOOLEAN: double-click toggles in place, opens NO overlay', async () => {
			// Row 1's isActive is true -> the first boolean cell renders a CHECKED read-only
			// Checkbox (data-slot="boolean-cell" wrapping data-slot="checkbox").
			const boolCell = canvasElement.querySelector<HTMLElement>('[data-slot="boolean-cell"]');
			expect(boolCell).not.toBeNull();
			expect(boolCell!.querySelector('[data-slot="checkbox"]')?.getAttribute('aria-checked')).toBe('true');
			const wrapper = boolCell!.closest<HTMLElement>('[tabindex="0"]');
			expect(wrapper).not.toBeNull();

			await userEvent.dblClick(wrapper as HTMLElement);

			// NO editor of any kind — the boolean must never open a text/number editor, inline or overlay.
			expect(document.querySelector('[data-slot="text-editor"]')).toBeNull();
			expect(document.querySelector('[data-slot="number-editor"]')).toBeNull();
			expect(document.querySelector('[data-slot="inline-cell-editor"]')).toBeNull();
			// commit !current -> the SAME cell's Checkbox flips to unchecked (aria-checked=false),
			// optimistic re-render off cell.data.
			await waitFor(() => {
				const cell = canvasElement.querySelector<HTMLElement>('[data-slot="boolean-cell"]');
				expect(cell?.querySelector('[data-slot="checkbox"]')?.getAttribute('aria-checked')).toBe('false');
			});
		});

		await step('(b) NUMBER: double-click edits inline (simple text-representable)', async () => {
			// Row 1's score is 42 (number cell, right-aligned). Find by value, walk to the wrapper.
			const scoreText = await canvas.findByText('42');
			const wrapper = scoreText.closest<HTMLElement>('[tabindex="0"]');
			expect(wrapper).not.toBeNull();

			await userEvent.dblClick(wrapper as HTMLElement);
			// The number edits IN PLACE — a bare inline <input>, never a portal overlay.
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).not.toBeNull());
			expect(document.querySelector('[data-slot="number-editor"]')).toBeNull();

			const input = document.querySelector<HTMLInputElement>('[data-slot="inline-cell-editor"]');
			expect(input).not.toBeNull();
			expect(input).toHaveValue('42');

			await userEvent.clear(input as HTMLInputElement);
			await userEvent.type(input as HTMLInputElement, '99{Enter}');
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).toBeNull());
			// commitCellValue -> adapter.updateRow -> optimistic re-render shows the committed number.
			await waitFor(() => expect(body.getByText('99')).toBeInTheDocument());
		});

		await step('(c) COLOR: double-click edits inline (no dedicated color editor)', async () => {
			const colorText = await canvas.findByText('#3b82f6');
			const wrapper = colorText.closest<HTMLElement>('[tabindex="0"]');
			expect(wrapper).not.toBeNull();

			await userEvent.dblClick(wrapper as HTMLElement);
			// color is a hex/text string with no dedicated editor → it edits inline like any text.
			await waitFor(() => expect(document.querySelector('[data-slot="inline-cell-editor"]')).not.toBeNull());
			expect(document.querySelector('[data-slot="number-editor"]')).toBeNull();

			const input = document.querySelector<HTMLInputElement>('[data-slot="inline-cell-editor"]');
			expect(input).not.toBeNull();
			// Seeded from the cell's current value.
			expect(input).toHaveValue('#3b82f6');
		});
	}
};

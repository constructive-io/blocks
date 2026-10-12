import type { Meta, StoryObj } from '@storybook/react-vite';

import { monogram } from '../../components/workspace-kit';
import { names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Workspace Kit Monogram',
	parameters: { breakUi: true },
};
export default meta;

const demo = ['Northwind Labs', 'Mira Sato', 'Acme Research'];
const worst = [...Object.values(names), '', ' ', '(EMEA) Procurement', '123 Industries', 'ÉCOLE Polytechnique'];

/** `monogram()` is the glyph in the sidebar switcher tile of the billing, console, and data-rooms templates. */
export const Tiles: StoryObj = {
	render: (_args, context) => {
		const list = (context.globals.dataset as string | undefined) === 'worst' ? worst : demo;
		return (
			<ul className="flex flex-col gap-2">
				{list.map((name, index) => (
					<li key={index} className="flex items-center gap-3 text-sm">
						<span className="grid size-5 shrink-0 place-items-center rounded-md bg-foreground text-[9px] font-semibold text-background">{monogram(name)}</span>
						<span className="font-mono text-xs text-muted-foreground">{JSON.stringify(name)}</span>
					</li>
				))}
			</ul>
		);
	},
};

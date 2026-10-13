import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchIcon } from 'lucide-react';

import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxValue,
} from '../../components/combobox';
import {
	caption,
	demoOptions,
	demoTags,
	manyOptions,
	manyTags,
	worstOptions,
	worstTags,
	type Option,
} from './b-fixtures';
import { pickDataset } from './dataset';
import { identifiers } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Combobox',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const demo = {
	options: demoOptions,
	selected: demoOptions[1] as Option | null,
	tags: demoTags,
	selectedTags: demoTags.slice(0, 2),
	narrowTags: demoTags.slice(0, 2),
};
const worst = {
	options: worstOptions,
	selected: worstOptions[1] as Option | null,
	tags: worstTags,
	selectedTags: worstTags,
	narrowTags: [worstTags[7], { value: 'snake', label: identifiers.snakeIdentifier }, worstTags[10]],
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

function OptionList() {
	return (
		<ComboboxList>
			{(item: Option) => (
				<ComboboxItem key={item.value} value={item}>
					{item.label}
				</ComboboxItem>
			)}
		</ComboboxList>
	);
}

function RichOptionList() {
	return (
		<ComboboxList>
			{(item: Option) => (
				<ComboboxItem key={item.value} value={item}>
					<div className="flex flex-col">
						<span>{item.label}</span>
						{item.description && <span className="text-muted-foreground text-xs">{item.description}</span>}
					</div>
				</ComboboxItem>
			)}
		</ComboboxList>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: { options: [], selected: null, tags: [], selectedTags: [], narrowTags: [] },
			one: {
				...demo,
				options: [demoOptions[0]],
				selected: demoOptions[0],
				tags: demoTags.slice(0, 1),
				selectedTags: demoTags.slice(0, 1),
				narrowTags: demoTags.slice(0, 1),
			},
			huge: {
				options: manyOptions,
				selected: manyOptions[776],
				tags: manyTags,
				selectedTags: manyTags.slice(0, 12),
				narrowTags: manyTags.slice(3, 6),
			},
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 56 }}>
				<Cell title="Single, form field 320px, selected value, clear button" width={320}>
					<Combobox items={data.options} defaultValue={data.selected}>
						<ComboboxInput placeholder="Pick a role" showClear data-testid="cb-single" />
						<ComboboxPopup>
							<ComboboxEmpty>No results found.</ComboboxEmpty>
							<OptionList />
						</ComboboxPopup>
					</Combobox>
				</Cell>

				<Cell title="Single, sidebar 240px, start addon + trigger" width={240}>
					<Combobox items={data.options} defaultValue={data.selected}>
						<ComboboxInput
							placeholder="Search workspaces and people"
							startAddon={<SearchIcon />}
							data-testid="cb-sidebar"
						/>
						<ComboboxPopup>
							<ComboboxEmpty>No results found.</ComboboxEmpty>
							<RichOptionList />
						</ComboboxPopup>
					</Combobox>
				</Cell>

				<Cell title="Multiple chips, form field 320px, every tag selected" width={320}>
					<Combobox multiple items={data.tags} defaultValue={data.selectedTags}>
						<ComboboxChips data-testid="cb-chips-320">
							<ComboboxValue>
								{(selected: Option[]) =>
									selected.map((item) => <ComboboxChip key={item.value}>{item.label}</ComboboxChip>)
								}
							</ComboboxValue>
							<ComboboxInput placeholder="Add a tag" />
						</ComboboxChips>
						<ComboboxPopup>
							<ComboboxEmpty>No tags found.</ComboboxEmpty>
							<OptionList />
						</ComboboxPopup>
					</Combobox>
				</Cell>

				<Cell title="Multiple chips, sidebar 240px" width={240}>
					<Combobox multiple items={data.tags} defaultValue={data.narrowTags}>
						<ComboboxChips data-testid="cb-chips-240">
							<ComboboxValue>
								{(selected: Option[]) =>
									selected.map((item) => <ComboboxChip key={item.value}>{item.label}</ComboboxChip>)
								}
							</ComboboxValue>
							<ComboboxInput placeholder="Add a tag" />
						</ComboboxChips>
						<ComboboxPopup>
							<ComboboxEmpty>No tags found.</ComboboxEmpty>
							<OptionList />
						</ComboboxPopup>
					</Combobox>
				</Cell>
			</div>
		);
	},
};

import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TagIcon } from 'lucide-react';

import { MultiSelect, type MultiSelectGroup, type MultiSelectOption } from '../../components/multi-select';
import { caption, demoTags, manyTags, worstTags } from './b-fixtures';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/MultiSelect',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const toOption = (tag: { value: string; label: string }): MultiSelectOption => ({ value: tag.value, label: tag.label });

const demoOptions = demoTags.map(toOption);
const worstOptions: MultiSelectOption[] = [
	...worstTags.map(toOption),
	{ value: 'snake', label: identifiers.snakeIdentifier },
	{ value: 'german', label: labels.german, description: labels.status },
	{ value: 'email', label: emails.long, description: emails.subdomains },
	{ value: 'cjk', label: names.cjk, icon: TagIcon },
	{ value: 'rtl', label: names.rtl },
	{ value: 'file', label: identifiers.fileName, description: identifiers.url },
];
const worstGroups: MultiSelectGroup[] = [
	{ heading: 'Workspaces inherited from the Northwind Industries Holdings organization', options: worstOptions.slice(0, 8) },
	{ heading: 'Custom', options: worstOptions.slice(8) },
];

const demo = {
	options: demoOptions,
	grouped: [{ heading: 'Tags', options: demoOptions }],
	selected: ['design', 'frontend'],
	narrow: ['design', 'frontend'],
	everything: ['design', 'frontend'],
};
const worst = {
	options: worstOptions,
	grouped: worstGroups,
	// All twelve tags, then the unbreakable ones, so the trigger carries the worst of both.
	selected: [...worstTags.map((tag) => tag.value), 'snake'],
	narrow: ['customer-feedback-from-enterprise-onboarding', 'snake', 'v2'],
	everything: worstOptions.map((option) => option.value),
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: { options: [], grouped: [], selected: [], narrow: [], everything: [] },
			one: { options: demoOptions.slice(0, 1), grouped: [], selected: ['design'], narrow: ['design'], everything: ['design'] },
			huge: {
				options: manyTags.map(toOption),
				grouped: [],
				selected: manyTags.slice(0, 12).map((tag) => tag.value),
				narrow: manyTags.slice(3, 6).map((tag) => tag.value),
				everything: manyTags.map((tag) => tag.value),
			},
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 56 }}>
				<Cell title="Form field 320px, 12+ selected, maxCount 3 (default)" width={320}>
					<MultiSelect
						options={data.options}
						defaultValue={data.selected}
						onValueChange={() => {}}
						placeholder="Select tags"
						data-testid="ms-320"
					/>
				</Cell>

				<Cell title="Sidebar 240px, 3 selected incl. long tag" width={240}>
					<MultiSelect
						options={data.options}
						defaultValue={data.narrow}
						onValueChange={() => {}}
						placeholder="Select tags"
						data-testid="ms-240"
					/>
				</Cell>

				<Cell title="Sidebar 240px, maxCount 12 (every chip shown)" width={240}>
					<MultiSelect
						options={data.options}
						defaultValue={data.selected}
						onValueChange={() => {}}
						maxCount={12}
						placeholder="Select tags"
						data-testid="ms-240-all"
					/>
				</Cell>

				<Cell title="Single line (horizontal scroll) 320px" width={320}>
					<MultiSelect
						options={data.options}
						defaultValue={data.selected}
						onValueChange={() => {}}
						maxCount={12}
						singleLine
						placeholder="Select tags"
						data-testid="ms-single-line"
					/>
				</Cell>

				<Cell title="Table-header filter 160px, nothing selected" width={160}>
					<MultiSelect
						options={data.options}
						defaultValue={[]}
						onValueChange={() => {}}
						placeholder="Select tags"
						data-testid="ms-160"
					/>
				</Cell>

				<Cell title="Select all: every option selected, 320px" width={320}>
					<MultiSelect
						options={data.options}
						defaultValue={data.everything}
						onValueChange={() => {}}
						placeholder="Select tags"
						data-testid="ms-all"
					/>
				</Cell>

				<Cell title="Grouped, long heading, 320px" width={320}>
					<MultiSelect
						options={data.grouped.length ? data.grouped : data.options}
						defaultValue={data.selected.slice(0, 2)}
						onValueChange={() => {}}
						placeholder="Select tags"
						data-testid="ms-grouped"
					/>
				</Cell>
			</div>
		);
	},
};

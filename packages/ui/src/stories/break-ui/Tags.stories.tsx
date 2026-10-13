import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckIcon } from 'lucide-react';

import {
	Tags,
	TagsContent,
	TagsEmpty,
	TagsInput,
	TagsItem,
	TagsList,
	TagsTrigger,
	TagsValue,
} from '../../components/tags';
import { caption, demoTags, manyTags, worstTags, type Option } from './b-fixtures';
import { pickDataset } from './dataset';
import { identifiers } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Tags',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const demo = { options: demoTags, selected: ['design', 'frontend'], narrow: ['design'] };
const worst = {
	options: [...worstTags, { value: 'snake', label: identifiers.snakeIdentifier }],
	selected: worstTags.map((tag) => tag.value),
	narrow: ['customer-feedback-from-enterprise-onboarding', 'snake', 'v2'],
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

/** Controlled multi-select built from the Tags parts, the way a consumer composes them. */
function TagsPicker({ options, initial, testId }: { options: Option[]; initial: string[]; testId: string }) {
	const [selected, setSelected] = useState<string[]>(initial);
	const toggle = (value: string) =>
		setSelected((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

	return (
		<Tags>
			<TagsTrigger data-testid={testId}>
				{selected.map((value) => (
					<TagsValue key={value} onRemove={() => toggle(value)}>
						{options.find((option) => option.value === value)?.label ?? value}
					</TagsValue>
				))}
			</TagsTrigger>
			<TagsContent>
				<TagsInput placeholder="Search tags" />
				<TagsList>
					<TagsEmpty>No tags found.</TagsEmpty>
					{options.map((option) => (
						<TagsItem key={option.value} value={option.label} onSelect={() => toggle(option.value)}>
							{option.label}
							{selected.includes(option.value) && <CheckIcon className="size-4" />}
						</TagsItem>
					))}
				</TagsList>
			</TagsContent>
		</Tags>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: { options: [], selected: [], narrow: [] },
			one: { options: demoTags.slice(0, 1), selected: ['design'], narrow: ['design'] },
			huge: { options: manyTags, selected: manyTags.slice(0, 12).map((tag) => tag.value), narrow: ['team-4'] },
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 56 }}>
				<Cell title="Form field 320px, every tag selected" width={320}>
					<TagsPicker options={data.options} initial={data.selected} testId="tags-320" />
				</Cell>
				<Cell title="Sidebar 240px, long hyphenated + unbreakable tags" width={240}>
					<TagsPicker options={data.options} initial={data.narrow} testId="tags-240" />
				</Cell>
				<Cell title="Nothing selected, 320px" width={320}>
					<TagsPicker options={data.options} initial={[]} testId="tags-none" />
				</Cell>
			</div>
		);
	},
};

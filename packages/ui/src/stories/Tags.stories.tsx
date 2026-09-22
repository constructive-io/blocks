import { useState } from 'react';
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
} from '../components/tags';

const meta: Meta<typeof Tags> = {
	title: 'UI/Tags',
	component: Tags,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const STATUSES = [
	{ label: 'Published', value: 'published' },
	{ label: 'Draft', value: 'draft' },
	{ label: 'Scheduled', value: 'scheduled' },
	{ label: 'Archived', value: 'archived' },
];

function TagsDemo() {
	const [selected, setSelected] = useState<string>('');

	return (
		<div className='w-72'>
			<Tags value={selected} setValue={setSelected}>
				<TagsTrigger>
					{selected ? (
						<TagsValue onRemove={() => setSelected('')}>
							{STATUSES.find((s) => s.value === selected)?.label}
						</TagsValue>
					) : (
						<span className='text-muted-foreground'>Select status…</span>
					)}
				</TagsTrigger>
				<TagsContent>
					<TagsInput placeholder='Search status…' />
					<TagsList>
						<TagsEmpty>No statuses found.</TagsEmpty>
						{STATUSES.map((status) => (
							<TagsItem key={status.value} value={status.value} onSelect={setSelected}>
								{status.label}
								{selected === status.value && <CheckIcon className='ml-auto size-4' />}
							</TagsItem>
						))}
					</TagsList>
				</TagsContent>
			</Tags>
		</div>
	);
}

export const Default: Story = {
	render: () => <TagsDemo />,
};

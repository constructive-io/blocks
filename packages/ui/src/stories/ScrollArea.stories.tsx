import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScrollArea, ScrollBar } from '../components/scroll-area';
import { Separator } from '../components/separator';

const meta: Meta<typeof ScrollArea> = {
	title: 'UI/ScrollArea',
	component: ScrollArea,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const TAGS = Array.from({ length: 40 }, (_, i) => `v1.${i + 1}.0`);

export const Vertical: Story = {
	render: () => (
		<ScrollArea className='h-64 w-56 rounded-md border'>
			<div className='p-3'>
				<p className='mb-2 text-xs font-medium text-muted-foreground'>Releases</p>
				{TAGS.map((tag) => (
					<div key={tag}>
						<div className='py-1.5 font-mono text-xs'>{tag}</div>
						<Separator />
					</div>
				))}
			</div>
		</ScrollArea>
	),
};

export const Horizontal: Story = {
	render: () => (
		<ScrollArea className='w-72 rounded-md border'>
			<div className='flex gap-3 p-3'>
				{Array.from({ length: 12 }, (_, i) => (
					<div
						key={i}
						className='flex h-20 w-24 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs text-muted-foreground'
					>
						{String(i + 1).padStart(2, '0')}
					</div>
				))}
			</div>
			<ScrollBar orientation='horizontal' />
		</ScrollArea>
	),
};

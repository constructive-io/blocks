import type { Meta, StoryObj } from '@storybook/react-vite';

import { Spinner } from '../components/spinner';

const meta: Meta<typeof Spinner> = {
	title: 'UI/Spinner',
	component: Spinner,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
	render: () => (
		<div className='flex items-center gap-4 text-muted-foreground'>
			<Spinner className='size-3' />
			<Spinner />
			<Spinner className='size-6' />
			<Spinner className='size-8' />
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className='flex items-center gap-2 text-sm text-muted-foreground'>
			<Spinner /> Syncing schema…
		</div>
	),
};

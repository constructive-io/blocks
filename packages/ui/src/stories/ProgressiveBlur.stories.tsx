import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProgressiveBlur } from '../components/progressive-blur';

const meta: Meta<typeof ProgressiveBlur> = {
	title: 'UI/ProgressiveBlur',
	component: ProgressiveBlur,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		position: {
			control: { type: 'select' },
			options: ['top', 'bottom', 'both'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const Rows = () => (
	<div className='h-full space-y-2 overflow-hidden p-3'>
		{Array.from({ length: 14 }, (_, i) => (
			<div key={i} className='h-6 rounded bg-muted' />
		))}
	</div>
);

export const Bottom: Story = {
	render: (args) => (
		<div className='relative h-56 w-[420px] overflow-hidden rounded-md border'>
			<Rows />
			<ProgressiveBlur {...args} position='bottom' />
		</div>
	),
};

export const Both: Story = {
	render: () => (
		<div className='relative h-56 w-[420px] overflow-hidden rounded-md border'>
			<Rows />
			<ProgressiveBlur position='both' />
		</div>
	),
};

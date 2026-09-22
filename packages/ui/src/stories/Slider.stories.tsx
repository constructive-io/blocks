import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Label } from '../components/label';
import { Slider } from '../components/slider';

const meta: Meta<typeof Slider> = {
	title: 'UI/Slider',
	component: Slider,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		disabled: { control: { type: 'boolean' } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<div className='w-72'>
			<Slider defaultValue={40} {...args} />
		</div>
	),
};

export const Controlled: Story = {
	render: () => {
		const [value, setValue] = useState(2500);
		return (
			<div className='w-72 space-y-2'>
				<div className='flex items-baseline justify-between'>
					<Label>Threshold</Label>
					<span className='text-sm font-medium tabular-nums'>${value.toLocaleString()}</span>
				</div>
				<Slider value={value} onValueChange={(v) => setValue(v as number)} min={0} max={10000} step={100} />
			</div>
		);
	},
};

export const Range: Story = {
	render: () => (
		<div className='w-72'>
			<Slider defaultValue={[25, 75]} aria-label='Range' />
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className='w-72'>
			<Slider defaultValue={60} disabled aria-label='Disabled slider' />
		</div>
	),
};

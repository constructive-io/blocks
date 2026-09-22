import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '../components/toggle-group';

const meta: Meta<typeof ToggleGroup> = {
	title: 'UI/ToggleGroup',
	component: ToggleGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
	render: () => (
		<ToggleGroup defaultValue={['center']} aria-label='Text alignment'>
			<ToggleGroupItem value='left' aria-label='Align left'>
				<AlignLeft />
			</ToggleGroupItem>
			<ToggleGroupItem value='center' aria-label='Align center'>
				<AlignCenter />
			</ToggleGroupItem>
			<ToggleGroupItem value='right' aria-label='Align right'>
				<AlignRight />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Multiple: Story = {
	render: () => (
		<ToggleGroup multiple defaultValue={['bold']} variant='outline' spacing={1} aria-label='Text style'>
			<ToggleGroupItem value='bold' aria-label='Bold'>
				<Bold />
			</ToggleGroupItem>
			<ToggleGroupItem value='italic' aria-label='Italic'>
				<Italic />
			</ToggleGroupItem>
			<ToggleGroupItem value='underline' aria-label='Underline'>
				<Underline />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Text: Story = {
	render: () => (
		<ToggleGroup defaultValue={['week']} spacing={1} aria-label='Range'>
			<ToggleGroupItem value='day'>Day</ToggleGroupItem>
			<ToggleGroupItem value='week'>Week</ToggleGroupItem>
			<ToggleGroupItem value='month'>Month</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Disabled: Story = {
	render: () => (
		<ToggleGroup disabled defaultValue={['a']} aria-label='Disabled group'>
			<ToggleGroupItem value='a'>Alpha</ToggleGroupItem>
			<ToggleGroupItem value='b'>Beta</ToggleGroupItem>
		</ToggleGroup>
	),
};

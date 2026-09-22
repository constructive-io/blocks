import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bold, Italic, Star, Underline } from 'lucide-react';

import { Toggle } from '../components/toggle';

const meta: Meta<typeof Toggle> = {
	title: 'UI/Toggle',
	component: Toggle,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: { control: { type: 'select' }, options: ['default', 'outline'] },
		size: { control: { type: 'select' }, options: ['sm', 'default', 'lg'] },
		disabled: { control: { type: 'boolean' } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<Toggle aria-label='Toggle bold' {...args}>
			<Bold />
		</Toggle>
	),
};

export const Outline: Story = {
	render: () => (
		<Toggle variant='outline' aria-label='Toggle italic'>
			<Italic />
		</Toggle>
	),
};

export const WithText: Story = {
	render: () => (
		<Toggle defaultPressed aria-label='Toggle starred'>
			<Star /> Starred
		</Toggle>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className='flex items-center gap-2'>
			<Toggle size='sm' aria-label='Small'>
				<Underline />
			</Toggle>
			<Toggle size='default' aria-label='Default'>
				<Bold />
			</Toggle>
			<Toggle size='lg' aria-label='Large'>
				<Italic />
			</Toggle>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<Toggle disabled aria-label='Disabled toggle'>
			<Bold />
		</Toggle>
	),
};

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from '../components/badge';

const meta: Meta<typeof Badge> = {
	title: 'UI/Badge',
	component: Badge,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info', 'error'],
		},
		size: {
			control: { type: 'select' },
			options: ['default', 'sm', 'lg'],
		},
	},
	args: {
		children: 'Badge',
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		variant: 'default',
		children: 'Badge',
	},
};

export const Secondary: Story = {
	args: {
		variant: 'secondary',
		children: 'Secondary',
	},
};

export const Destructive: Story = {
	args: {
		variant: 'destructive',
		children: 'Destructive',
	},
};

export const Outline: Story = {
	args: {
		variant: 'outline',
		children: 'Outline',
	},
};

export const Success: Story = {
	args: {
		variant: 'success',
		children: 'Success',
	},
};

export const WithIcon: Story = {
	args: {
		children: (
			<>
				<svg className='mr-1 h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
					<path
						fillRule='evenodd'
						d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
						clipRule='evenodd'
					/>
				</svg>
				Verified
			</>
		),
	},
};

export const Count: Story = {
	args: {
		variant: 'secondary',
		children: '42',
	},
};

export const Status: Story = {
	args: {
		variant: 'outline',
		children: 'Online',
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-wrap gap-2'>
			<Badge variant='default'>Default</Badge>
			<Badge variant='secondary'>Secondary</Badge>
			<Badge variant='destructive'>Destructive</Badge>
			<Badge variant='outline'>Outline</Badge>
		</div>
	),
};

export const DifferentStates: Story = {
	render: () => (
		<div className='flex flex-wrap gap-2'>
			<Badge>Default</Badge>
			<Badge variant='success'>Success</Badge>
			<Badge variant='error'>Error</Badge>
			<Badge variant='info'>Info</Badge>
			<Badge variant='warning'>Warning</Badge>
		</div>
	),
};

export const WithCounts: Story = {
	render: () => (
		<div className='flex flex-wrap gap-2'>
			<Badge variant='secondary'>1</Badge>
			<Badge variant='secondary'>12</Badge>
			<Badge variant='secondary'>99+</Badge>
			<Badge variant='destructive'>!</Badge>
		</div>
	),
};

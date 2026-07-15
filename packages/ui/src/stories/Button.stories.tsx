import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';

const meta: Meta<typeof Button> = {
	title: 'UI/Button',
	component: Button,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['default', 'destructive', 'destructive-outline', 'outline', 'secondary', 'ghost', 'link'],
		},
		size: {
			control: { type: 'select' },
			options: ['default', 'xs', 'sm', 'lg', 'icon'],
		},
		asChild: {
			control: { type: 'boolean' },
		},
		disabled: {
			control: { type: 'boolean' },
		},
	},
	args: {
		children: 'Button',
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		variant: 'default',
		children: 'Button',
	},
};

export const Destructive: Story = {
	args: {
		variant: 'destructive',
		children: 'Delete',
	},
};

export const DestructiveOutline: Story = {
	args: {
		variant: 'destructive-outline',
		children: 'Delete',
	},
};

export const Outline: Story = {
	args: {
		variant: 'outline',
		children: 'Button',
	},
};

export const Secondary: Story = {
	args: {
		variant: 'secondary',
		children: 'Secondary',
	},
};

export const Ghost: Story = {
	args: {
		variant: 'ghost',
		children: 'Ghost',
	},
};

export const Link: Story = {
	args: {
		variant: 'link',
		children: 'Link',
	},
};

export const Small: Story = {
	args: {
		size: 'sm',
		children: 'Small',
	},
};

export const Large: Story = {
	args: {
		size: 'lg',
		children: 'Large',
	},
};

export const ExtraSmall: Story = {
	args: {
		size: 'xs',
		children: 'XS',
	},
};

export const Icon: Story = {
	args: {
		size: 'icon',
		children: '⚙️',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		children: 'Disabled',
	},
};

export const Loading: Story = {
	args: {
		disabled: true,
		children: (
			<>
				<div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
				Loading...
			</>
		),
	},
};

export const WithIcon: Story = {
	args: {
		children: (
			<>
				<svg className='mr-2 h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
					<path
						fillRule='evenodd'
						d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z'
						clipRule='evenodd'
					/>
				</svg>
				Add Item
			</>
		),
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-wrap gap-2'>
			<Button variant='default'>Default</Button>
			<Button variant='destructive'>Destructive</Button>
			<Button variant='destructive-outline'>Destructive Outline</Button>
			<Button variant='outline'>Outline</Button>
			<Button variant='secondary'>Secondary</Button>
			<Button variant='ghost'>Ghost</Button>
			<Button variant='link'>Link</Button>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className='flex items-center gap-2'>
			<Button size='xs'>XS</Button>
			<Button size='sm'>Small</Button>
			<Button size='default'>Default</Button>
			<Button size='lg'>Large</Button>
			<Button size='icon'>🔧</Button>
		</div>
	),
};

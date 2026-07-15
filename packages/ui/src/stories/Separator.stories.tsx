import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from '../components/separator';

const meta: Meta<typeof Separator> = {
	title: 'UI/Separator',
	component: Separator,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		orientation: {
			control: { type: 'select' },
			options: ['horizontal', 'vertical'],
		},
		decorative: {
			control: { type: 'boolean' },
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className='w-[300px]'>
			<div className='space-y-1'>
				<h4 className='text-sm leading-none font-medium'>Base UI Primitives</h4>
				<p className='text-muted-foreground text-sm'>An open-source UI component library.</p>
			</div>
			<Separator className='my-4' />
			<div className='flex h-5 items-center space-x-4 text-sm'>
				<div>Blog</div>
				<Separator orientation='vertical' />
				<div>Docs</div>
				<Separator orientation='vertical' />
				<div>Source</div>
			</div>
		</div>
	),
};

export const Horizontal: Story = {
	render: () => (
		<div className='w-[300px] space-y-4'>
			<p>Content above the separator</p>
			<Separator />
			<p>Content below the separator</p>
		</div>
	),
};

export const Vertical: Story = {
	render: () => (
		<div className='flex h-5 items-center space-x-4 text-sm'>
			<div>Home</div>
			<Separator orientation='vertical' />
			<div>About</div>
			<Separator orientation='vertical' />
			<div>Contact</div>
		</div>
	),
};

export const Navigation: Story = {
	render: () => (
		<div className='space-y-4'>
			<nav className='flex space-x-4 text-sm font-medium'>
				<a href='#' className='text-foreground hover:text-foreground/80 transition-colors'>
					Overview
				</a>
				<a href='#' className='text-muted-foreground hover:text-foreground transition-colors'>
					Customers
				</a>
				<a href='#' className='text-muted-foreground hover:text-foreground transition-colors'>
					Products
				</a>
				<a href='#' className='text-muted-foreground hover:text-foreground transition-colors'>
					Settings
				</a>
			</nav>
			<Separator />
			<div className='text-muted-foreground text-sm'>This is the content area.</div>
		</div>
	),
};

export const InCard: Story = {
	render: () => (
		<div className='w-[350px] rounded-lg border p-6'>
			<div className='space-y-4'>
				<div>
					<h3 className='text-lg font-semibold'>Account Details</h3>
					<p className='text-muted-foreground text-sm'>Manage your account information.</p>
				</div>
				<Separator />
				<div className='space-y-2'>
					<div>
						<label className='text-sm font-medium'>Name</label>
						<p className='text-muted-foreground text-sm'>John Doe</p>
					</div>
					<div>
						<label className='text-sm font-medium'>Email</label>
						<p className='text-muted-foreground text-sm'>john@example.com</p>
					</div>
				</div>
				<Separator />
				<div className='flex justify-end space-x-2'>
					<button className='px-3 py-1 text-sm'>Cancel</button>
					<button className='bg-primary text-primary-foreground rounded px-3 py-1 text-sm'>Save Changes</button>
				</div>
			</div>
		</div>
	),
};

export const Breadcrumbs: Story = {
	render: () => (
		<div className='flex items-center space-x-2 text-sm'>
			<a href='#' className='text-muted-foreground hover:text-foreground'>
				Home
			</a>
			<Separator orientation='vertical' className='h-4' />
			<a href='#' className='text-muted-foreground hover:text-foreground'>
				Products
			</a>
			<Separator orientation='vertical' className='h-4' />
			<span className='text-foreground'>Laptop</span>
		</div>
	),
};

export const Sidebar: Story = {
	render: () => (
		<div className='flex h-[200px] w-[400px] overflow-hidden rounded-lg border'>
			<div className='bg-muted/20 w-[150px] p-4'>
				<h4 className='mb-2 text-sm font-medium'>Navigation</h4>
				<div className='space-y-1 text-sm'>
					<div className='py-1'>Dashboard</div>
					<div className='text-muted-foreground py-1'>Analytics</div>
					<div className='text-muted-foreground py-1'>Reports</div>
				</div>
			</div>
			<Separator orientation='vertical' />
			<div className='flex-1 p-4'>
				<h4 className='mb-2 text-sm font-medium'>Content</h4>
				<p className='text-muted-foreground text-sm'>This is the main content area.</p>
			</div>
		</div>
	),
};

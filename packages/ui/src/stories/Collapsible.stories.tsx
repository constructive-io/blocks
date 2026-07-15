import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsIcon, InfoIcon } from 'lucide-react';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	CollapsibleIcon,
} from '../components/collapsible';
import { Button } from '../components/button';

const meta: Meta<typeof Collapsible> = {
	title: 'UI/Collapsible',
	component: Collapsible,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Collapsible className='w-[350px] rounded-lg border'>
			<CollapsibleTrigger className='px-4 py-3 hover:bg-accent/50'>
				<span>Click to expand</span>
				<CollapsibleIcon />
			</CollapsibleTrigger>
			<CollapsibleContent innerClassName='border-t px-4'>
				<p className='text-muted-foreground'>
					This is the collapsible content. It can contain any content you want to show or hide.
				</p>
			</CollapsibleContent>
		</Collapsible>
	),
};

export const DefaultOpen: Story = {
	render: () => (
		<Collapsible defaultOpen className='w-[350px] rounded-lg border'>
			<CollapsibleTrigger className='px-4 py-3 hover:bg-accent/50'>
				<span>Expanded by default</span>
				<CollapsibleIcon />
			</CollapsibleTrigger>
			<CollapsibleContent innerClassName='border-t px-4'>
				<p className='text-muted-foreground'>
					This collapsible is open by default using the defaultOpen prop.
				</p>
			</CollapsibleContent>
		</Collapsible>
	),
};

export const Controlled: Story = {
	render: function ControlledExample() {
		const [open, setOpen] = useState(false);

		return (
			<div className='w-[350px] space-y-2'>
				<div className='flex items-center justify-between'>
					<span className='text-sm font-medium'>Controlled collapsible</span>
					<Button variant='outline' size='sm' onClick={() => setOpen(!open)}>
						{open ? 'Close' : 'Open'}
					</Button>
				</div>
				<Collapsible open={open} onOpenChange={setOpen} className='rounded-lg border'>
					<CollapsibleTrigger className='px-4 py-3 hover:bg-accent/50'>
						<span>@peduarte starred 3 repositories</span>
						<CollapsibleIcon />
					</CollapsibleTrigger>
					<CollapsibleContent innerClassName='border-t px-4'>
						<div className='space-y-2 pt-2'>
							<div className='rounded-md border px-4 py-2'>@base-ui/react</div>
							<div className='rounded-md border px-4 py-2'>@tailwindcss/vite</div>
							<div className='rounded-md border px-4 py-2'>lucide-react</div>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		);
	},
};

export const WithAsChild: Story = {
	render: () => (
		<Collapsible className='w-[350px] rounded-lg border'>
			<CollapsibleTrigger asChild>
				<Button variant='ghost' className='w-full justify-between rounded-b-none'>
					<span>Toggle with Button</span>
					<CollapsibleIcon />
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent innerClassName='border-t px-4'>
				<p className='text-muted-foreground'>
					The trigger uses asChild to render a Button component instead of the default element.
				</p>
			</CollapsibleContent>
		</Collapsible>
	),
};

export const SettingsPanel: Story = {
	render: () => (
		<div className='w-[400px] space-y-2'>
			<Collapsible defaultOpen className='rounded-lg border bg-muted/30'>
				<CollapsibleTrigger className='gap-2 px-4 py-3 hover:bg-muted/50'>
					<div className='flex items-center gap-2'>
						<SettingsIcon className='h-4 w-4' />
						<span>Advanced Settings</span>
					</div>
					<CollapsibleIcon />
				</CollapsibleTrigger>
				<CollapsibleContent innerClassName='border-t px-4'>
					<div className='space-y-3'>
						<div className='flex items-center justify-between'>
							<span>Enable notifications</span>
							<span className='text-muted-foreground'>On</span>
						</div>
						<div className='flex items-center justify-between'>
							<span>Auto-save drafts</span>
							<span className='text-muted-foreground'>Every 5 minutes</span>
						</div>
						<div className='flex items-center justify-between'>
							<span>Debug mode</span>
							<span className='text-muted-foreground'>Off</span>
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	),
};

export const FAQ: Story = {
	render: () => (
		<div className='w-[450px] divide-y rounded-lg border'>
			<Collapsible>
				<CollapsibleTrigger className='px-4 py-3 hover:bg-accent/50'>
					<span>What is your return policy?</span>
					<CollapsibleIcon />
				</CollapsibleTrigger>
				<CollapsibleContent innerClassName='border-t px-4'>
					<p className='text-muted-foreground'>
						We offer a 30-day return policy for all unused items in their original packaging. Please contact our
						support team to initiate a return.
					</p>
				</CollapsibleContent>
			</Collapsible>

			<Collapsible>
				<CollapsibleTrigger className='px-4 py-3 hover:bg-accent/50'>
					<span>How long does shipping take?</span>
					<CollapsibleIcon />
				</CollapsibleTrigger>
				<CollapsibleContent innerClassName='border-t px-4'>
					<p className='text-muted-foreground'>
						Standard shipping takes 5-7 business days. Express shipping is available for 2-3 business day delivery.
					</p>
				</CollapsibleContent>
			</Collapsible>

			<Collapsible>
				<CollapsibleTrigger className='px-4 py-3 hover:bg-accent/50'>
					<span>Do you offer international shipping?</span>
					<CollapsibleIcon />
				</CollapsibleTrigger>
				<CollapsibleContent innerClassName='border-t px-4'>
					<p className='text-muted-foreground'>
						Yes, we ship to over 50 countries worldwide. International shipping rates and times vary by location.
					</p>
				</CollapsibleContent>
			</Collapsible>
		</div>
	),
};

export const WithIcon: Story = {
	render: () => (
		<Collapsible className='w-[350px] overflow-hidden rounded-lg border border-info/40 dark:border-info/30'>
			<CollapsibleTrigger className='gap-2 bg-info/8 px-4 py-3 text-info-foreground hover:bg-info/12 dark:bg-info/16 dark:hover:bg-info/20'>
				<div className='flex items-center gap-2'>
					<InfoIcon className='h-4 w-4' />
					<span>Important Information</span>
				</div>
				<CollapsibleIcon className='text-info-foreground' />
			</CollapsibleTrigger>
			<CollapsibleContent innerClassName='border-t border-info/40 bg-info/4 px-4 dark:border-info/30 dark:bg-info/8'>
				<p className='text-info-foreground'>
					This is important information that users may want to read. Click the header again to collapse this section.
				</p>
			</CollapsibleContent>
		</Collapsible>
	),
};

export const Nested: Story = {
	render: () => (
		<Collapsible defaultOpen className='w-[400px] rounded-lg border'>
			<CollapsibleTrigger className='px-4 py-3 hover:bg-accent/50'>
				<span>Parent Section</span>
				<CollapsibleIcon />
			</CollapsibleTrigger>
			<CollapsibleContent innerClassName='border-t px-4'>
				<div className='space-y-2'>
					<p className='text-muted-foreground'>Parent content here.</p>

					<Collapsible className='rounded-md border'>
						<CollapsibleTrigger className='px-3 py-2 text-sm hover:bg-accent/50'>
							<span>Nested Section 1</span>
							<CollapsibleIcon className='h-3 w-3' />
						</CollapsibleTrigger>
						<CollapsibleContent innerClassName='border-t px-3'>
							<p className='text-muted-foreground'>Nested content for section 1.</p>
						</CollapsibleContent>
					</Collapsible>

					<Collapsible className='rounded-md border'>
						<CollapsibleTrigger className='px-3 py-2 text-sm hover:bg-accent/50'>
							<span>Nested Section 2</span>
							<CollapsibleIcon className='h-3 w-3' />
						</CollapsibleTrigger>
						<CollapsibleContent innerClassName='border-t px-3'>
							<p className='text-muted-foreground'>Nested content for section 2.</p>
						</CollapsibleContent>
					</Collapsible>
				</div>
			</CollapsibleContent>
		</Collapsible>
	),
};

export const Card: Story = {
	render: () => (
		<Collapsible className='w-[400px] overflow-hidden rounded-xl border bg-card shadow-sm'>
			<CollapsibleTrigger className='px-6 py-4 hover:bg-accent/50'>
				<div className='flex flex-col items-start gap-1'>
					<span className='font-semibold'>Project Details</span>
					<span className='text-xs text-muted-foreground'>Click to view more information</span>
				</div>
				<CollapsibleIcon />
			</CollapsibleTrigger>
			<CollapsibleContent innerClassName='border-t px-6'>
				<div className='space-y-3'>
					<div className='flex justify-between'>
						<span className='text-muted-foreground'>Status</span>
						<span className='font-medium text-success'>Active</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-muted-foreground'>Created</span>
						<span>Jan 15, 2024</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-muted-foreground'>Last updated</span>
						<span>2 hours ago</span>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	),
};

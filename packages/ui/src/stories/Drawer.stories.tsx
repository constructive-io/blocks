import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../components/drawer';
import { Input } from '../components/input';
import { Label } from '../components/label';

const meta: Meta = {
	title: 'UI/Drawer',
	component: Drawer,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Drawer>
			<DrawerTrigger className='inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground'>
				Open drawer
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Rename project</DrawerTitle>
					<DrawerDescription>
						This changes the display name across the console.
					</DrawerDescription>
				</DrawerHeader>
				<div className='grid gap-2 px-4 pb-2'>
					<Label htmlFor='drawer-name'>Name</Label>
					<Input id='drawer-name' defaultValue='production-db' />
				</div>
				<DrawerFooter>
					<Button>Save changes</Button>
					<DrawerClose className='inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium'>
						Cancel
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	),
};

export const ScrollableContent: Story = {
	render: () => (
		<Drawer>
			<DrawerTrigger className='inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium'>
				View activity
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Recent activity</DrawerTitle>
					<DrawerDescription>Last 50 events for this database.</DrawerDescription>
				</DrawerHeader>
				<div className='max-h-[50vh] overflow-y-auto px-4 pb-4'>
					{Array.from({ length: 24 }, (_, i) => (
						<div key={i} className='flex items-center justify-between border-b py-2.5 text-sm last:border-0'>
							<span>connection.created</span>
							<span className='font-mono text-xs text-muted-foreground'>{i + 1}m ago</span>
						</div>
					))}
				</div>
			</DrawerContent>
		</Drawer>
	),
};

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from '../components/label';
import { Switch } from '../components/switch';

const meta: Meta<typeof Switch> = {
	title: 'UI/Switch',
	component: Switch,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		checked: {
			control: { type: 'boolean' },
		},
		disabled: {
			control: { type: 'boolean' },
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const Checked: Story = {
	args: {
		checked: true,
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		checked: true,
		disabled: true,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className='flex items-center space-x-2'>
			<Switch id='airplane-mode' />
			<Label htmlFor='airplane-mode'>Airplane Mode</Label>
		</div>
	),
};

export const FormExample: Story = {
	render: () => (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<Label htmlFor='notifications' className='text-base'>
					Push Notifications
				</Label>
				<Switch id='notifications' />
			</div>
			<div className='flex items-center justify-between'>
				<Label htmlFor='location' className='text-base'>
					Location Services
				</Label>
				<Switch id='location' defaultChecked />
			</div>
			<div className='flex items-center justify-between'>
				<Label htmlFor='analytics' className='text-base'>
					Analytics
				</Label>
				<Switch id='analytics' disabled />
			</div>
		</div>
	),
};

export const Settings: Story = {
	render: () => (
		<div className='w-full max-w-md space-y-6'>
			<div>
				<h3 className='text-lg font-medium'>Privacy Settings</h3>
				<p className='text-muted-foreground text-sm'>Manage your privacy preferences.</p>
			</div>
			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<div className='space-y-0.5'>
						<Label htmlFor='marketing' className='text-base'>
							Marketing emails
						</Label>
						<div className='text-muted-foreground text-sm'>Receive emails about new products, features, and more.</div>
					</div>
					<Switch id='marketing' />
				</div>
				<div className='flex items-center justify-between'>
					<div className='space-y-0.5'>
						<Label htmlFor='security' className='text-base'>
							Security emails
						</Label>
						<div className='text-muted-foreground text-sm'>Receive emails about your account security.</div>
					</div>
					<Switch id='security' defaultChecked disabled />
				</div>
			</div>
		</div>
	),
};

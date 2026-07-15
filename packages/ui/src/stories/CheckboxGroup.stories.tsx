import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from '../components/checkbox';
import { CheckboxGroup } from '../components/checkbox-group';
import { Label } from '../components/label';

const meta: Meta<typeof CheckboxGroup> = {
	title: 'UI/CheckboxGroup',
	component: CheckboxGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<CheckboxGroup defaultValue={['option2']}>
			<div className='flex items-center gap-2'>
				<Checkbox id='option1' name='options' value='option1' />
				<Label htmlFor='option1'>Option 1</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='option2' name='options' value='option2' />
				<Label htmlFor='option2'>Option 2</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='option3' name='options' value='option3' />
				<Label htmlFor='option3'>Option 3</Label>
			</div>
		</CheckboxGroup>
	),
};

export const WithAllValues: Story = {
	render: () => (
		<CheckboxGroup defaultValue={['react', 'vue', 'angular']}>
			<div className='flex items-center gap-2'>
				<Checkbox id='react' name='frameworks' value='react' />
				<Label htmlFor='react'>React</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='vue' name='frameworks' value='vue' />
				<Label htmlFor='vue'>Vue</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='angular' name='frameworks' value='angular' />
				<Label htmlFor='angular'>Angular</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='svelte' name='frameworks' value='svelte' />
				<Label htmlFor='svelte'>Svelte</Label>
			</div>
		</CheckboxGroup>
	),
};

export const Controlled: Story = {
	render: function ControlledExample() {
		const [value, setValue] = useState<string[]>(['email']);

		return (
			<div className='space-y-4'>
				<CheckboxGroup value={value} onValueChange={setValue}>
					<div className='flex items-center gap-2'>
						<Checkbox id='email-notif' name='notifications' value='email' />
						<Label htmlFor='email-notif'>Email notifications</Label>
					</div>
					<div className='flex items-center gap-2'>
						<Checkbox id='push-notif' name='notifications' value='push' />
						<Label htmlFor='push-notif'>Push notifications</Label>
					</div>
					<div className='flex items-center gap-2'>
						<Checkbox id='sms-notif' name='notifications' value='sms' />
						<Label htmlFor='sms-notif'>SMS notifications</Label>
					</div>
				</CheckboxGroup>
				<p className='text-muted-foreground text-sm'>Selected: {value.length > 0 ? value.join(', ') : 'none'}</p>
			</div>
		);
	},
};

export const WithDescriptions: Story = {
	render: () => (
		<CheckboxGroup defaultValue={['analytics']} className='max-w-md'>
			<div className='flex gap-2'>
				<Checkbox id='essential' name='cookies' value='essential' disabled checked />
				<div className='grid gap-1'>
					<Label htmlFor='essential'>Essential cookies</Label>
					<p className='text-muted-foreground text-sm'>Required for the website to function properly.</p>
				</div>
			</div>
			<div className='flex gap-2'>
				<Checkbox id='analytics' name='cookies' value='analytics' />
				<div className='grid gap-1'>
					<Label htmlFor='analytics'>Analytics cookies</Label>
					<p className='text-muted-foreground text-sm'>Help us understand how visitors interact with our website.</p>
				</div>
			</div>
			<div className='flex gap-2'>
				<Checkbox id='marketing' name='cookies' value='marketing' />
				<div className='grid gap-1'>
					<Label htmlFor='marketing'>Marketing cookies</Label>
					<p className='text-muted-foreground text-sm'>Used to deliver personalized advertisements.</p>
				</div>
			</div>
		</CheckboxGroup>
	),
};

export const Horizontal: Story = {
	render: () => (
		<CheckboxGroup defaultValue={['sm']} className='flex-row gap-6'>
			<div className='flex items-center gap-2'>
				<Checkbox id='size-sm' name='sizes' value='sm' />
				<Label htmlFor='size-sm'>Small</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='size-md' name='sizes' value='md' />
				<Label htmlFor='size-md'>Medium</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='size-lg' name='sizes' value='lg' />
				<Label htmlFor='size-lg'>Large</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='size-xl' name='sizes' value='xl' />
				<Label htmlFor='size-xl'>X-Large</Label>
			</div>
		</CheckboxGroup>
	),
};

export const FormExample: Story = {
	render: () => (
		<div className='w-full max-w-sm space-y-4'>
			<div>
				<h3 className='text-lg font-medium'>Privacy Settings</h3>
				<p className='text-muted-foreground text-sm'>Manage your data sharing preferences.</p>
			</div>
			<CheckboxGroup defaultValue={['profile', 'activity']}>
				<div className='flex items-center gap-2'>
					<Checkbox id='profile-visible' name='privacy' value='profile' />
					<Label htmlFor='profile-visible'>Make profile visible</Label>
				</div>
				<div className='flex items-center gap-2'>
					<Checkbox id='activity-visible' name='privacy' value='activity' />
					<Label htmlFor='activity-visible'>Show activity status</Label>
				</div>
				<div className='flex items-center gap-2'>
					<Checkbox id='search-indexed' name='privacy' value='search' />
					<Label htmlFor='search-indexed'>Allow search engines to index</Label>
				</div>
				<div className='flex items-center gap-2'>
					<Checkbox id='data-sharing' name='privacy' value='sharing' />
					<Label htmlFor='data-sharing'>Share usage data for improvements</Label>
				</div>
			</CheckboxGroup>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<CheckboxGroup defaultValue={['item1']} disabled>
			<div className='flex items-center gap-2'>
				<Checkbox id='disabled1' name='disabled' value='item1' />
				<Label htmlFor='disabled1' className='text-muted-foreground'>
					Item 1 (checked)
				</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='disabled2' name='disabled' value='item2' />
				<Label htmlFor='disabled2' className='text-muted-foreground'>
					Item 2
				</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='disabled3' name='disabled' value='item3' />
				<Label htmlFor='disabled3' className='text-muted-foreground'>
					Item 3
				</Label>
			</div>
		</CheckboxGroup>
	),
};

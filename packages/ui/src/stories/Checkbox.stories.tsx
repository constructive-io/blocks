import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from '../components/checkbox';
import { Label } from '../components/label';

const meta: Meta<typeof Checkbox> = {
	title: 'UI/Checkbox',
	component: Checkbox,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		checked: {
			control: { type: 'select' },
			options: [true, false, 'indeterminate'],
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

export const Indeterminate: Story = {
	args: {
		indeterminate: true,
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
			<Checkbox id='terms' />
			<Label htmlFor='terms'>Accept terms and conditions</Label>
		</div>
	),
};

export const WithText: Story = {
	render: () => (
		<div className='items-top flex space-x-2'>
			<Checkbox id='terms1' />
			<div className='grid gap-1.5 leading-none'>
				<Label htmlFor='terms1'>Accept terms and conditions</Label>
				<p className='text-muted-foreground text-sm'>You agree to our Terms of Service and Privacy Policy.</p>
			</div>
		</div>
	),
};

export const CheckboxGroup: Story = {
	render: () => (
		<div className='space-y-3'>
			<div className='flex items-center space-x-2'>
				<Checkbox id='option1' />
				<Label htmlFor='option1'>Option 1</Label>
			</div>
			<div className='flex items-center space-x-2'>
				<Checkbox id='option2' defaultChecked />
				<Label htmlFor='option2'>Option 2 (checked by default)</Label>
			</div>
			<div className='flex items-center space-x-2'>
				<Checkbox id='option3' />
				<Label htmlFor='option3'>Option 3</Label>
			</div>
			<div className='flex items-center space-x-2'>
				<Checkbox id='option4' disabled />
				<Label htmlFor='option4' className='text-muted-foreground'>
					Option 4 (disabled)
				</Label>
			</div>
		</div>
	),
};

export const FormExample: Story = {
	render: () => (
		<div className='w-full max-w-sm space-y-4'>
			<div>
				<h3 className='text-lg font-medium'>Notification Settings</h3>
				<p className='text-muted-foreground text-sm'>Choose what you want to be notified about.</p>
			</div>
			<div className='space-y-3'>
				<div className='flex items-center space-x-2'>
					<Checkbox id='email' defaultChecked />
					<Label htmlFor='email'>Email notifications</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<Checkbox id='push' />
					<Label htmlFor='push'>Push notifications</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<Checkbox id='sms' />
					<Label htmlFor='sms'>SMS notifications</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<Checkbox id='marketing' />
					<Label htmlFor='marketing'>Marketing emails</Label>
				</div>
			</div>
		</div>
	),
};

export const SelectAll: Story = {
	render: () => (
		<div className='space-y-3'>
			<div className='flex items-center space-x-2'>
				<Checkbox id='select-all' indeterminate />
				<Label htmlFor='select-all' className='font-medium'>
					Select All
				</Label>
			</div>
			<div className='ml-6 space-y-2'>
				<div className='flex items-center space-x-2'>
					<Checkbox id='item1' defaultChecked />
					<Label htmlFor='item1'>Item 1</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<Checkbox id='item2' />
					<Label htmlFor='item2'>Item 2</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<Checkbox id='item3' defaultChecked />
					<Label htmlFor='item3'>Item 3</Label>
				</div>
			</div>
		</div>
	),
};

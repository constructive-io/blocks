import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from '../components/checkbox';
import { Input } from '../components/input';
import { Label } from '../components/label';
import { RadioGroup, RadioGroupItem } from '../components/radio-group';

const meta: Meta<typeof Label> = {
	title: 'UI/Label',
	component: Label,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		htmlFor: {
			control: { type: 'text' },
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <Label htmlFor='email'>Email</Label>,
};

export const WithInput: Story = {
	render: () => (
		<div className='grid w-full max-w-sm items-center gap-1.5'>
			<Label htmlFor='email'>Email</Label>
			<Input type='email' id='email' placeholder='Email' />
		</div>
	),
};

export const Required: Story = {
	render: () => (
		<div className='grid w-full max-w-sm items-center gap-1.5'>
			<Label htmlFor='password'>
				Password <span className='text-red-500'>*</span>
			</Label>
			<Input type='password' id='password' placeholder='Password' />
		</div>
	),
};

export const WithCheckbox: Story = {
	render: () => (
		<div className='flex items-center space-x-2'>
			<Checkbox id='terms' />
			<Label htmlFor='terms'>Accept terms and conditions</Label>
		</div>
	),
};

export const WithRadioGroup: Story = {
	render: () => (
		<RadioGroup defaultValue='option-one'>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-one' id='option-one' />
				<Label htmlFor='option-one'>Option One</Label>
			</div>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-two' id='option-two' />
				<Label htmlFor='option-two'>Option Two</Label>
			</div>
		</RadioGroup>
	),
};

export const FormExample: Story = {
	render: () => (
		<form className='w-full max-w-sm space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='firstName'>First Name</Label>
				<Input id='firstName' placeholder='Enter your first name' />
			</div>
			<div className='space-y-2'>
				<Label htmlFor='lastName'>Last Name</Label>
				<Input id='lastName' placeholder='Enter your last name' />
			</div>
			<div className='space-y-2'>
				<Label htmlFor='email'>Email Address</Label>
				<Input id='email' type='email' placeholder='Enter your email' />
			</div>
			<div className='flex items-center space-x-2'>
				<Checkbox id='newsletter' />
				<Label htmlFor='newsletter'>Subscribe to newsletter</Label>
			</div>
		</form>
	),
};

export const DifferentSizes: Story = {
	render: () => (
		<div className='space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='small' className='text-sm'>
					Small Label
				</Label>
				<Input id='small' />
			</div>
			<div className='space-y-2'>
				<Label htmlFor='medium'>Medium Label</Label>
				<Input id='medium' />
			</div>
			<div className='space-y-2'>
				<Label htmlFor='large' className='text-lg'>
					Large Label
				</Label>
				<Input id='large' />
			</div>
		</div>
	),
};

export const WithDescription: Story = {
	render: () => (
		<div className='grid w-full max-w-sm items-center gap-1.5'>
			<Label htmlFor='username'>Username</Label>
			<Input id='username' placeholder='Enter username' />
			<p className='text-muted-foreground text-sm'>This will be your public display name.</p>
		</div>
	),
};

export const ErrorState: Story = {
	render: () => (
		<div className='grid w-full max-w-sm items-center gap-1.5'>
			<Label htmlFor='email-error' className='text-destructive'>
				Email Address
			</Label>
			<Input id='email-error' type='email' placeholder='Enter your email' className='border-destructive' />
			<p className='text-destructive text-sm'>Please enter a valid email address.</p>
		</div>
	),
};

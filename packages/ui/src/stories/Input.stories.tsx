import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from '../components/input';
import { Label } from '../components/label';

const meta: Meta<typeof Input> = {
	title: 'UI/Input',
	component: Input,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['sm', 'default', 'lg'],
			description: 'Size variant of the input',
		},
		type: {
			control: { type: 'select' },
			options: ['text', 'email', 'password', 'search', 'number', 'tel', 'url', 'file'],
		},
		placeholder: {
			control: { type: 'text' },
		},
		disabled: {
			control: { type: 'boolean' },
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Enter text...',
	},
	render: (args) => (
		<div className='w-[320px]'>
			<Input {...args} />
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className='w-[320px] space-y-1.5'>
			<Label htmlFor='email'>Email</Label>
			<Input id='email' type='email' placeholder='name@example.com' />
		</div>
	),
};

export const Password: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input type='password' placeholder='Enter password...' />
		</div>
	),
};

export const Email: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input type='email' placeholder='name@example.com' />
		</div>
	),
};

export const Search: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input type='search' placeholder='Search...' />
		</div>
	),
};

export const Number: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input type='number' placeholder='0' />
		</div>
	),
};

export const Tel: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input type='tel' placeholder='+1 (555) 000-0000' />
		</div>
	),
};

export const Url: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input type='url' placeholder='https://example.com' />
		</div>
	),
};

export const File: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input type='file' />
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input placeholder='Disabled input' disabled />
		</div>
	),
};

export const WithValue: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Input defaultValue='This input has a value' />
		</div>
	),
};

export const Required: Story = {
	render: () => (
		<div className='w-[320px] space-y-1.5'>
			<Label htmlFor='required-field'>
				Required Field <span className='text-destructive'>*</span>
			</Label>
			<Input id='required-field' type='text' placeholder='This field is required' required />
		</div>
	),
};

export const WithError: Story = {
	render: () => (
		<div className='w-[320px] space-y-1.5'>
			<Label htmlFor='error-email'>Email</Label>
			<Input id='error-email' type='email' placeholder='Enter email' aria-invalid='true' />
			<p className='text-destructive text-sm'>Please enter a valid email address.</p>
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<div className='space-y-1.5'>
				<Label>Small</Label>
				<Input size='sm' placeholder='Small input' />
			</div>
			<div className='space-y-1.5'>
				<Label>Default</Label>
				<Input size='default' placeholder='Default input' />
			</div>
			<div className='space-y-1.5'>
				<Label>Large</Label>
				<Input size='lg' placeholder='Large input' />
			</div>
		</div>
	),
};

export const SizeComparison: Story = {
	render: () => (
		<div className='w-[320px] space-y-3'>
			<Input size='sm' placeholder='Small - Compact interfaces' />
			<Input size='default' placeholder='Default - Standard forms' />
			<Input size='lg' placeholder='Large - Prominent elements' />
		</div>
	),
};

export const FormExample: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<div className='space-y-1.5'>
				<Label htmlFor='form-name'>Name</Label>
				<Input id='form-name' type='text' placeholder='John Doe' />
			</div>
			<div className='space-y-1.5'>
				<Label htmlFor='form-email'>Email</Label>
				<Input id='form-email' type='email' placeholder='john@example.com' />
			</div>
			<div className='space-y-1.5'>
				<Label htmlFor='form-password'>Password</Label>
				<Input id='form-password' type='password' placeholder='••••••••' />
			</div>
		</div>
	),
};

export const FocusState: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<p className='text-muted-foreground text-sm'>Click an input to see the primary-colored focus ring:</p>
			<Input placeholder='Focus me to see ring color' />
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<div className='space-y-1.5'>
				<Label>Normal</Label>
				<Input placeholder='Normal state' />
			</div>
			<div className='space-y-1.5'>
				<Label>With Value</Label>
				<Input defaultValue='Has value' />
			</div>
			<div className='space-y-1.5'>
				<Label>Disabled</Label>
				<Input placeholder='Disabled' disabled />
			</div>
			<div className='space-y-1.5'>
				<Label>Invalid</Label>
				<Input placeholder='Invalid state' aria-invalid='true' />
			</div>
		</div>
	),
};

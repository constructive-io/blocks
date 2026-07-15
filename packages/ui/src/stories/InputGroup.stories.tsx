import type { Meta, StoryObj } from '@storybook/react-vite';
import { AtSign, Eye, EyeOff, Mail, Phone, Search, User, X, DollarSign, Lock, Copy, Check } from 'lucide-react';
import { useState } from 'react';

import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from '../components/input-group';
import { Button } from '../components/button';
import { Label } from '../components/label';
import { Badge } from '../components/badge';

const meta: Meta<typeof InputGroup> = {
	title: 'UI/InputGroup',
	component: InputGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className='w-[320px]'>
			<InputGroup>
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput placeholder='Search...' />
			</InputGroup>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className='w-[320px] space-y-1.5'>
			<Label htmlFor='email'>Email</Label>
			<InputGroup>
				<InputGroupAddon>
					<Mail />
				</InputGroupAddon>
				<InputGroupInput id='email' type='email' placeholder='name@example.com' />
			</InputGroup>
		</div>
	),
};

export const IconStart: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<InputGroup>
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput placeholder='Search...' />
			</InputGroup>
			<InputGroup>
				<InputGroupAddon>
					<User />
				</InputGroupAddon>
				<InputGroupInput placeholder='Username' />
			</InputGroup>
			<InputGroup>
				<InputGroupAddon>
					<Mail />
				</InputGroupAddon>
				<InputGroupInput type='email' placeholder='Email address' />
			</InputGroup>
		</div>
	),
};

export const IconEnd: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<InputGroup>
				<InputGroupInput placeholder='Search...' />
				<InputGroupAddon align='inline-end'>
					<Search />
				</InputGroupAddon>
			</InputGroup>
			<InputGroup>
				<InputGroupInput type='email' placeholder='Email address' />
				<InputGroupAddon align='inline-end'>
					<Mail />
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
};

export const IconBothSides: Story = {
	render: () => (
		<div className='w-[320px]'>
			<InputGroup>
				<InputGroupAddon>
					<Mail />
				</InputGroupAddon>
				<InputGroupInput type='email' placeholder='Email address' />
				<InputGroupAddon align='inline-end'>
					<Check className='text-green-500' />
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
};

export const WithTextPrefix: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<InputGroup>
				<InputGroupAddon>
					<InputGroupText>https://</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput placeholder='example.com' />
			</InputGroup>
			<InputGroup>
				<InputGroupAddon>
					<InputGroupText>@</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput placeholder='username' />
			</InputGroup>
		</div>
	),
};

export const WithTextSuffix: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<InputGroup>
				<InputGroupInput type='number' placeholder='0.00' />
				<InputGroupAddon align='inline-end'>
					<InputGroupText>USD</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
			<InputGroup>
				<InputGroupInput type='number' placeholder='100' />
				<InputGroupAddon align='inline-end'>
					<InputGroupText>%</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
};

export const WithButton: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<InputGroup>
				<InputGroupInput placeholder='Search...' />
				<InputGroupAddon align='inline-end'>
					<Button size='sm' variant='ghost' className='h-7 w-7 p-0'>
						<Search className='h-4 w-4' />
					</Button>
				</InputGroupAddon>
			</InputGroup>
			<InputGroup>
				<InputGroupInput defaultValue='https://example.com/invite/abc123' readOnly />
				<InputGroupAddon align='inline-end'>
					<Button size='sm' variant='ghost' className='h-7 px-2'>
						<Copy className='h-4 w-4' />
					</Button>
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
};

export const WithClearButton: Story = {
	render: function ClearButtonExample() {
		const [value, setValue] = useState('');

		return (
			<div className='w-[320px]'>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput
						placeholder='Search...'
						value={value}
						onChange={(e) => setValue(e.target.value)}
					/>
					{value && (
						<InputGroupAddon align='inline-end'>
							<Button
								size='sm'
								variant='ghost'
								className='h-7 w-7 p-0'
								onClick={() => setValue('')}
							>
								<X className='h-4 w-4' />
							</Button>
						</InputGroupAddon>
					)}
				</InputGroup>
			</div>
		);
	},
};

export const PasswordToggle: Story = {
	render: function PasswordToggleExample() {
		const [showPassword, setShowPassword] = useState(false);

		return (
			<div className='w-[320px] space-y-1.5'>
				<Label htmlFor='password'>Password</Label>
				<InputGroup>
					<InputGroupAddon>
						<Lock />
					</InputGroupAddon>
					<InputGroupInput
						id='password'
						type={showPassword ? 'text' : 'password'}
						placeholder='Enter password'
					/>
					<InputGroupAddon align='inline-end'>
						<Button
							size='sm'
							variant='ghost'
							className='h-7 w-7 p-0'
							onClick={() => setShowPassword(!showPassword)}
							type='button'
						>
							{showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
						</Button>
					</InputGroupAddon>
				</InputGroup>
			</div>
		);
	},
};

export const WithBadge: Story = {
	render: () => (
		<div className='w-[320px]'>
			<InputGroup>
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput placeholder='Search items...' />
				<InputGroupAddon align='inline-end'>
					<Badge variant='secondary' size='sm'>42</Badge>
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<div className='space-y-1.5'>
				<Label>Small</Label>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput placeholder='Small input...' size='sm' />
				</InputGroup>
			</div>
			<div className='space-y-1.5'>
				<Label>Default</Label>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput placeholder='Default input...' size='default' />
				</InputGroup>
			</div>
			<div className='space-y-1.5'>
				<Label>Large</Label>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput placeholder='Large input...' size='lg' />
				</InputGroup>
			</div>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className='w-[320px]'>
			<InputGroup>
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput placeholder='Disabled input' disabled />
			</InputGroup>
		</div>
	),
};

export const Invalid: Story = {
	render: () => (
		<div className='w-[320px] space-y-1.5'>
			<Label htmlFor='invalid-email'>Email</Label>
			<InputGroup>
				<InputGroupAddon>
					<Mail />
				</InputGroupAddon>
				<InputGroupInput id='invalid-email' type='email' placeholder='name@example.com' aria-invalid='true' />
			</InputGroup>
			<p className='text-destructive text-sm'>Please enter a valid email address.</p>
		</div>
	),
};

export const WithTextarea: Story = {
	render: () => (
		<div className='w-[320px] space-y-1.5'>
			<Label htmlFor='message'>Message</Label>
			<InputGroup>
				<InputGroupAddon align='block-start'>
					<Mail />
					<InputGroupText>Message</InputGroupText>
				</InputGroupAddon>
				<InputGroupTextarea id='message' placeholder='Type your message here...' />
			</InputGroup>
		</div>
	),
};

export const PhoneInput: Story = {
	render: () => (
		<div className='w-[320px] space-y-1.5'>
			<Label htmlFor='phone'>Phone Number</Label>
			<InputGroup>
				<InputGroupAddon>
					<InputGroupText>+1</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput id='phone' type='tel' placeholder='(555) 000-0000' />
				<InputGroupAddon align='inline-end'>
					<Phone className='h-4 w-4' />
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
};

export const CurrencyInput: Story = {
	render: () => (
		<div className='w-[320px] space-y-1.5'>
			<Label htmlFor='amount'>Amount</Label>
			<InputGroup>
				<InputGroupAddon>
					<DollarSign />
				</InputGroupAddon>
				<InputGroupInput id='amount' type='number' placeholder='0.00' />
				<InputGroupAddon align='inline-end'>
					<InputGroupText>USD</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</div>
	),
};

export const FormExample: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<div className='space-y-1.5'>
				<Label htmlFor='form-email'>Email</Label>
				<InputGroup>
					<InputGroupAddon>
						<Mail />
					</InputGroupAddon>
					<InputGroupInput id='form-email' type='email' placeholder='name@example.com' />
				</InputGroup>
			</div>
			<div className='space-y-1.5'>
				<Label htmlFor='form-username'>Username</Label>
				<InputGroup>
					<InputGroupAddon>
						<AtSign />
					</InputGroupAddon>
					<InputGroupInput id='form-username' placeholder='username' />
				</InputGroup>
			</div>
			<div className='space-y-1.5'>
				<Label htmlFor='form-password'>Password</Label>
				<InputGroup>
					<InputGroupAddon>
						<Lock />
					</InputGroupAddon>
					<InputGroupInput id='form-password' type='password' placeholder='Enter password' />
				</InputGroup>
			</div>
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<div className='space-y-1.5'>
				<Label>Normal</Label>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput placeholder='Normal state' />
				</InputGroup>
			</div>
			<div className='space-y-1.5'>
				<Label>With Value</Label>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput defaultValue='Has value' />
				</InputGroup>
			</div>
			<div className='space-y-1.5'>
				<Label>Disabled</Label>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput placeholder='Disabled' disabled />
				</InputGroup>
			</div>
			<div className='space-y-1.5'>
				<Label>Invalid</Label>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput placeholder='Invalid state' aria-invalid='true' />
				</InputGroup>
			</div>
		</div>
	),
};

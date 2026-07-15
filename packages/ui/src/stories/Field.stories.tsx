import type { Meta, StoryObj } from '@storybook/react-vite';
import { AtSign, DollarSign, Lock, Mail, Search, User } from 'lucide-react';
import { useState } from 'react';

import { Field, FieldRow } from '../components/field';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from '../components/input-group';
import { Input } from '../components/input';
import { Textarea } from '../components/textarea';
import { Switch } from '../components/switch';
import { Checkbox } from '../components/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/select';

const meta: Meta<typeof Field> = {
	title: 'UI/Field',
	component: Field,
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
			<Field label='Email'>
				<Input type='email' placeholder='name@example.com' />
			</Field>
		</div>
	),
};

export const WithInputGroup: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field label='Email' required>
				<InputGroup>
					<InputGroupAddon>
						<Mail />
					</InputGroupAddon>
					<InputGroupInput type='email' placeholder='name@example.com' />
				</InputGroup>
			</Field>
		</div>
	),
};

export const WithDescription: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field
				label='Username'
				description='This will be your public display name.'
				required
			>
				<InputGroup>
					<InputGroupAddon>
						<AtSign />
					</InputGroupAddon>
					<InputGroupInput placeholder='johndoe' />
				</InputGroup>
			</Field>
		</div>
	),
};

export const WithError: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field
				label='Email'
				error='Please enter a valid email address.'
				required
			>
				<InputGroup>
					<InputGroupAddon>
						<Mail />
					</InputGroupAddon>
					<InputGroupInput type='email' placeholder='name@example.com' aria-invalid='true' />
				</InputGroup>
			</Field>
		</div>
	),
};

export const WithDescriptionAndError: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field
				label='Password'
				description='Must be at least 8 characters.'
				error='Password is too short.'
				required
			>
				<InputGroup>
					<InputGroupAddon>
						<Lock />
					</InputGroupAddon>
					<InputGroupInput type='password' placeholder='Enter password' aria-invalid='true' />
				</InputGroup>
			</Field>
		</div>
	),
};

export const WithTextPrefix: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field label='Website' description='Enter your personal or company website.'>
				<InputGroup>
					<InputGroupAddon>
						<InputGroupText>https://</InputGroupText>
					</InputGroupAddon>
					<InputGroupInput placeholder='example.com' />
				</InputGroup>
			</Field>
		</div>
	),
};

export const WithTextSuffix: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field label='Price' required>
				<InputGroup>
					<InputGroupAddon>
						<DollarSign />
					</InputGroupAddon>
					<InputGroupInput type='number' placeholder='0.00' />
					<InputGroupAddon align='inline-end'>
						<InputGroupText>USD</InputGroupText>
					</InputGroupAddon>
				</InputGroup>
			</Field>
		</div>
	),
};

export const WithTextarea: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field
				label='Bio'
				description='Tell us a little about yourself.'
			>
				<InputGroup>
					<InputGroupAddon align='block-start'>
						<User />
						<InputGroupText>About</InputGroupText>
					</InputGroupAddon>
					<InputGroupTextarea placeholder='Write something...' />
				</InputGroup>
			</Field>
		</div>
	),
};

export const WithSelect: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field label='Country' required>
				<Select>
					<SelectTrigger>
						<SelectValue placeholder='Select a country' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='us'>United States</SelectItem>
						<SelectItem value='uk'>United Kingdom</SelectItem>
						<SelectItem value='ca'>Canada</SelectItem>
						<SelectItem value='au'>Australia</SelectItem>
					</SelectContent>
				</Select>
			</Field>
		</div>
	),
};

export const PlainInput: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field label='Full Name' required>
				<Input placeholder='John Doe' />
			</Field>
		</div>
	),
};

export const PlainTextarea: Story = {
	render: () => (
		<div className='w-[320px]'>
			<Field label='Message' description='Max 500 characters.'>
				<Textarea placeholder='Type your message here...' rows={4} />
			</Field>
		</div>
	),
};

export const FieldRowWithSwitch: Story = {
	render: function SwitchExample() {
		const [enabled, setEnabled] = useState(false);

		return (
			<div className='w-[320px]'>
				<FieldRow
					label='Enable notifications'
					description='Receive email updates about your account.'
				>
					<Switch checked={enabled} onCheckedChange={setEnabled} />
				</FieldRow>
			</div>
		);
	},
};

export const FieldRowWithCheckbox: Story = {
	render: function CheckboxExample() {
		const [checked, setChecked] = useState(false);

		return (
			<div className='w-[320px]'>
				<FieldRow
					label='I agree to the terms and conditions'
					error={!checked ? 'You must agree to continue.' : undefined}
				>
					<Checkbox checked={checked} onCheckedChange={(c) => setChecked(c === true)} />
				</FieldRow>
			</div>
		);
	},
};

export const FieldRowLabelStart: Story = {
	render: function LabelStartExample() {
		const [enabled, setEnabled] = useState(true);

		return (
			<div className='w-[320px]'>
				<FieldRow
					label='Dark mode'
					labelPosition='start'
					description='Use dark theme across the application.'
				>
					<Switch checked={enabled} onCheckedChange={setEnabled} />
				</FieldRow>
			</div>
		);
	},
};

export const FormExample: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<Field label='Email' required>
				<InputGroup>
					<InputGroupAddon>
						<Mail />
					</InputGroupAddon>
					<InputGroupInput type='email' placeholder='name@example.com' />
				</InputGroup>
			</Field>

			<Field label='Username' required description='Letters, numbers, and hyphens only.'>
				<InputGroup>
					<InputGroupAddon>
						<AtSign />
					</InputGroupAddon>
					<InputGroupInput placeholder='username' />
				</InputGroup>
			</Field>

			<Field label='Password' required>
				<InputGroup>
					<InputGroupAddon>
						<Lock />
					</InputGroupAddon>
					<InputGroupInput type='password' placeholder='Enter password' />
				</InputGroup>
			</Field>

			<Field label='Search' description='Search across all records.'>
				<InputGroup>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput placeholder='Search...' />
				</InputGroup>
			</Field>
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div className='w-[320px] space-y-4'>
			<Field label='Normal'>
				<InputGroup>
					<InputGroupAddon>
						<User />
					</InputGroupAddon>
					<InputGroupInput placeholder='Normal state' />
				</InputGroup>
			</Field>

			<Field label='Required' required>
				<InputGroup>
					<InputGroupAddon>
						<User />
					</InputGroupAddon>
					<InputGroupInput placeholder='Required field' />
				</InputGroup>
			</Field>

			<Field label='With Description' description='This is a helpful description.'>
				<InputGroup>
					<InputGroupAddon>
						<User />
					</InputGroupAddon>
					<InputGroupInput placeholder='With description' />
				</InputGroup>
			</Field>

			<Field label='With Error' error='This field has an error.'>
				<InputGroup>
					<InputGroupAddon>
						<User />
					</InputGroupAddon>
					<InputGroupInput placeholder='With error' aria-invalid='true' />
				</InputGroup>
			</Field>

			<Field
				label='All Together'
				required
				description='This is a helpful description.'
				error='This field has an error.'
			>
				<InputGroup>
					<InputGroupAddon>
						<User />
					</InputGroupAddon>
					<InputGroupInput placeholder='All states' aria-invalid='true' />
				</InputGroup>
			</Field>
		</div>
	),
};

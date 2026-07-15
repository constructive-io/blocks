import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ComponentProps, FormEvent } from 'react';

import { Button } from '../components/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../components/dialog';
import { Input } from '../components/input';
import { Label } from '../components/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../components/select';
import {
	Autocomplete,
	AutocompleteEmpty,
	AutocompleteInput,
	AutocompleteItem,
	AutocompleteList,
	AutocompletePopup,
} from '../components/autocomplete';
import { Textarea } from '../components/textarea';
import { Checkbox } from '../components/checkbox';
import { Switch } from '../components/switch';
import { RadioGroup, RadioGroupItem } from '../components/radio-group';

const meta: Meta<typeof Dialog> = {
	title: 'UI/Dialog',
	component: Dialog,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>Open Dialog</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Profile</DialogTitle>
					<DialogDescription>Make changes to your profile here. Click save when you&apos;re done.</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4 px-6 py-4'>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label htmlFor='name' className='text-right'>
							Name
						</Label>
						<Input id='name' defaultValue='Pedro Duarte' className='col-span-3' />
					</div>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label htmlFor='username' className='text-right'>
							Username
						</Label>
						<Input id='username' defaultValue='@peduarte' className='col-span-3' />
					</div>
				</div>
				<DialogFooter>
					<Button type='submit'>Save changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const SimpleDialog: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Show Simple Dialog</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Simple Dialog</DialogTitle>
					<DialogDescription>This is a simple dialog with just a message and close button.</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	),
};

export const ConfirmationDialog: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='destructive'>Delete Item</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Are you sure?</DialogTitle>
					<DialogDescription>This action cannot be undone. This will permanently delete the item.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant='outline'>Cancel</Button>
					<Button variant='destructive'>Delete</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const FormDialog: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Add New User</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Add User</DialogTitle>
					<DialogDescription>Enter the details for the new user account.</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4 px-6 py-4'>
					<div className='grid gap-2'>
						<Label htmlFor='firstName'>First Name</Label>
						<Input id='firstName' placeholder='Enter first name' />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='lastName'>Last Name</Label>
						<Input id='lastName' placeholder='Enter last name' />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='email'>Email</Label>
						<Input id='email' type='email' placeholder='Enter email address' />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='role'>Role</Label>
						<select
							className='border-input/70 placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full
								rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0
								file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none
								disabled:cursor-not-allowed disabled:opacity-50'
						>
							<option>Select a role</option>
							<option>Admin</option>
							<option>Editor</option>
							<option>Viewer</option>
						</select>
					</div>
				</div>
				<DialogFooter>
					<Button variant='outline'>Cancel</Button>
					<Button>Create User</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const LargeContentDialog: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>View Terms</Button>
			</DialogTrigger>
			<DialogContent className='max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Terms and Conditions</DialogTitle>
					<DialogDescription>Please read our terms and conditions carefully.</DialogDescription>
				</DialogHeader>
				<div className='max-h-96 overflow-y-auto px-6 py-4'>
					<div className='space-y-4 text-sm'>
						<p>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
							dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
							ea commodo consequat.
						</p>
						<p>
							Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
							Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
							laborum.
						</p>
						<p>
							Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam
							rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt
							explicabo.
						</p>
						<p>
							Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni
							dolores eos qui ratione voluptatem sequi nesciunt.
						</p>
						<p>
							At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti
							atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
						</p>
					</div>
				</div>
				<DialogFooter>
					<Button variant='outline'>Decline</Button>
					<Button>Accept</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const ScrollableDialog: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>View Article</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[80vh]'>
				<DialogHeader>
					<DialogTitle>Long Article</DialogTitle>
					<DialogDescription>This dialog contains a long article with scrollable content.</DialogDescription>
				</DialogHeader>
				<div className='overflow-y-auto px-6'>
					<div className='space-y-4 text-sm'>
						{Array.from({ length: 10 }).map((_, i) => (
							<p key={i}>
								Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
								incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
								laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
								velit esse cillum dolore eu fugiat nulla pariatur.
							</p>
						))}
					</div>
				</div>
				<DialogFooter>
					<Button variant='outline'>Close</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const DialogWithForm: Story = {
	render: () => {
		const [status, setStatus] = useState<'idle' | 'success'>('idle');
		const [submittedEmail, setSubmittedEmail] = useState('');
		const [role, setRole] = useState('editor');
		const [team, setTeam] = useState('');
		const [twoFactor, setTwoFactor] = useState(false);
		const [sendInvite, setSendInvite] = useState(true);
		const [availability, setAvailability] = useState('full-time');

		type AutocompleteChangeHandler = NonNullable<ComponentProps<typeof Autocomplete>['onValueChange']>;
		type RadioGroupChangeHandler = NonNullable<ComponentProps<typeof RadioGroup>['onValueChange']>;

		const handleTeamChange: AutocompleteChangeHandler = (value, _eventDetails) => {
			if (typeof value === 'string') {
				setTeam(value);
				return;
			}

			if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
				setTeam(String((value as { value?: unknown }).value ?? ''));
				return;
			}

			setTeam('');
		};

		const handleAvailabilityChange: RadioGroupChangeHandler = (value) => {
			setAvailability(String(value || ''));
		};

		const roles = [
			{ value: 'admin', label: 'Administrator' },
			{ value: 'editor', label: 'Editor' },
			{ value: 'viewer', label: 'Viewer' },
			{ value: 'billing', label: 'Billing' },
		];

		const teams = [
			{ value: 'design', label: 'Design' },
			{ value: 'engineering', label: 'Engineering' },
			{ value: 'marketing', label: 'Marketing' },
			{ value: 'sales', label: 'Sales' },
			{ value: 'success', label: 'Customer Success' },
		];

		const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			const formData = new FormData(event.currentTarget);
			setSubmittedEmail((formData.get('email') as string) || '');
			setStatus('success');
			event.currentTarget.reset();
			setRole('editor');
			setTeam('');
			setTwoFactor(false);
			setSendInvite(true);
			setAvailability('full-time');
		};

		return (
			<Dialog>
				<DialogTrigger asChild>
					<Button variant='outline'>Invite to Project</Button>
				</DialogTrigger>
				<DialogContent className='sm:max-w-[480px]'>
					<form className='grid gap-6' onSubmit={handleSubmit}>
						<DialogHeader>
							<DialogTitle>Invite teammate</DialogTitle>
							<DialogDescription>Send an invitation email to add someone to this project.</DialogDescription>
						</DialogHeader>
						<div className='grid gap-4 px-6'>
							<div className='grid gap-2'>
								<Label htmlFor='fullName'>Full name</Label>
								<Input id='fullName' name='fullName' placeholder='Alex Smith' required />
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='email'>Email</Label>
								<Input id='email' name='email' type='email' placeholder='alex@example.com' required />
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='role'>Role</Label>
								<Select value={role} onValueChange={setRole}>
									<SelectTrigger>
										<SelectValue placeholder='Select role' />
									</SelectTrigger>
									<SelectContent>
										{roles.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<input type='hidden' name='role' value={role} />
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='team'>Team</Label>
								<Autocomplete items={teams} value={team} onValueChange={handleTeamChange}>
									<AutocompleteInput placeholder='Search teams...' showTrigger />
									<AutocompletePopup>
										<AutocompleteEmpty>No teams found.</AutocompleteEmpty>
										<AutocompleteList>
											{(item: (typeof teams)[0]) => (
												<AutocompleteItem key={item.value} value={item}>
													{item.label}
												</AutocompleteItem>
											)}
										</AutocompleteList>
									</AutocompletePopup>
								</Autocomplete>
								<input type='hidden' name='team' value={team} />
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='message'>Welcome message</Label>
								<Textarea id='message' name='message' rows={3} placeholder='Add a short note for your teammate.' />
							</div>
							<div className='grid gap-2'>
								<Label>Availability</Label>
								<RadioGroup
									name='availability'
									value={availability}
								onValueChange={handleAvailabilityChange}
									className='grid gap-2'
								>
									<div className='flex items-center gap-2'>
										<RadioGroupItem value='full-time' id='availability-full' />
										<Label htmlFor='availability-full'>Full-time</Label>
									</div>
									<div className='flex items-center gap-2'>
										<RadioGroupItem value='part-time' id='availability-part' />
										<Label htmlFor='availability-part'>Part-time</Label>
									</div>
									<div className='flex items-center gap-2'>
										<RadioGroupItem value='contract' id='availability-contract' />
										<Label htmlFor='availability-contract'>Contract</Label>
									</div>
								</RadioGroup>
							</div>
							<div className='flex items-center justify-between rounded-lg border px-3 py-2'>
								<div className='space-y-1'>
									<Label htmlFor='twoFactor'>Two-factor authentication</Label>
									<p className='text-xs text-muted-foreground'>Require 2FA on sign in.</p>
								</div>
								<Switch
									id='twoFactor'
									name='twoFactor'
									checked={twoFactor}
									onCheckedChange={setTwoFactor}
								/>
							</div>
							<div className='flex items-center gap-3 rounded-lg border px-3 py-2'>
								<Checkbox
									id='sendInvite'
									name='sendInvite'
									checked={sendInvite}
									onCheckedChange={(checked) => setSendInvite(!!checked)}
								/>
								<div className='space-y-1'>
									<Label htmlFor='sendInvite'>Send invite email</Label>
									<p className='text-xs text-muted-foreground'>Notify the teammate immediately.</p>
								</div>
							</div>
						</div>
						<DialogFooter className='px-6 pb-4'>
							<Button variant='outline' type='button' onClick={() => setStatus('idle')}>
								Cancel
							</Button>
							<Button type='submit'>Send invite</Button>
						</DialogFooter>
						{status === 'success' && (
							<p className='px-6 pb-2 text-sm text-muted-foreground'>
								Invitation sent to {submittedEmail || 'the provided address'}.
							</p>
						)}
					</form>
				</DialogContent>
			</Dialog>
		);
	},
};

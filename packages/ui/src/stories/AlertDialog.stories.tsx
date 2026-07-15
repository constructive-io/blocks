import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../components/alert-dialog';
import { Button } from '../components/button';

const meta: Meta<typeof AlertDialog> = {
	title: 'UI/AlertDialog',
	component: AlertDialog,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant='outline'>Show Dialog</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete your account and remove your data from our
						servers.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction>Continue</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const Destructive: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant='destructive'>Delete Account</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Account</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete your account and all associated data. This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
						Delete Account
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const Confirmation: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button>Save Changes</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Save changes?</AlertDialogTitle>
					<AlertDialogDescription>
						You have unsaved changes. Would you like to save them before leaving?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Don&apos;t Save</AlertDialogCancel>
					<AlertDialogAction>Save Changes</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const LogOut: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant='ghost'>Log Out</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Log out of your account?</AlertDialogTitle>
					<AlertDialogDescription>
						You will be logged out of your account and redirected to the login page.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction>Log Out</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const Purchase: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button>Purchase Pro Plan</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Upgrade to Pro Plan</AlertDialogTitle>
					<AlertDialogDescription>
						You will be charged $19.99/month for the Pro plan. This includes unlimited projects, priority support, and
						advanced features.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction>Purchase ($19.99/mo)</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const Warning: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant='outline'>⚠️ Reset Database</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>⚠️ Reset Database</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete all data in your database. All users, posts, comments, and settings will be
						lost. This action cannot be undone.
						<br />
						<br />
						Type &quot;RESET&quot; in the input field to confirm.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
						Reset Database
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

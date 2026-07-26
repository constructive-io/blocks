import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	BoxesIcon,
	CreditCardIcon,
	DatabaseIcon,
	LogOutIcon,
	SettingsIcon,
	UsersIcon,
} from 'lucide-react';

import { AppShell, type AppNavigationGroup } from '../components/app-shell';
import { Button } from '../components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';

const navigation: AppNavigationGroup[] = [
	{
		id: 'workspace',
		label: 'Workspace',
		items: [
			{ id: 'overview', label: 'Overview', href: '/overview', icon: BoxesIcon },
			{
				id: 'data',
				label: 'Data',
				href: '/data',
				icon: DatabaseIcon,
				isActive: true,
				children: [
					{ id: 'customers', label: 'Customers', href: '/data/customers', isActive: true },
					{ id: 'orders', label: 'Orders', href: '/data/orders' },
				],
			},
			{ id: 'members', label: 'Members', href: '/members', icon: UsersIcon },
			{ id: 'billing', label: 'Billing', href: '/billing', icon: CreditCardIcon },
		],
	},
	{
		id: 'settings',
		placement: 'footer',
		items: [{ id: 'settings', label: 'Settings', href: '/settings', icon: SettingsIcon }],
	},
];

const meta: Meta<typeof AppShell> = {
	title: 'Blocks/App Shell',
	component: AppShell,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<AppShell
			navigation={navigation}
			brand={{ name: 'Constructive', description: 'Console', logo: <BoxesIcon /> }}
			breadcrumbs={[
				{ id: 'workspace', label: 'Acme', href: '/acme' },
				{ id: 'customers', label: 'Customers' },
			]}
			barActions={<Button size='sm'>Create record</Button>}
			account={{
				name: 'Ada Lovelace',
				secondaryLabel: 'ada@example.com',
				actionGroups: [
					{
						id: 'session',
						actions: [
							{ id: 'account', label: 'Account settings', href: '/account', icon: SettingsIcon },
							{ id: 'logout', label: 'Log out', onSelect: () => undefined, icon: LogOutIcon },
						],
					},
				],
			}}
			renderLink={({ href, ...props }) => <a data-router-link='true' href={href} {...props} />}
		>
			<div className='grid gap-4 p-4 md:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Customers</CardTitle>
						<CardDescription>Explore records discovered from application metadata.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className='text-sm text-muted-foreground'>1,284 records</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Organizations</CardTitle>
						<CardDescription>Manage the organizations available to this account.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className='text-sm text-muted-foreground'>12 organizations</p>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	),
};

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/card';
import { Input } from '../components/input';
import { Label } from '../components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs';

const meta: Meta<typeof Tabs> = {
	title: 'UI/Tabs',
	component: Tabs,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Tabs defaultValue='account' className='w-[400px]'>
			<TabsList>
				<TabsTrigger value='account'>Account</TabsTrigger>
				<TabsTrigger value='password'>Password</TabsTrigger>
			</TabsList>
			<TabsContent value='account'>
				<p className='text-muted-foreground text-sm'>
					Make changes to your account here. Click save when you&apos;re done.
				</p>
			</TabsContent>
			<TabsContent value='password'>
				<p className='text-muted-foreground text-sm'>
					Change your password here. After saving, you&apos;ll be logged out.
				</p>
			</TabsContent>
		</Tabs>
	),
};

export const WithCards: Story = {
	render: () => (
		<Tabs defaultValue='account' className='w-[400px]'>
			<TabsList className='grid w-full grid-cols-2'>
				<TabsTrigger value='account'>Account</TabsTrigger>
				<TabsTrigger value='password'>Password</TabsTrigger>
			</TabsList>
			<TabsContent value='account'>
				<Card>
					<CardHeader>
						<CardTitle>Account</CardTitle>
						<CardDescription>Make changes to your account here. Click save when you&apos;re done.</CardDescription>
					</CardHeader>
					<CardContent className='space-y-2'>
						<div className='space-y-1'>
							<Label htmlFor='name'>Name</Label>
							<Input id='name' defaultValue='Pedro Duarte' />
						</div>
						<div className='space-y-1'>
							<Label htmlFor='username'>Username</Label>
							<Input id='username' defaultValue='@peduarte' />
						</div>
					</CardContent>
					<CardFooter>
						<Button>Save changes</Button>
					</CardFooter>
				</Card>
			</TabsContent>
			<TabsContent value='password'>
				<Card>
					<CardHeader>
						<CardTitle>Password</CardTitle>
						<CardDescription>Change your password here. After saving, you&apos;ll be logged out.</CardDescription>
					</CardHeader>
					<CardContent className='space-y-2'>
						<div className='space-y-1'>
							<Label htmlFor='current'>Current password</Label>
							<Input id='current' type='password' />
						</div>
						<div className='space-y-1'>
							<Label htmlFor='new'>New password</Label>
							<Input id='new' type='password' />
						</div>
					</CardContent>
					<CardFooter>
						<Button>Save password</Button>
					</CardFooter>
				</Card>
			</TabsContent>
		</Tabs>
	),
};

export const MultipleTabs: Story = {
	render: () => (
		<Tabs defaultValue='overview' className='w-[600px]'>
			<TabsList className='grid w-full grid-cols-5'>
				<TabsTrigger value='overview'>Overview</TabsTrigger>
				<TabsTrigger value='analytics'>Analytics</TabsTrigger>
				<TabsTrigger value='reports'>Reports</TabsTrigger>
				<TabsTrigger value='notifications'>Notifications</TabsTrigger>
				<TabsTrigger value='settings'>Settings</TabsTrigger>
			</TabsList>
			<TabsContent value='overview' className='space-y-4'>
				<div className='grid gap-4'>
					<Card>
						<CardHeader>
							<CardTitle>Overview</CardTitle>
							<CardDescription>Your application dashboard overview</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Welcome to your dashboard! Here you can see key metrics and recent activity.</p>
						</CardContent>
					</Card>
				</div>
			</TabsContent>
			<TabsContent value='analytics' className='space-y-4'>
				<div className='grid gap-4'>
					<Card>
						<CardHeader>
							<CardTitle>Analytics</CardTitle>
							<CardDescription>View your application analytics</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Here you would see charts, graphs, and analytics data.</p>
						</CardContent>
					</Card>
				</div>
			</TabsContent>
			<TabsContent value='reports' className='space-y-4'>
				<div className='grid gap-4'>
					<Card>
						<CardHeader>
							<CardTitle>Reports</CardTitle>
							<CardDescription>Generate and view reports</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Generate custom reports and export data.</p>
						</CardContent>
					</Card>
				</div>
			</TabsContent>
			<TabsContent value='notifications' className='space-y-4'>
				<div className='grid gap-4'>
					<Card>
						<CardHeader>
							<CardTitle>Notifications</CardTitle>
							<CardDescription>Manage your notification preferences</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Configure how and when you receive notifications.</p>
						</CardContent>
					</Card>
				</div>
			</TabsContent>
			<TabsContent value='settings' className='space-y-4'>
				<div className='grid gap-4'>
					<Card>
						<CardHeader>
							<CardTitle>Settings</CardTitle>
							<CardDescription>Configure your application settings</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Adjust your application settings and preferences.</p>
						</CardContent>
					</Card>
				</div>
			</TabsContent>
		</Tabs>
	),
};

export const VerticalTabs: Story = {
	render: () => (
		<Tabs defaultValue='general' orientation='vertical' className='flex h-[400px] w-[600px]'>
			<TabsList className='h-full w-[200px] flex-col'>
				<TabsTrigger value='general' className='w-full justify-start'>
					General
				</TabsTrigger>
				<TabsTrigger value='security' className='w-full justify-start'>
					Security
				</TabsTrigger>
				<TabsTrigger value='integrations' className='w-full justify-start'>
					Integrations
				</TabsTrigger>
				<TabsTrigger value='support' className='w-full justify-start'>
					Support
				</TabsTrigger>
				<TabsTrigger value='organizations' className='w-full justify-start'>
					Organizations
				</TabsTrigger>
			</TabsList>
			<div className='ml-4 flex-1'>
				<TabsContent value='general'>
					<Card>
						<CardHeader>
							<CardTitle>General Settings</CardTitle>
							<CardDescription>General application settings and preferences.</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='space-y-2'>
								<Label htmlFor='app-name'>Application Name</Label>
								<Input id='app-name' defaultValue='My App' />
							</div>
							<div className='space-y-2'>
								<Label htmlFor='description'>Description</Label>
								<Input id='description' defaultValue='My awesome application' />
							</div>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='security'>
					<Card>
						<CardHeader>
							<CardTitle>Security Settings</CardTitle>
							<CardDescription>Configure security and authentication settings.</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Two-factor authentication, API keys, and other security settings.</p>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='integrations'>
					<Card>
						<CardHeader>
							<CardTitle>Integrations</CardTitle>
							<CardDescription>Manage third-party integrations and connections.</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Connect with external services and APIs.</p>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='support'>
					<Card>
						<CardHeader>
							<CardTitle>Support</CardTitle>
							<CardDescription>Get help and contact support.</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Documentation, FAQ, and contact information.</p>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='organizations'>
					<Card>
						<CardHeader>
							<CardTitle>Organizations</CardTitle>
							<CardDescription>Manage organization settings and members.</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Organization management and team settings.</p>
						</CardContent>
					</Card>
				</TabsContent>
			</div>
		</Tabs>
	),
};

export const SimpleTextTabs: Story = {
	render: () => (
		<Tabs defaultValue='tab1' className='w-[400px]'>
			<TabsList>
				<TabsTrigger value='tab1'>Tab 1</TabsTrigger>
				<TabsTrigger value='tab2'>Tab 2</TabsTrigger>
				<TabsTrigger value='tab3'>Tab 3</TabsTrigger>
			</TabsList>
			<TabsContent value='tab1' className='mt-4'>
				<div className='space-y-4'>
					<h3 className='text-lg font-semibold'>Tab 1 Content</h3>
					<p className='text-muted-foreground text-sm'>
						This is the content for the first tab. You can put any content here.
					</p>
				</div>
			</TabsContent>
			<TabsContent value='tab2' className='mt-4'>
				<div className='space-y-4'>
					<h3 className='text-lg font-semibold'>Tab 2 Content</h3>
					<p className='text-muted-foreground text-sm'>
						This is the content for the second tab. Different content from tab 1.
					</p>
				</div>
			</TabsContent>
			<TabsContent value='tab3' className='mt-4'>
				<div className='space-y-4'>
					<h3 className='text-lg font-semibold'>Tab 3 Content</h3>
					<p className='text-muted-foreground text-sm'>
						This is the content for the third tab. Yet another different content.
					</p>
				</div>
			</TabsContent>
		</Tabs>
	),
};

export const WithDisabledTab: Story = {
	render: () => (
		<Tabs defaultValue='available' className='w-[400px]'>
			<TabsList>
				<TabsTrigger value='available'>Available</TabsTrigger>
				<TabsTrigger value='disabled' disabled>
					Disabled
				</TabsTrigger>
				<TabsTrigger value='another'>Another</TabsTrigger>
			</TabsList>
			<TabsContent value='available'>
				<p className='text-muted-foreground text-sm'>This tab is available and can be clicked.</p>
			</TabsContent>
			<TabsContent value='disabled'>
				<p className='text-muted-foreground text-sm'>This tab is disabled and cannot be accessed.</p>
			</TabsContent>
			<TabsContent value='another'>
				<p className='text-muted-foreground text-sm'>This is another available tab.</p>
			</TabsContent>
		</Tabs>
	),
};

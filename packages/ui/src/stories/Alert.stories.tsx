import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlertIcon, InfoIcon, RocketIcon, TriangleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '../components/alert';

const meta: Meta<typeof Alert> = {
	title: 'UI/Alert',
	component: Alert,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['default', 'info', 'success', 'warning', 'destructive'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<Alert {...args} className='w-[420px]'>
			<RocketIcon />
			<AlertTitle>Deployment scheduled</AlertTitle>
			<AlertDescription>
				Version 2.4.1 ships to production on Friday at 16:00 UTC.
			</AlertDescription>
		</Alert>
	),
};

export const Info: Story = {
	render: () => (
		<Alert variant='info' className='w-[420px]'>
			<InfoIcon />
			<AlertTitle>Region failover enabled</AlertTitle>
			<AlertDescription>
				Read replicas in eu-west-1 will take over automatically if us-east-1 becomes
				unavailable.
			</AlertDescription>
		</Alert>
	),
};

export const Success: Story = {
	render: () => (
		<Alert variant='success' className='w-[420px]'>
			<InfoIcon />
			<AlertTitle>Backup completed</AlertTitle>
			<AlertDescription>Snapshot snap_9f2c1 was verified and stored in two regions.</AlertDescription>
		</Alert>
	),
};

export const Warning: Story = {
	render: () => (
		<Alert variant='warning' className='w-[420px]'>
			<TriangleAlertIcon />
			<AlertTitle>Approaching row limit</AlertTitle>
			<AlertDescription>
				The events table is at 82% of the included row quota for this plan.
			</AlertDescription>
		</Alert>
	),
};

export const Destructive: Story = {
	render: () => (
		<Alert variant='destructive' className='w-[420px]'>
			<CircleAlertIcon />
			<AlertTitle>Migration failed</AlertTitle>
			<AlertDescription>
				0007_add_indexes.sql exited with code 1. Roll back before retrying.
			</AlertDescription>
		</Alert>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div className='flex w-[480px] flex-col gap-3'>
			<Alert>
				<RocketIcon />
				<AlertTitle>Default</AlertTitle>
				<AlertDescription>Neutral informational surface.</AlertDescription>
			</Alert>
			<Alert variant='info'>
				<InfoIcon />
				<AlertTitle>Info</AlertTitle>
				<AlertDescription>Helpful context, not urgent.</AlertDescription>
			</Alert>
			<Alert variant='success'>
				<InfoIcon />
				<AlertTitle>Success</AlertTitle>
				<AlertDescription>Something completed correctly.</AlertDescription>
			</Alert>
			<Alert variant='warning'>
				<TriangleAlertIcon />
				<AlertTitle>Warning</AlertTitle>
				<AlertDescription>Needs attention soon.</AlertDescription>
			</Alert>
			<Alert variant='destructive'>
				<CircleAlertIcon />
				<AlertTitle>Destructive</AlertTitle>
				<AlertDescription>Something went wrong or is dangerous.</AlertDescription>
			</Alert>
		</div>
	),
};

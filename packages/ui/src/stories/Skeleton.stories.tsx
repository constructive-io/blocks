import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from '../components/skeleton';

const meta: Meta<typeof Skeleton> = {
	title: 'UI/Skeleton',
	component: Skeleton,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <Skeleton className='h-[20px] w-[100px] rounded-full' />,
};

export const Rectangle: Story = {
	render: () => <Skeleton className='h-[50px] w-[200px]' />,
};

export const Circle: Story = {
	render: () => <Skeleton className='h-12 w-12 rounded-full' />,
};

export const Card: Story = {
	render: () => (
		<div className='flex items-center space-x-4'>
			<Skeleton className='h-12 w-12 rounded-full' />
			<div className='space-y-2'>
				<Skeleton className='h-4 w-[250px]' />
				<Skeleton className='h-4 w-[200px]' />
			</div>
		</div>
	),
};

export const UserProfile: Story = {
	render: () => (
		<div className='w-[300px] space-y-4'>
			<div className='flex items-center space-x-4'>
				<Skeleton className='h-16 w-16 rounded-full' />
				<div className='space-y-2'>
					<Skeleton className='h-4 w-[150px]' />
					<Skeleton className='h-4 w-[100px]' />
				</div>
			</div>
			<div className='space-y-2'>
				<Skeleton className='h-4 w-full' />
				<Skeleton className='h-4 w-full' />
				<Skeleton className='h-4 w-[80%]' />
			</div>
		</div>
	),
};

export const ArticleList: Story = {
	render: () => (
		<div className='w-[400px] space-y-4'>
			{Array.from({ length: 3 }).map((_, i) => (
				<div key={i} className='flex space-x-4'>
					<Skeleton className='h-20 w-20 rounded' />
					<div className='flex-1 space-y-2'>
						<Skeleton className='h-4 w-[90%]' />
						<Skeleton className='h-4 w-[70%]' />
						<Skeleton className='h-3 w-[50%]' />
					</div>
				</div>
			))}
		</div>
	),
};

export const Dashboard: Story = {
	render: () => (
		<div className='w-[500px] space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<Skeleton className='h-8 w-[200px]' />
				<Skeleton className='h-8 w-[100px]' />
			</div>

			{/* Stats */}
			<div className='grid grid-cols-3 gap-4'>
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className='space-y-2 rounded border p-4'>
						<Skeleton className='h-3 w-[60%]' />
						<Skeleton className='h-6 w-[80%]' />
					</div>
				))}
			</div>

			{/* Chart */}
			<div className='space-y-2'>
				<Skeleton className='h-4 w-[150px]' />
				<Skeleton className='h-[200px] w-full' />
			</div>
		</div>
	),
};

export const Table: Story = {
	render: () => (
		<div className='w-[600px] space-y-3'>
			{/* Table Header */}
			<div className='flex space-x-4 border-b pb-2'>
				<Skeleton className='h-4 w-[100px]' />
				<Skeleton className='h-4 w-[150px]' />
				<Skeleton className='h-4 w-[120px]' />
				<Skeleton className='h-4 w-[80px]' />
			</div>

			{/* Table Rows */}
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className='flex space-x-4'>
					<Skeleton className='h-4 w-[100px]' />
					<Skeleton className='h-4 w-[150px]' />
					<Skeleton className='h-4 w-[120px]' />
					<Skeleton className='h-4 w-[80px]' />
				</div>
			))}
		</div>
	),
};

export const DifferentSizes: Story = {
	render: () => (
		<div className='space-y-4'>
			<div className='space-y-2'>
				<p className='text-muted-foreground text-sm'>Text sizes</p>
				<Skeleton className='h-3 w-[200px]' />
				<Skeleton className='h-4 w-[250px]' />
				<Skeleton className='h-5 w-[300px]' />
				<Skeleton className='h-6 w-[350px]' />
			</div>

			<div className='space-y-2'>
				<p className='text-muted-foreground text-sm'>Buttons</p>
				<div className='flex space-x-2'>
					<Skeleton className='h-8 w-16' />
					<Skeleton className='h-9 w-20' />
					<Skeleton className='h-10 w-24' />
				</div>
			</div>

			<div className='space-y-2'>
				<p className='text-muted-foreground text-sm'>Images</p>
				<div className='flex space-x-2'>
					<Skeleton className='h-16 w-16' />
					<Skeleton className='h-20 w-20' />
					<Skeleton className='h-24 w-24' />
				</div>
			</div>
		</div>
	),
};

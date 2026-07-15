import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar, AvatarFallback, AvatarImage } from '../components/avatar';

const meta: Meta<typeof Avatar> = {
	title: 'UI/Avatar',
	component: Avatar,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Avatar>
			<AvatarImage src='https://github.com/shadcn.png' alt='@shadcn' />
			<AvatarFallback>CN</AvatarFallback>
		</Avatar>
	),
};

export const Fallback: Story = {
	render: () => (
		<Avatar>
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
	),
};

export const WithoutImage: Story = {
	render: () => (
		<Avatar>
			<AvatarImage src='' alt='@broken' />
			<AvatarFallback>BR</AvatarFallback>
		</Avatar>
	),
};

export const DifferentSizes: Story = {
	render: () => (
		<div className='flex items-center gap-2'>
			<Avatar className='h-8 w-8'>
				<AvatarImage src='https://github.com/shadcn.png' alt='Small' />
				<AvatarFallback className='text-xs'>SM</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarImage src='https://github.com/shadcn.png' alt='Default' />
				<AvatarFallback>MD</AvatarFallback>
			</Avatar>
			<Avatar className='h-12 w-12'>
				<AvatarImage src='https://github.com/shadcn.png' alt='Large' />
				<AvatarFallback>LG</AvatarFallback>
			</Avatar>
			<Avatar className='h-16 w-16'>
				<AvatarImage src='https://github.com/shadcn.png' alt='Extra Large' />
				<AvatarFallback className='text-lg'>XL</AvatarFallback>
			</Avatar>
		</div>
	),
};

export const Group: Story = {
	render: () => (
		<div className='flex -space-x-2'>
			<Avatar className='border-background border-2'>
				<AvatarImage src='https://github.com/shadcn.png' alt='User 1' />
				<AvatarFallback>U1</AvatarFallback>
			</Avatar>
			<Avatar className='border-background border-2'>
				<AvatarImage src='' alt='User 2' />
				<AvatarFallback>U2</AvatarFallback>
			</Avatar>
			<Avatar className='border-background border-2'>
				<AvatarImage src='' alt='User 3' />
				<AvatarFallback>U3</AvatarFallback>
			</Avatar>
			<Avatar className='border-background border-2'>
				<AvatarFallback>+5</AvatarFallback>
			</Avatar>
		</div>
	),
};

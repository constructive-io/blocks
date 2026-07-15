import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Input } from '../components/input';
import { Label } from '../components/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/popover';
import { Textarea } from '../components/textarea';

const meta: Meta<typeof Popover> = {
	title: 'UI/Popover',
	component: Popover,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline'>Open popover</Button>
			</PopoverTrigger>
			<PopoverContent className='w-80'>
				<div className='grid gap-4'>
					<div className='space-y-2'>
						<h4 className='leading-none font-medium'>Dimensions</h4>
						<p className='text-muted-foreground text-sm'>Set the dimensions for the layer.</p>
					</div>
					<div className='grid gap-2'>
						<div className='grid grid-cols-3 items-center gap-4'>
							<Label htmlFor='width'>Width</Label>
							<Input id='width' defaultValue='100%' className='col-span-2 h-8' />
						</div>
						<div className='grid grid-cols-3 items-center gap-4'>
							<Label htmlFor='maxWidth'>Max. width</Label>
							<Input id='maxWidth' defaultValue='300px' className='col-span-2 h-8' />
						</div>
						<div className='grid grid-cols-3 items-center gap-4'>
							<Label htmlFor='height'>Height</Label>
							<Input id='height' defaultValue='25px' className='col-span-2 h-8' />
						</div>
						<div className='grid grid-cols-3 items-center gap-4'>
							<Label htmlFor='maxHeight'>Max. height</Label>
							<Input id='maxHeight' defaultValue='none' className='col-span-2 h-8' />
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const WithArrow: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline'>Popover with arrow</Button>
			</PopoverTrigger>
			<PopoverContent showArrow>
				<div className='space-y-2'>
					<h4 className='font-medium'>Popover with Arrow</h4>
					<p className='text-muted-foreground text-sm'>This popover has an arrow pointing to the trigger.</p>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const DifferentSides: Story = {
	render: () => (
		<div className='grid h-[400px] w-[500px] grid-cols-2 place-items-center gap-8'>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant='outline'>Top</Button>
				</PopoverTrigger>
				<PopoverContent side='top'>
					<p>Popover on top</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant='outline'>Right</Button>
				</PopoverTrigger>
				<PopoverContent side='right'>
					<p>Popover on right</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant='outline'>Bottom</Button>
				</PopoverTrigger>
				<PopoverContent side='bottom'>
					<p>Popover on bottom</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant='outline'>Left</Button>
				</PopoverTrigger>
				<PopoverContent side='left'>
					<p>Popover on left</p>
				</PopoverContent>
			</Popover>
		</div>
	),
};

export const UserProfile: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline'>View Profile</Button>
			</PopoverTrigger>
			<PopoverContent className='w-80'>
				<div className='flex gap-4'>
					<div className='bg-muted flex h-12 w-12 items-center justify-center rounded-full'>👤</div>
					<div className='space-y-1'>
						<h4 className='text-sm font-semibold'>John Doe</h4>
						<p className='text-muted-foreground text-sm'>Software Engineer</p>
						<div className='flex items-center pt-2'>
							<Button size='sm' className='h-7 px-3'>
								View Profile
							</Button>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const QuickActions: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline'>Quick Actions</Button>
			</PopoverTrigger>
			<PopoverContent className='w-56'>
				<div className='grid gap-2'>
					<Button variant='ghost' className='justify-start'>
						📝 Create new document
					</Button>
					<Button variant='ghost' className='justify-start'>
						📁 Upload file
					</Button>
					<Button variant='ghost' className='justify-start'>
						👥 Invite team member
					</Button>
					<Button variant='ghost' className='justify-start'>
						⚙️ Settings
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const ContactForm: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline'>Contact Us</Button>
			</PopoverTrigger>
			<PopoverContent className='w-96'>
				<div className='grid gap-4'>
					<div className='space-y-2'>
						<h4 className='leading-none font-medium'>Contact Us</h4>
						<p className='text-muted-foreground text-sm'>Send us a message and we&apos;ll get back to you.</p>
					</div>
					<div className='grid gap-2'>
						<div className='grid gap-1'>
							<Label htmlFor='name' className='text-sm'>
								Name
							</Label>
							<Input id='name' placeholder='Your name' className='h-8' />
						</div>
						<div className='grid gap-1'>
							<Label htmlFor='email' className='text-sm'>
								Email
							</Label>
							<Input id='email' type='email' placeholder='your@email.com' className='h-8' />
						</div>
						<div className='grid gap-1'>
							<Label htmlFor='message' className='text-sm'>
								Message
							</Label>
							<Textarea id='message' placeholder='Your message...' className='min-h-[80px]' />
						</div>
						<Button size='sm' className='mt-2'>
							Send Message
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const ColorPicker: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline' className='w-[200px] justify-start'>
					<div className='mr-2 h-4 w-4 rounded-sm bg-blue-500' />
					Choose color
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-64'>
				<div className='grid gap-4'>
					<div className='space-y-2'>
						<h4 className='leading-none font-medium'>Color Picker</h4>
						<p className='text-muted-foreground text-sm'>Pick a color for your theme.</p>
					</div>
					<div className='grid grid-cols-6 gap-2'>
						{[
							'bg-red-500',
							'bg-orange-500',
							'bg-yellow-500',
							'bg-green-500',
							'bg-blue-500',
							'bg-purple-500',
							'bg-pink-500',
							'bg-gray-500',
							'bg-red-600',
							'bg-orange-600',
							'bg-yellow-600',
							'bg-green-600',
						].map((color, i) => (
							<button key={i} className={`h-8 w-8 rounded-sm ${color} transition-transform hover:scale-110`} />
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const ShareDialog: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline'>Share</Button>
			</PopoverTrigger>
			<PopoverContent className='w-80'>
				<div className='grid gap-4'>
					<div className='space-y-2'>
						<h4 className='leading-none font-medium'>Share this page</h4>
						<p className='text-muted-foreground text-sm'>Anyone with the link can view this page.</p>
					</div>
					<div className='flex space-x-2'>
						<Input value='https://example.com/share/abc123' readOnly className='flex-1' />
						<Button size='sm' className='px-3'>
							Copy
						</Button>
					</div>
					<div className='grid grid-cols-3 gap-2'>
						<Button variant='outline' size='sm'>
							📧 Email
						</Button>
						<Button variant='outline' size='sm'>
							🐦 Twitter
						</Button>
						<Button variant='outline' size='sm'>
							👔 LinkedIn
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const DateTimePicker: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline'>📅 Pick a date</Button>
			</PopoverTrigger>
			<PopoverContent className='w-auto p-0'>
				<div className='space-y-4 p-4'>
					<div className='space-y-2'>
						<h4 className='font-medium'>Date & Time</h4>
						<div className='grid gap-2'>
							<Label htmlFor='date'>Date</Label>
							<Input id='date' type='date' defaultValue='2024-01-15' className='h-8' />
							<Label htmlFor='time'>Time</Label>
							<Input id='time' type='time' defaultValue='14:30' className='h-8' />
						</div>
					</div>
					<div className='flex justify-end gap-2'>
						<Button variant='outline' size='sm'>
							Cancel
						</Button>
						<Button size='sm'>Confirm</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

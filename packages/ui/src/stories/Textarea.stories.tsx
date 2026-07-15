import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from '../components/label';
import { Textarea } from '../components/textarea';

const meta: Meta<typeof Textarea> = {
	title: 'UI/Textarea',
	component: Textarea,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		placeholder: {
			control: { type: 'text' },
		},
		disabled: {
			control: { type: 'boolean' },
		},
		rows: {
			control: { type: 'number' },
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Type your message here.',
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className='grid w-full gap-1.5'>
			<Label htmlFor='message'>Your message</Label>
			<Textarea placeholder='Type your message here.' id='message' />
		</div>
	),
};

export const WithText: Story = {
	render: () => (
		<Textarea
			placeholder='Type your message here.'
			value='This is a textarea with some pre-filled text content. You can edit this text.'
			readOnly
		/>
	),
};

export const Disabled: Story = {
	args: {
		placeholder: 'Type your message here.',
		disabled: true,
	},
};

export const DifferentRows: Story = {
	render: () => (
		<div className='w-full max-w-sm space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='small'>Small (2 rows)</Label>
				<Textarea id='small' rows={2} placeholder='Small textarea' />
			</div>
			<div className='space-y-2'>
				<Label htmlFor='medium'>Medium (4 rows)</Label>
				<Textarea id='medium' rows={4} placeholder='Medium textarea' />
			</div>
			<div className='space-y-2'>
				<Label htmlFor='large'>Large (8 rows)</Label>
				<Textarea id='large' rows={8} placeholder='Large textarea' />
			</div>
		</div>
	),
};

export const WithDescription: Story = {
	render: () => (
		<div className='grid w-full gap-1.5'>
			<Label htmlFor='message-2'>Your message</Label>
			<Textarea placeholder='Type your message here.' id='message-2' />
			<p className='text-muted-foreground text-sm'>Your message will be copied to the support team.</p>
		</div>
	),
};

export const ErrorState: Story = {
	render: () => (
		<div className='grid w-full gap-1.5'>
			<Label htmlFor='message-error' className='text-destructive'>
				Your message
			</Label>
			<Textarea placeholder='Type your message here.' id='message-error' className='border-destructive' />
			<p className='text-destructive text-sm'>Message is required and must be at least 10 characters long.</p>
		</div>
	),
};

export const ContactForm: Story = {
	render: () => (
		<form className='w-full max-w-md space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='name'>Name</Label>
				<input
					id='name'
					className='border-input/70 bg-background ring-offset-background placeholder:text-muted-foreground
						focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0
						file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2
						focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
					placeholder='Your name'
				/>
			</div>
			<div className='space-y-2'>
				<Label htmlFor='email'>Email</Label>
				<input
					id='email'
					type='email'
					className='border-input/70 bg-background ring-offset-background placeholder:text-muted-foreground
						focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0
						file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2
						focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
					placeholder='Your email'
				/>
			</div>
			<div className='space-y-2'>
				<Label htmlFor='message'>Message</Label>
				<Textarea id='message' placeholder='Tell us how we can help you...' rows={4} />
			</div>
			<button
				type='submit'
				className='bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full rounded-md px-4 py-2 text-sm
					font-medium'
			>
				Send Message
			</button>
		</form>
	),
};

export const FeedbackForm: Story = {
	render: () => (
		<div className='w-full max-w-md space-y-4'>
			<div className='space-y-2'>
				<h3 className='text-lg font-semibold'>Share your feedback</h3>
				<p className='text-muted-foreground text-sm'>Help us improve by sharing your thoughts and suggestions.</p>
			</div>
			<div className='space-y-2'>
				<Label htmlFor='feedback'>Your feedback</Label>
				<Textarea id='feedback' placeholder='What do you think about our product? What could we improve?' rows={5} />
			</div>
			<div className='flex justify-end space-x-2'>
				<button className='px-4 py-2 text-sm'>Cancel</button>
				<button className='bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm'>Submit Feedback</button>
			</div>
		</div>
	),
};

export const CharacterLimit: Story = {
	render: () => (
		<div className='grid w-full gap-1.5'>
			<Label htmlFor='bio'>Bio (max 160 characters)</Label>
			<Textarea id='bio' placeholder='Tell us about yourself...' maxLength={160} rows={3} />
			<p className='text-muted-foreground text-right text-sm'>0/160 characters</p>
		</div>
	),
};

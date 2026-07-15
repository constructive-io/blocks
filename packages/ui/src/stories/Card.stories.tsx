import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Heart, MoreHorizontal, Star, TrendingUp } from 'lucide-react';

import { Badge } from '../components/badge';
import { Button } from '../components/button';
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../components/card';

const meta: Meta<typeof Card> = {
	title: 'UI/Card',
	component: Card,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['default', 'elevated', 'flat', 'ghost', 'interactive'],
			description: 'Visual style variant of the card',
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Card className='w-[350px]'>
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>Card description goes here.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className='text-sm'>This is the card content with the default subtle shadow.</p>
			</CardContent>
		</Card>
	),
};

export const Variants: Story = {
	render: () => (
		<div className='grid max-w-3xl grid-cols-2 gap-6'>
			<Card variant='default' className='w-full'>
				<CardHeader>
					<CardTitle>Default</CardTitle>
					<CardDescription>Subtle shadow, standard border</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground text-sm'>Best for most use cases.</p>
				</CardContent>
			</Card>

			<Card variant='elevated' className='w-full'>
				<CardHeader>
					<CardTitle>Elevated</CardTitle>
					<CardDescription>Larger shadow for prominence</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground text-sm'>For featured or important content.</p>
				</CardContent>
			</Card>

			<Card variant='flat' className='w-full'>
				<CardHeader>
					<CardTitle>Flat</CardTitle>
					<CardDescription>No shadow, border only</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground text-sm'>Minimal, clean appearance.</p>
				</CardContent>
			</Card>

			<Card variant='interactive' className='w-full'>
				<CardHeader>
					<CardTitle>Interactive</CardTitle>
					<CardDescription>Hover to see the effect</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground text-sm'>For clickable cards with lift effect.</p>
				</CardContent>
			</Card>
		</div>
	),
};

export const Interactive: Story = {
	render: () => (
		<Card variant='interactive' className='w-[350px]'>
			<CardHeader>
				<CardTitle>Clickable Card</CardTitle>
				<CardDescription>Hover to see the lift effect</CardDescription>
			</CardHeader>
			<CardContent>
				<p className='text-muted-foreground text-sm'>
					Interactive cards lift on hover with enhanced shadow, perfect for navigation items.
				</p>
			</CardContent>
			<CardFooter className='justify-between'>
				<span className='text-muted-foreground text-sm'>Learn more</span>
				<ArrowRight className='text-muted-foreground h-4 w-4' />
			</CardFooter>
		</Card>
	),
};

export const Elevated: Story = {
	render: () => (
		<Card variant='elevated' className='w-[350px]'>
			<CardHeader>
				<CardTitle>Featured Content</CardTitle>
				<CardDescription>This card demands attention</CardDescription>
			</CardHeader>
			<CardContent>
				<p className='text-muted-foreground text-sm'>
					Elevated cards have a more prominent shadow, ideal for hero sections or featured items.
				</p>
			</CardContent>
		</Card>
	),
};

export const Flat: Story = {
	render: () => (
		<Card variant='flat' className='w-[350px]'>
			<CardHeader>
				<CardTitle>Minimal Card</CardTitle>
				<CardDescription>Clean and understated</CardDescription>
			</CardHeader>
			<CardContent>
				<p className='text-muted-foreground text-sm'>
					Flat cards work well in dense layouts or when you want minimal visual noise.
				</p>
			</CardContent>
		</Card>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Card className='w-[350px]'>
			<CardHeader>
				<CardTitle>Card with Footer</CardTitle>
				<CardDescription>This card includes a footer section.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className='text-sm'>Main content goes here.</p>
			</CardContent>
			<CardFooter>
				<Button>Action</Button>
			</CardFooter>
		</Card>
	),
};

export const WithAction: Story = {
	render: () => (
		<Card className='w-[350px]'>
			<CardHeader>
				<CardTitle>Card with Action</CardTitle>
				<CardAction>
					<Button variant='ghost' size='icon'>
						<MoreHorizontal className='h-4 w-4' />
					</Button>
				</CardAction>
				<CardDescription>This card has an action button in the header.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className='text-sm'>Content with header action.</p>
			</CardContent>
		</Card>
	),
};

export const BlogPost: Story = {
	render: () => (
		<Card className='w-[400px]'>
			<CardHeader>
				<CardTitle>Getting Started with React</CardTitle>
				<CardDescription>Published on March 15, 2024</CardDescription>
			</CardHeader>
			<CardContent>
				<p className='text-muted-foreground text-sm'>
					Learn the fundamentals of React and how to build your first component. This tutorial covers everything you
					need to know to get started.
				</p>
				<div className='mt-4 flex gap-2'>
					<Badge variant='secondary'>React</Badge>
					<Badge variant='secondary'>Tutorial</Badge>
					<Badge variant='secondary'>Beginner</Badge>
				</div>
			</CardContent>
			<CardFooter>
				<Button>Read More</Button>
			</CardFooter>
		</Card>
	),
};

export const UserProfile: Story = {
	render: () => (
		<Card className='w-[350px]'>
			<CardHeader>
				<div className='flex items-center space-x-4'>
					<div className='bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full font-semibold'>
						JD
					</div>
					<div>
						<CardTitle>John Doe</CardTitle>
						<CardDescription>Software Engineer</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<p className='text-sm'>Passionate about building great user experiences with modern web technologies.</p>
				<div className='text-muted-foreground mt-4 flex justify-between text-sm'>
					<span>Followers: 1,234</span>
					<span>Following: 567</span>
				</div>
			</CardContent>
			<CardFooter>
				<Button className='w-full'>Follow</Button>
			</CardFooter>
		</Card>
	),
};

export const ProductCard: Story = {
	render: () => (
		<Card variant='interactive' className='w-[300px]'>
			<CardHeader>
				<div className='bg-muted/50 mb-2 aspect-square rounded-lg'></div>
				<CardTitle>Wireless Headphones</CardTitle>
				<CardDescription>Premium noise-cancelling headphones</CardDescription>
			</CardHeader>
			<CardContent>
				<div className='flex items-center justify-between'>
					<span className='text-2xl font-bold'>$299</span>
					<div className='flex items-center gap-1'>
						<Star className='h-4 w-4 fill-amber-400 text-amber-400' />
						<span className='text-muted-foreground text-sm'>4.9</span>
					</div>
				</div>
			</CardContent>
			<CardFooter className='flex gap-2'>
				<Button className='flex-1'>Add to Cart</Button>
				<Button variant='outline' size='icon'>
					<Heart className='h-4 w-4' />
				</Button>
			</CardFooter>
		</Card>
	),
};

export const StatCard: Story = {
	render: () => (
		<Card className='w-[250px]'>
			<CardHeader className='pb-2'>
				<CardDescription>Total Revenue</CardDescription>
				<CardTitle className='text-3xl'>$45,231.89</CardTitle>
			</CardHeader>
			<CardContent>
				<div className='flex items-center gap-1 text-sm text-success'>
					<TrendingUp className='h-4 w-4' />
					<span>+20.1% from last month</span>
				</div>
			</CardContent>
		</Card>
	),
};

export const MultipleCards: Story = {
	render: () => (
		<div className='grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3'>
			<Card>
				<CardHeader>
					<CardTitle>Card 1</CardTitle>
					<CardDescription>First card in the grid.</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-sm'>Content for card 1.</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Card 2</CardTitle>
					<CardDescription>Second card in the grid.</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-sm'>Content for card 2.</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Card 3</CardTitle>
					<CardDescription>Third card in the grid.</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-sm'>Content for card 3.</p>
				</CardContent>
			</Card>
		</div>
	),
};

export const DashboardLayout: Story = {
	render: () => (
		<div className='grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-4'>
			{/* Stats row */}
			<Card className='col-span-1'>
				<CardHeader className='pb-2'>
					<CardDescription>Users</CardDescription>
					<CardTitle className='text-2xl'>2,350</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground text-xs'>+180 this week</p>
				</CardContent>
			</Card>
			<Card className='col-span-1'>
				<CardHeader className='pb-2'>
					<CardDescription>Revenue</CardDescription>
					<CardTitle className='text-2xl'>$12.5k</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-xs text-success'>+12.3%</p>
				</CardContent>
			</Card>
			<Card className='col-span-1'>
				<CardHeader className='pb-2'>
					<CardDescription>Orders</CardDescription>
					<CardTitle className='text-2xl'>1,247</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-muted-foreground text-xs'>+32 today</p>
				</CardContent>
			</Card>
			<Card className='col-span-1'>
				<CardHeader className='pb-2'>
					<CardDescription>Conversion</CardDescription>
					<CardTitle className='text-2xl'>3.2%</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-xs text-success'>+0.4%</p>
				</CardContent>
			</Card>

			{/* Main content */}
			<Card variant='elevated' className='col-span-2 md:col-span-4'>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
					<CardDescription>Your latest updates and notifications</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='text-muted-foreground space-y-3 text-sm'>
						<p>Activity content would go here...</p>
					</div>
				</CardContent>
			</Card>
		</div>
	),
};

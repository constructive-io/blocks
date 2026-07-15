import {
	RiAddLine,
	RiBookmarkLine,
	RiCalendarLine,
	RiCameraLine,
	RiDashboardLine,
	RiDeleteBin6Line,
	RiDownloadLine,
	RiEditLine,
	RiFileTextLine,
	RiGamepadLine,
	RiHeartLine,
	RiHomeLine,
	RiMailLine,
	RiMessage3Line,
	RiMusicLine,
	RiNotificationLine,
	RiSearchLine,
	RiSettingsLine,
	RiShareLine,
	RiShoppingCartLine,
	RiStarLine,
	RiUser3Line,
} from '@remixicon/react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Dock, DockIcon } from '../components/dock';

const meta: Meta<typeof Dock> = {
	title: 'UI/Dock',
	component: Dock,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		iconSize: {
			control: { type: 'range', min: 20, max: 80, step: 5 },
			description: 'Base size of dock icons in pixels',
		},
		iconMagnification: {
			control: { type: 'range', min: 40, max: 120, step: 5 },
			description: 'Maximum size when hovering over icons',
		},
		iconDistance: {
			control: { type: 'range', min: 80, max: 200, step: 10 },
			description: 'Distance threshold for magnification effect',
		},
		direction: {
			control: { type: 'select' },
			options: ['top', 'middle', 'bottom'],
			description: 'Vertical alignment of dock icons',
		},
		className: {
			control: { type: 'text' },
			description: 'Additional CSS classes',
		},
	},
	args: {
		iconSize: 40,
		iconMagnification: 60,
		iconDistance: 140,
		direction: 'middle',
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample dock icons for consistent use across stories
const SampleIcons = () => (
	<>
		<DockIcon>
			<div className='flex h-full w-full items-center justify-center rounded-full bg-blue-500 font-semibold text-white'>
				📧
			</div>
		</DockIcon>
		<DockIcon>
			<div className='flex h-full w-full items-center justify-center rounded-full bg-green-500 font-semibold text-white'>
				💬
			</div>
		</DockIcon>
		<DockIcon>
			<div
				className='flex h-full w-full items-center justify-center rounded-full bg-purple-500 font-semibold text-white'
			>
				📷
			</div>
		</DockIcon>
		<DockIcon>
			<div
				className='flex h-full w-full items-center justify-center rounded-full bg-orange-500 font-semibold text-white'
			>
				🎵
			</div>
		</DockIcon>
		<DockIcon>
			<div className='flex h-full w-full items-center justify-center rounded-full bg-red-500 font-semibold text-white'>
				🎮
			</div>
		</DockIcon>
	</>
);

export const Default: Story = {
	render: (args) => (
		<Dock {...args}>
			<SampleIcons />
		</Dock>
	),
};

export const SmallIcons: Story = {
	args: {
		iconSize: 30,
		iconMagnification: 45,
	},
	render: (args) => (
		<Dock {...args}>
			<SampleIcons />
		</Dock>
	),
};

export const LargeIcons: Story = {
	args: {
		iconSize: 60,
		iconMagnification: 90,
	},
	render: (args) => (
		<Dock {...args}>
			<SampleIcons />
		</Dock>
	),
};

export const HighMagnification: Story = {
	args: {
		iconSize: 40,
		iconMagnification: 100,
		iconDistance: 120,
	},
	render: (args) => (
		<Dock {...args}>
			<SampleIcons />
		</Dock>
	),
};

export const LowMagnification: Story = {
	args: {
		iconSize: 40,
		iconMagnification: 50,
		iconDistance: 160,
	},
	render: (args) => (
		<Dock {...args}>
			<SampleIcons />
		</Dock>
	),
};

export const TopAligned: Story = {
	args: {
		direction: 'top',
	},
	render: (args) => (
		<div className='flex h-32 flex-col justify-center'>
			<Dock {...args}>
				<SampleIcons />
			</Dock>
		</div>
	),
};

export const BottomAligned: Story = {
	args: {
		direction: 'bottom',
	},
	render: (args) => (
		<div className='flex h-32 flex-col justify-center'>
			<Dock {...args}>
				<SampleIcons />
			</Dock>
		</div>
	),
};

export const SingleIcon: Story = {
	render: (args) => (
		<Dock {...args}>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-400
						to-purple-600 text-xl text-white'
				>
					⚡
				</div>
			</DockIcon>
		</Dock>
	),
};

export const ManyIcons: Story = {
	render: (args) => (
		<Dock {...args}>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-slate-600 text-white'>📁</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-blue-500 text-white'>📧</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-green-500 text-white'>💬</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-purple-500 text-white'>📷</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-orange-500 text-white'>🎵</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-red-500 text-white'>🎮</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-yellow-500 text-white'>📝</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-pink-500 text-white'>🎨</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-full bg-indigo-500 text-white'>🚀</div>
			</DockIcon>
		</Dock>
	),
};

export const ApplicationDock: Story = {
	render: (args) => (
		<Dock {...args}>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-red-500
						to-red-600 text-white shadow-lg'
				>
					<svg className='h-6 w-6' fill='currentColor' viewBox='0 0 24 24'>
						<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
					</svg>
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500
						to-blue-600 text-white shadow-lg'
				>
					<svg className='h-6 w-6' fill='currentColor' viewBox='0 0 24 24'>
						<path d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' />
					</svg>
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-green-500
						to-green-600 text-white shadow-lg'
				>
					<svg className='h-6 w-6' fill='currentColor' viewBox='0 0 24 24'>
						<path d='M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v2h8v-2h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6V6h12v8z' />
					</svg>
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500
						to-purple-600 text-white shadow-lg'
				>
					<svg className='h-6 w-6' fill='currentColor' viewBox='0 0 24 24'>
						<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
					</svg>
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500
						to-orange-600 text-white shadow-lg'
				>
					<svg className='h-6 w-6' fill='currentColor' viewBox='0 0 24 24'>
						<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z' />
					</svg>
				</div>
			</DockIcon>
		</Dock>
	),
};

export const CustomStyling: Story = {
	render: (args) => (
		<Dock {...args} className='border-white/20 bg-black/20'>
			<DockIcon className='bg-white/10 backdrop-blur-sm'>
				<div className='text-2xl'>🌟</div>
			</DockIcon>
			<DockIcon className='bg-white/10 backdrop-blur-sm'>
				<div className='text-2xl'>✨</div>
			</DockIcon>
			<DockIcon className='bg-white/10 backdrop-blur-sm'>
				<div className='text-2xl'>💫</div>
			</DockIcon>
			<DockIcon className='bg-white/10 backdrop-blur-sm'>
				<div className='text-2xl'>🎪</div>
			</DockIcon>
		</Dock>
	),
};

export const InteractiveDemo: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Try hovering over the icons to see the magnification effect in action. Notice how the spring animation creates a smooth, natural feel.',
			},
		},
	},
	render: (args) => (
		<div className='space-y-8'>
			<div className='text-center text-sm text-gray-600 dark:text-gray-400'>
				Hover over the dock icons to see the magnification effect
			</div>
			<Dock {...args}>
				<DockIcon>
					<div
						className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-red-400
							to-pink-500 text-lg text-white shadow-lg'
					>
						🎯
					</div>
				</DockIcon>
				<DockIcon>
					<div
						className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400
							to-cyan-500 text-lg text-white shadow-lg'
					>
						🚀
					</div>
				</DockIcon>
				<DockIcon>
					<div
						className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-green-400
							to-emerald-500 text-lg text-white shadow-lg'
					>
						⚡
					</div>
				</DockIcon>
				<DockIcon>
					<div
						className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400
							to-violet-500 text-lg text-white shadow-lg'
					>
						🎨
					</div>
				</DockIcon>
				<DockIcon>
					<div
						className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400
							to-yellow-500 text-lg text-white shadow-lg'
					>
						🎪
					</div>
				</DockIcon>
			</Dock>
		</div>
	),
};

export const AllDirections: Story = {
	render: (args) => (
		<div className='space-y-12'>
			<div>
				<h3 className='mb-4 text-center font-semibold'>Top Aligned</h3>
				<div className='flex h-24 flex-col justify-center'>
					<Dock {...args} direction='top'>
						<SampleIcons />
					</Dock>
				</div>
			</div>
			<div>
				<h3 className='mb-4 text-center font-semibold'>Middle Aligned (Default)</h3>
				<div className='flex h-24 flex-col justify-center'>
					<Dock {...args} direction='middle'>
						<SampleIcons />
					</Dock>
				</div>
			</div>
			<div>
				<h3 className='mb-4 text-center font-semibold'>Bottom Aligned</h3>
				<div className='flex h-24 flex-col justify-center'>
					<Dock {...args} direction='bottom'>
						<SampleIcons />
					</Dock>
				</div>
			</div>
		</div>
	),
};

export const WithRemixIcons: Story = {
	parameters: {
		docs: {
			description: {
				story: 'Using Remix Icons (@remixicon/react) for clean, consistent iconography.',
			},
		},
	},
	render: (args) => (
		<Dock {...args}>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg'>
					<RiHomeLine className='h-5 w-5' />
				</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-2xl bg-green-500 text-white shadow-lg'>
					<RiMailLine className='h-5 w-5' />
				</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-2xl bg-purple-500 text-white shadow-lg'>
					<RiMessage3Line className='h-5 w-5' />
				</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg'>
					<RiCameraLine className='h-5 w-5' />
				</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg'>
					<RiMusicLine className='h-5 w-5' />
				</div>
			</DockIcon>
			<DockIcon>
				<div className='flex h-full w-full items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg'>
					<RiGamepadLine className='h-5 w-5' />
				</div>
			</DockIcon>
		</Dock>
	),
};

export const WorkspaceDock: Story = {
	parameters: {
		docs: {
			description: {
				story: 'A professional workspace dock with common productivity tools and applications.',
			},
		},
	},
	render: (args) => (
		<Dock {...args} iconSize={48} iconMagnification={72}>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-slate-600
						to-slate-700 text-white shadow-xl'
				>
					<RiDashboardLine className='h-6 w-6' />
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500
						to-blue-600 text-white shadow-xl'
				>
					<RiMailLine className='h-6 w-6' />
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-green-500
						to-green-600 text-white shadow-xl'
				>
					<RiMessage3Line className='h-6 w-6' />
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500
						to-purple-600 text-white shadow-xl'
				>
					<RiCalendarLine className='h-6 w-6' />
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500
						to-orange-600 text-white shadow-xl'
				>
					<RiFileTextLine className='h-6 w-6' />
				</div>
			</DockIcon>
			<DockIcon>
				<div
					className='flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-gray-600
						to-gray-700 text-white shadow-xl'
				>
					<RiSettingsLine className='h-6 w-6' />
				</div>
			</DockIcon>
		</Dock>
	),
};

export const WithButtonComponents: Story = {
	parameters: {
		docs: {
			description: {
				story: 'Integration with shadcn/ui Button components for interactive functionality.',
			},
		},
	},
	render: (args) => (
		<Dock {...args}>
			<DockIcon>
				<Button variant='default' size='icon' className='h-full w-full rounded-2xl'>
					<RiSearchLine className='h-5 w-5' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button variant='secondary' size='icon' className='h-full w-full rounded-2xl'>
					<RiNotificationLine className='h-5 w-5' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button variant='outline' size='icon' className='h-full w-full rounded-2xl'>
					<RiUser3Line className='h-5 w-5' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button variant='ghost' size='icon' className='h-full w-full rounded-2xl'>
					<RiSettingsLine className='h-5 w-5' />
				</Button>
			</DockIcon>
		</Dock>
	),
};

export const InteractiveActions: Story = {
	parameters: {
		docs: {
			description: {
				story: 'Clickable dock with real button actions. Try clicking the buttons to see console logs.',
			},
		},
	},
	render: (args) => (
		<div className='space-y-6'>
			<div className='text-center text-sm text-gray-600 dark:text-gray-400'>
				Click the dock icons to trigger actions (check browser console)
			</div>
			<Dock {...args}>
				<DockIcon>
					<Button
						variant='default'
						size='icon'
						className='h-full w-full rounded-2xl border-0 bg-gradient-to-br from-blue-500 to-blue-600'
						onClick={() => console.log('Home clicked!')}
					>
						<RiHomeLine className='h-5 w-5' />
					</Button>
				</DockIcon>
				<DockIcon>
					<Button
						variant='default'
						size='icon'
						className='h-full w-full rounded-2xl border-0 bg-gradient-to-br from-green-500 to-green-600'
						onClick={() => console.log('Add item clicked!')}
					>
						<RiAddLine className='h-5 w-5' />
					</Button>
				</DockIcon>
				<DockIcon>
					<Button
						variant='default'
						size='icon'
						className='h-full w-full rounded-2xl border-0 bg-gradient-to-br from-purple-500 to-purple-600'
						onClick={() => console.log('Search clicked!')}
					>
						<RiSearchLine className='h-5 w-5' />
					</Button>
				</DockIcon>
				<DockIcon>
					<Button
						variant='default'
						size='icon'
						className='h-full w-full rounded-2xl border-0 bg-gradient-to-br from-orange-500 to-orange-600'
						onClick={() => console.log('Edit clicked!')}
					>
						<RiEditLine className='h-5 w-5' />
					</Button>
				</DockIcon>
				<DockIcon>
					<Button
						variant='destructive'
						size='icon'
						className='h-full w-full rounded-2xl'
						onClick={() => console.log('Delete clicked!')}
					>
						<RiDeleteBin6Line className='h-5 w-5' />
					</Button>
				</DockIcon>
			</Dock>
		</div>
	),
};

export const SocialMediaDock: Story = {
	parameters: {
		docs: {
			description: {
				story: 'Social media and engagement-focused dock with heart, star, and share actions.',
			},
		},
	},
	render: (args) => (
		<Dock {...args} iconSize={44} iconMagnification={66}>
			<DockIcon>
				<Button
					variant='ghost'
					size='icon'
					className='h-full w-full rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20'
					onClick={() => console.log('Like clicked!')}
				>
					<RiHeartLine className='h-5 w-5 text-red-500' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button
					variant='ghost'
					size='icon'
					className='h-full w-full rounded-2xl hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
					onClick={() => console.log('Star clicked!')}
				>
					<RiStarLine className='h-5 w-5 text-yellow-500' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button
					variant='ghost'
					size='icon'
					className='h-full w-full rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20'
					onClick={() => console.log('Bookmark clicked!')}
				>
					<RiBookmarkLine className='h-5 w-5 text-blue-500' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button
					variant='ghost'
					size='icon'
					className='h-full w-full rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/20'
					onClick={() => console.log('Share clicked!')}
				>
					<RiShareLine className='h-5 w-5 text-green-500' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button
					variant='ghost'
					size='icon'
					className='h-full w-full rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/20'
					onClick={() => console.log('Download clicked!')}
				>
					<RiDownloadLine className='h-5 w-5 text-purple-500' />
				</Button>
			</DockIcon>
		</Dock>
	),
};

export const EcommerceDock: Story = {
	parameters: {
		docs: {
			description: {
				story: 'E-commerce focused dock with shopping, favorites, and user account actions.',
			},
		},
	},
	render: (args) => (
		<Dock {...args} className='border-gray-200/60 bg-white/95 dark:border-gray-800/50 dark:bg-black/95'>
			<DockIcon>
				<Button
					variant='outline'
					size='icon'
					className='h-full w-full rounded-2xl border-gray-200/60 dark:border-gray-700/50'
					onClick={() => console.log('Shop clicked!')}
				>
					<RiShoppingCartLine className='h-5 w-5' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button
					variant='outline'
					size='icon'
					className='h-full w-full rounded-2xl border-gray-200/60 dark:border-gray-700/50'
					onClick={() => console.log('Favorites clicked!')}
				>
					<RiHeartLine className='h-5 w-5' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button
					variant='outline'
					size='icon'
					className='h-full w-full rounded-2xl border-gray-200/60 dark:border-gray-700/50'
					onClick={() => console.log('Search clicked!')}
				>
					<RiSearchLine className='h-5 w-5' />
				</Button>
			</DockIcon>
			<DockIcon>
				<Button
					variant='outline'
					size='icon'
					className='h-full w-full rounded-2xl border-gray-200/60 dark:border-gray-700/50'
					onClick={() => console.log('Profile clicked!')}
				>
					<RiUser3Line className='h-5 w-5' />
				</Button>
			</DockIcon>
		</Dock>
	),
};

export const MinimalIconDock: Story = {
	parameters: {
		docs: {
			description: {
				story: 'Clean, minimal dock with just icons and subtle hover effects.',
			},
		},
	},
	render: (args) => (
		<Dock {...args} className='border-transparent bg-transparent backdrop-blur-none'>
			<DockIcon className='bg-transparent transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10'>
				<RiHomeLine className='h-6 w-6 text-gray-700 dark:text-gray-300' />
			</DockIcon>
			<DockIcon className='bg-transparent transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10'>
				<RiMailLine className='h-6 w-6 text-gray-700 dark:text-gray-300' />
			</DockIcon>
			<DockIcon className='bg-transparent transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10'>
				<RiMessage3Line className='h-6 w-6 text-gray-700 dark:text-gray-300' />
			</DockIcon>
			<DockIcon className='bg-transparent transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10'>
				<RiSettingsLine className='h-6 w-6 text-gray-700 dark:text-gray-300' />
			</DockIcon>
		</Dock>
	),
};

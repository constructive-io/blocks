import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Progress } from '../components/progress';

const meta: Meta<typeof Progress> = {
	title: 'UI/Progress',
	component: Progress,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		value: {
			control: { type: 'range', min: 0, max: 100, step: 1 },
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		value: 60,
	},
};

export const Empty: Story = {
	args: {
		value: 0,
	},
};

export const Complete: Story = {
	args: {
		value: 100,
	},
};

export const DifferentValues: Story = {
	render: () => (
		<div className='w-full max-w-md space-y-4'>
			<div>
				<div className='mb-1 flex justify-between text-sm'>
					<span>Low</span>
					<span>25%</span>
				</div>
				<Progress value={25} />
			</div>
			<div>
				<div className='mb-1 flex justify-between text-sm'>
					<span>Medium</span>
					<span>50%</span>
				</div>
				<Progress value={50} />
			</div>
			<div>
				<div className='mb-1 flex justify-between text-sm'>
					<span>High</span>
					<span>75%</span>
				</div>
				<Progress value={75} />
			</div>
			<div>
				<div className='mb-1 flex justify-between text-sm'>
					<span>Complete</span>
					<span>100%</span>
				</div>
				<Progress value={100} />
			</div>
		</div>
	),
};

export const Animated: Story = {
	render: () => {
		const [progress, setProgress] = useState(0);

		useEffect(() => {
			const timer = setTimeout(() => setProgress(66), 500);
			return () => clearTimeout(timer);
		}, []);

		return (
			<div className='w-full max-w-md'>
				<div className='mb-1 flex justify-between text-sm'>
					<span>Loading...</span>
					<span>{progress}%</span>
				</div>
				<Progress value={progress} className='transition-all duration-500' />
			</div>
		);
	},
};

export const FileUpload: Story = {
	render: () => (
		<div className='w-full max-w-md space-y-4'>
			<div className='space-y-2'>
				<div className='flex justify-between text-sm'>
					<span>document.pdf</span>
					<span>2.4 MB / 3.1 MB</span>
				</div>
				<Progress value={77} />
				<div className='text-muted-foreground text-xs'>Uploading... 2 minutes remaining</div>
			</div>
		</div>
	),
};

export const Skills: Story = {
	render: () => (
		<div className='w-full max-w-md space-y-4'>
			<h3 className='text-lg font-medium'>Skills</h3>
			<div className='space-y-3'>
				<div>
					<div className='mb-1 flex justify-between text-sm'>
						<span>React</span>
						<span>90%</span>
					</div>
					<Progress value={90} />
				</div>
				<div>
					<div className='mb-1 flex justify-between text-sm'>
						<span>TypeScript</span>
						<span>85%</span>
					</div>
					<Progress value={85} />
				</div>
				<div>
					<div className='mb-1 flex justify-between text-sm'>
						<span>Node.js</span>
						<span>75%</span>
					</div>
					<Progress value={75} />
				</div>
				<div>
					<div className='mb-1 flex justify-between text-sm'>
						<span>Python</span>
						<span>60%</span>
					</div>
					<Progress value={60} />
				</div>
			</div>
		</div>
	),
};

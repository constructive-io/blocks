import type { Meta, StoryObj } from '@storybook/react-vite';

import { FlickeringGrid } from '../components/flickering-grid';

const meta: Meta<typeof FlickeringGrid> = {
	title: 'UI/FlickeringGrid',
	component: FlickeringGrid,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className='relative h-64 w-[480px] overflow-hidden rounded-md border'>
			<FlickeringGrid
				className='absolute inset-0'
				squareSize={4}
				gridGap={6}
				maxOpacity={0.35}
				style={{ color: 'var(--muted-foreground)' }}
			/>
		</div>
	),
};

export const AsBackdrop: Story = {
	render: () => (
		<div className='relative h-64 w-[480px] overflow-hidden rounded-md border bg-background'>
			<FlickeringGrid
				className='absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]'
				squareSize={5}
				gridGap={8}
				maxOpacity={0.3}
				style={{ color: 'var(--muted-foreground)' }}
			/>
			<div className='absolute inset-0 flex items-center justify-center'>
				<p className='rounded-md bg-card/80 px-4 py-2 text-sm shadow-card'>Ambient hero backdrop</p>
			</div>
		</div>
	),
};

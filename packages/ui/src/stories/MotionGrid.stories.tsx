import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionGrid } from '../components/motion-grid';

const meta: Meta<typeof MotionGrid> = {
	title: 'UI/MotionGrid',
	component: MotionGrid,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <MotionGrid gridSize={[10, 6]} duration={160} className='gap-1' />,
};

export const Dense: Story = {
	render: () => <MotionGrid gridSize={[16, 10]} duration={120} className='gap-0.5' />,
};

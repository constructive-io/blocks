import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProgressiveBlurScrollContainer } from '../components/progressive-blur-scroll-container';

const meta: Meta<typeof ProgressiveBlurScrollContainer> = {
	title: 'UI/ProgressiveBlurScrollContainer',
	component: ProgressiveBlurScrollContainer,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const EVENTS = Array.from({ length: 30 }, (_, i) => ({
	id: `evt_${String(i + 1).padStart(4, '0')}`,
	time: `${i + 1}m ago`,
}));

export const Default: Story = {
	render: () => (
		<ProgressiveBlurScrollContainer
			className='h-64 w-[420px] rounded-md border'
			scrollClassName='h-full overflow-y-auto p-3'
			itemCount={EVENTS.length}
		>
			{EVENTS.map((event) => (
				<div key={event.id} className='flex items-center justify-between border-b py-2 text-sm last:border-0'>
					<span className='font-mono text-xs'>{event.id}</span>
					<span className='text-xs text-muted-foreground'>{event.time}</span>
				</div>
			))}
		</ProgressiveBlurScrollContainer>
	),
};

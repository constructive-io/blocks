import type { Meta, StoryObj } from '@storybook/react-vite';

import { ResponsiveDiagram } from '../components/responsive-diagram';

const meta: Meta<typeof ResponsiveDiagram> = {
	title: 'UI/ResponsiveDiagram',
	component: ResponsiveDiagram,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const Node = ({ label, wide }: { label: string; wide?: boolean }) => (
	<div
		className={`flex h-16 shrink-0 items-center justify-center rounded-md border bg-card text-sm ${wide ? 'w-40' : 'w-28'}`}
	>
		{label}
	</div>
);

export const Default: Story = {
	render: () => (
		<div className='w-[480px]'>
			<ResponsiveDiagram className='rounded-md border bg-muted/30 p-4'>
				<div className='flex items-center gap-8'>
					<div className='flex flex-col gap-3'>
						<Node label='users' />
						<Node label='orders' />
						<Node label='products' />
					</div>
					<div className='flex flex-col gap-3'>
						<Node label='order_items' wide />
						<Node label='inventory' />
					</div>
					<Node label='audit_log' wide />
				</div>
			</ResponsiveDiagram>
			<p className='mt-2 text-xs text-muted-foreground'>
				Resize the canvas — the diagram scales down to fit instead of clipping.
			</p>
		</div>
	),
};

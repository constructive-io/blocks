import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '../components/resizable';

const meta: Meta<typeof ResizablePanelGroup> = {
	title: 'UI/Resizable',
	component: ResizablePanelGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
	render: () => (
		<ResizablePanelGroup direction='horizontal' className='h-48 w-[560px] rounded-md border'>
			<ResizablePanel defaultSize={30} className='flex items-center justify-center text-sm text-muted-foreground'>
				Schema
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={70} className='flex items-center justify-center text-sm text-muted-foreground'>
				Rows
			</ResizablePanel>
		</ResizablePanelGroup>
	),
};

export const Vertical: Story = {
	render: () => (
		<ResizablePanelGroup direction='vertical' className='h-72 w-[560px] rounded-md border'>
			<ResizablePanel defaultSize={60} className='flex items-center justify-center text-sm text-muted-foreground'>
				Editor
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={40} className='flex items-center justify-center text-sm text-muted-foreground'>
				Console output
			</ResizablePanel>
		</ResizablePanelGroup>
	),
};

export const ThreePane: Story = {
	render: () => (
		<ResizablePanelGroup direction='horizontal' className='h-48 w-[640px] rounded-md border'>
			<ResizablePanel defaultSize={25} className='flex items-center justify-center text-sm text-muted-foreground'>
				Nav
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={50} className='flex items-center justify-center text-sm text-muted-foreground'>
				Content
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={25} className='flex items-center justify-center text-sm text-muted-foreground'>
				Inspector
			</ResizablePanel>
		</ResizablePanelGroup>
	),
};

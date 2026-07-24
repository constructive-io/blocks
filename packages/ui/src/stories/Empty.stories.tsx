import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatabaseIcon } from 'lucide-react';

import { Button } from '../components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';

const meta: Meta<typeof Empty> = {
	title: 'UI/Empty',
	component: Empty,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Empty className='min-h-72 w-[420px] border'>
			<EmptyHeader>
				<EmptyMedia variant='icon'>
					<DatabaseIcon />
				</EmptyMedia>
				<EmptyTitle>No records yet</EmptyTitle>
				<EmptyDescription>Create the first record to start exploring this table.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button>Create record</Button>
			</EmptyContent>
		</Empty>
	),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '../components/button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '../components/button-group';

const meta: Meta<typeof ButtonGroup> = {
	title: 'UI/ButtonGroup',
	component: ButtonGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant='outline'>Prev</Button>
			<Button variant='outline'>Next</Button>
		</ButtonGroup>
	),
};

export const WithIcon: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant='outline'>Deploy</Button>
			<ButtonGroupSeparator />
			<Button variant='outline' size='icon' aria-label='More deploy options'>
				<ChevronDown />
			</Button>
		</ButtonGroup>
	),
};

export const Vertical: Story = {
	render: () => (
		<ButtonGroup orientation='vertical'>
			<Button variant='outline' size='icon' aria-label='Previous'>
				<ChevronLeft />
			</Button>
			<Button variant='outline' size='icon' aria-label='Next'>
				<ChevronRight />
			</Button>
		</ButtonGroup>
	),
};

export const WithText: Story = {
	render: () => (
		<ButtonGroup>
			<ButtonGroupText>Rows per page</ButtonGroupText>
			<Button variant='outline'>25</Button>
			<Button variant='outline'>50</Button>
			<Button variant='outline'>100</Button>
		</ButtonGroup>
	),
};

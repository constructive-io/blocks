import type { Meta, StoryObj } from '@storybook/react-vite';
import { Command } from 'lucide-react';

import { Kbd, KbdGroup } from '../components/kbd';

const meta: Meta<typeof Kbd> = {
	title: 'UI/Kbd',
	component: Kbd,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <Kbd>⌘K</Kbd>,
};

export const Group: Story = {
	render: () => (
		<KbdGroup>
			<Kbd>
				<Command />
			</Kbd>
			<Kbd>⇧</Kbd>
			<Kbd>L</Kbd>
		</KbdGroup>
	),
};

export const Inline: Story = {
	render: () => (
		<p className='text-sm text-muted-foreground'>
			Press <Kbd>/</Kbd> to search, or <Kbd>Esc</Kbd> to close.
		</p>
	),
};

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

const SURFACES = [
	{ label: 'Background', className: 'bg-background text-muted-foreground' },
	{ label: 'Card', className: 'bg-card text-foreground shadow-card' },
	{ label: 'Muted', className: 'bg-muted text-muted-foreground' },
	{ label: 'Accent tint', className: 'bg-primary/10 text-foreground' },
	{ label: 'Warning tint', className: 'bg-warning/15 text-foreground' },
	{ label: 'Destructive tint', className: 'bg-destructive/12 text-foreground' },
	{ label: 'Primary', className: 'bg-primary text-primary-foreground' },
	{ label: 'Inverted', className: 'bg-foreground text-background' },
];

/** The keycap derives its fill and edge from the inherited text color, so it separates on every surface. */
export const OnAnySurface: Story = {
	render: () => (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{SURFACES.map((surface) => (
				<div key={surface.label} className={`flex flex-col gap-2 rounded-lg p-3 text-sm ${surface.className}`}>
					<span className="text-xs opacity-80">{surface.label}</span>
					<span>
						<KbdGroup>
							<Kbd>⌘</Kbd>
							<Kbd>K</Kbd>
						</KbdGroup>{' '}
						search · <Kbd>Esc</Kbd>
					</span>
				</div>
			))}
		</div>
	),
};

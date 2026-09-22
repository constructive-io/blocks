import type { Meta, StoryObj } from '@storybook/react-vite';

import { Toaster } from '../components/sonner';
import { ThemeDials } from './theme-dials';
import { ActionsSection } from './kitchen-sink/section-actions';
import { DataSection } from './kitchen-sink/section-data';
import { EffectsSection } from './kitchen-sink/section-effects';
import { FeedbackSection } from './kitchen-sink/section-feedback';
import { FormsSection } from './kitchen-sink/section-forms';
import { NavigationSection } from './kitchen-sink/section-navigation';
import { OverlaysSection } from './kitchen-sink/section-overlays';

const meta: Meta = {
	title: 'Kitchen Sink',
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Single source of truth — nav anchors and rendered sections stay in sync. */
const SECTIONS = [
	{ id: 'actions', label: 'Actions', Component: ActionsSection },
	{ id: 'forms', label: 'Forms', Component: FormsSection },
	{ id: 'data', label: 'Data display', Component: DataSection },
	{ id: 'feedback', label: 'Feedback', Component: FeedbackSection },
	{ id: 'overlays', label: 'Overlays', Component: OverlaysSection },
	{ id: 'navigation', label: 'Navigation', Component: NavigationSection },
	{ id: 'effects', label: 'Effects', Component: EffectsSection },
];

function KitchenSinkPage() {
	return (
		<div className='min-h-screen bg-background text-foreground'>
			<ThemeDials />
			<Toaster />
			<header className='mx-auto max-w-6xl px-6 pb-8 pt-10 sm:px-10'>
				<p className='font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground'>
					@constructive-io/ui
				</p>
				<h1 className='mt-2 text-3xl font-semibold tracking-tight'>Kitchen sink</h1>
				<p className='mt-2 max-w-xl text-pretty text-sm leading-6 text-muted-foreground'>
					Every primitive in one place. Open the dial panel (bottom-right) to tune theme tokens,
					shape, shadows, and motion live — values write CSS variable overrides, so the whole page
					and every popup responds at once.
				</p>
			</header>
			<nav className='sticky top-0 z-10 border-y border-border/60 bg-background/80 backdrop-blur-sm'>
				<div className='mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 py-2 sm:px-10'>
					{SECTIONS.map(({ id, label }) => (
						<a
							key={id}
							href={`#${id}`}
							className='rounded-md px-2.5 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
						>
							{label}
						</a>
					))}
				</div>
			</nav>
			<main className='mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10 sm:px-10'>
				{SECTIONS.map(({ id, Component }) => (
					<Component key={id} />
				))}
			</main>
		</div>
	);
}

export const AllPrimitives: Story = {
	render: () => <KitchenSinkPage />,
};

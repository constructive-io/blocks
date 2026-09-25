import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid2x2, Inbox, LayoutDashboard, Rows3, Settings2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../components/button';
import {
	FilterGroup,
	NavCount,
	NavIcon,
	NavRow,
	NavSection,
	Segmented,
	SidebarFrame,
	ToneBadge,
	ViewFrame,
	WorkspaceShell,
} from '../components/workspace-kit';

const meta: Meta<typeof WorkspaceShell> = {
	title: 'Workspace Kit/Shell',
	component: WorkspaceShell,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'The shell behind Agents Builder, Billing Account, and Billing Console: a 224px sidebar that collapses to a 52px rail, a drawer below the `3xl` container width, 48px view headers over scrolling view frames, and the filter pills and segmented controls those views use.',
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof WorkspaceShell>;

type View = 'home' | 'inbox' | 'settings';

function Demo({ collapsed = false }: { collapsed?: boolean }) {
	const [view, setView] = useState<View>('home');
	const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
	const [layout, setLayout] = useState<'cards' | 'table'>('cards');
	const title = { home: 'Home', inbox: 'Inbox', settings: 'Settings' }[view];
	const icon = { home: LayoutDashboard, inbox: Inbox, settings: Settings2 }[view];
	return (
		<div className="h-[calc(100vh-2rem)] min-h-[560px] p-4">
			<div className="h-full overflow-hidden rounded-xl border border-border shadow-sm">
				<WorkspaceShell
					defaultSidebarCollapsed={collapsed}
					sidebar={({ mode, collapsed: isCollapsed, onCollapsedChange, onNavigate }) => {
						const rail = mode === 'rail' && isCollapsed;
						const row = (id: View, label: string, glyph: typeof Inbox, trailing?: React.ReactNode) => (
							<NavRow
								key={id}
								label={label}
								collapsed={rail}
								active={view === id}
								leading={<NavIcon icon={glyph} active={view === id} />}
								trailing={trailing}
								onClick={() => {
									setView(id);
									onNavigate();
								}}
							/>
						);
						return (
							<SidebarFrame
								label="Demo"
								menu={<span className="truncate px-1.5 text-sm font-medium">{rail ? 'W' : 'Workspace'}</span>}
								collapsed={isCollapsed}
								onCollapsedChange={onCollapsedChange}
								drawer={mode === 'drawer'}
								onClose={onNavigate}
								footer={rail ? null : <p className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">Pinned footer</p>}
							>
								<nav aria-label="Demo views" className="flex w-full flex-col gap-3">
									<NavSection collapsed={rail}>
										{row('home', 'Home', LayoutDashboard)}
										{row('inbox', 'Inbox', Inbox, <NavCount value={3} tone="warning" />)}
									</NavSection>
									<NavSection title="Workspace" collapsed={rail}>
										{row('settings', 'Settings', Settings2)}
									</NavSection>
								</nav>
							</SidebarFrame>
						);
					}}
				>
					<ViewFrame icon={icon} title={title} actions={<Button size="xs" variant="outline">Action</Button>}>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<FilterGroup
								label="Filter"
								value={filter}
								onChange={setFilter}
								options={[
									{ value: 'all', label: 'All', count: 12 },
									{ value: 'open', label: 'Open', count: 3 },
									{ value: 'done', label: 'Done', count: 9 },
								]}
							/>
							<Segmented
								label="Layout"
								value={layout}
								onChange={setLayout}
								options={[
									{ value: 'cards', label: 'Cards', icon: Grid2x2 },
									{ value: 'table', label: 'Table', icon: Rows3 },
								]}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							{(['neutral', 'primary', 'success', 'warning', 'danger', 'info', 'violet', 'amber'] as const).map((tone) => (
								<ToneBadge key={tone} tone={tone}>
									{tone}
								</ToneBadge>
							))}
						</div>
						<p className="text-sm text-muted-foreground">Resize the canvas below 48rem to see the drawer; the header shows a menu button there.</p>
					</ViewFrame>
				</WorkspaceShell>
			</div>
		</div>
	);
}

export const Expanded: Story = { render: () => <Demo /> };
export const CollapsedRail: Story = { render: () => <Demo collapsed /> };
export const Narrow: Story = {
	render: () => (
		<div className="mx-auto w-[390px]">
			<Demo />
		</div>
	),
};

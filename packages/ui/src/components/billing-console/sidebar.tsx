'use client';

import { Asterisk, BookOpen, LayoutDashboard, LogOut, Package, PlugZap, Settings2, ShieldAlert, Users } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { ProviderMark } from '../billing-kit/provider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../dropdown-menu';
import { AppearanceRow, monogram, SwitcherTrigger } from '../workspace-kit/menu';
import { NavCount, NavIcon, NavRow, NavSection, SidebarFrame } from '../workspace-kit/nav';
import { ToneBadge } from '../workspace-kit/primitives';
import { useBillingConsole } from './billing-console-context';
import type { BillingConsoleView } from './types';

const ITEM_CLASS = 'gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground';

function WorkspaceMenu({ collapsed }: { collapsed: boolean }) {
	const { data, emit, theme, setTheme } = useBillingConsole();
	const platform = data.scope === 'platform';
	return (
		<DropdownMenu>
			<SwitcherTrigger
				label={`Billing console for ${data.workspace.name}`}
				name={data.workspace.name}
				glyph={platform ? <Asterisk aria-hidden="true" className="size-3.5" strokeWidth={2.5} /> : monogram(data.workspace.name)}
				collapsed={collapsed}
			/>
			<DropdownMenuContent align="start" className="w-64">
				<div className="flex items-center gap-2 px-2 pt-1 pb-2">
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-medium">{data.workspace.name}</span>
						{data.workspace.databaseName ? <span className="block truncate font-mono text-[11px] text-muted-foreground">{data.workspace.databaseName}</span> : null}
					</span>
					<ToneBadge tone={platform ? 'primary' : 'violet'}>{platform ? 'Platform' : 'Tenant'}</ToneBadge>
				</div>
				<DropdownMenuSeparator />
				<AppearanceRow value={theme} onChange={setTheme} />
				<DropdownMenuSeparator />
				<DropdownMenuItem className={ITEM_CLASS} onClick={() => emit({ type: 'workspace-menu', item: 'settings' })}>
					<Settings2 aria-hidden="true" />
					Database settings
				</DropdownMenuItem>
				<DropdownMenuItem className={ITEM_CLASS} onClick={() => emit({ type: 'workspace-menu', item: 'docs' })}>
					<BookOpen aria-hidden="true" />
					Billing docs
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem className={ITEM_CLASS} onClick={() => emit({ type: 'workspace-menu', item: 'log-out' })}>
					<LogOut aria-hidden="true" />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type BillingConsoleSidebarProps = {
	collapsed?: boolean;
	onCollapsedChange?: (collapsed: boolean) => void;
	drawer?: boolean;
	onNavigate?: () => void;
	className?: string;
};

/**
 * Operator navigation: overview, catalog, customers, provider, and (platform
 * only) standing, with counts for what needs attention and a footer that
 * says whether billing is live.
 */
export function BillingConsoleSidebar({ collapsed = false, onCollapsedChange, drawer = false, onNavigate, className }: BillingConsoleSidebarProps) {
	const { data, connection, view, views, setView, provider, settings, health, standing } = useBillingConsole();
	const railCollapsed = !drawer && collapsed;
	const attention = data.customers.filter((customer) => ['grace', 'suspended', 'review_required'].includes(customer.lifecycle)).length;
	const suspended = standing.filter((database) => database.suspendedReason).length;
	const failing = health.checks.filter((check) => check.status === 'fail').length;
	const passed = health.checks.filter((check) => check.status === 'pass').length;

	const go = (next: BillingConsoleView) => () => {
		setView(next);
		onNavigate?.();
	};
	const row = (id: BillingConsoleView, label: string, icon: typeof Users, trailing?: React.ReactNode, extra?: string) =>
		views.includes(id) ? (
		<NavRow
			key={id}
			label={extra ? `${label}, ${extra}` : label}
			labelNode={
				<>
					{label}
					{extra ? <span className="sr-only">, {extra}</span> : null}
				</>
			}
			collapsed={railCollapsed}
			active={view === id}
			leading={<NavIcon icon={icon} active={view === id} />}
			trailing={trailing}
			onClick={go(id)}
		/>
		) : null;

	return (
		<SidebarFrame
			label="Billing console"
			menu={<WorkspaceMenu collapsed={railCollapsed} />}
			collapsed={collapsed}
			onCollapsedChange={onCollapsedChange}
			drawer={drawer}
			onClose={onNavigate}
			className={className}
			footer={
				railCollapsed ? null : (
					<section
						aria-label="Billing status"
						className={cn(
							'shrink-0 border-t border-sidebar-border p-3',
							settings.enableBilling
								? 'bg-[linear-gradient(to_top,color-mix(in_oklab,var(--success)_8%,transparent),transparent)]'
								: 'bg-[linear-gradient(to_top,color-mix(in_oklab,var(--warning)_9%,transparent),transparent)]',
						)}
					>
						<div className="flex items-center gap-2">
							{provider ? <ProviderMark provider={provider} size="sm" /> : null}
							<p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{settings.enableBilling ? 'Billing is live' : 'Billing is off'}</p>
							{connection ? <span className="text-xs text-muted-foreground">{connection.mode === 'live' ? 'Live' : 'Test'}</span> : null}
						</div>
						<div aria-hidden="true" className="mt-3 flex h-1 gap-px overflow-hidden rounded-full bg-foreground/[0.07]">
							{health.checks.map((check) => (
								<span key={check.id} className={cn('flex-1', check.status === 'pass' ? 'bg-success/70' : check.status === 'fail' ? 'bg-destructive/70' : 'bg-foreground/15')} />
							))}
						</div>
						<p className="mt-2 text-xs text-muted-foreground tabular-nums">
							{passed} of {health.checks.length} readiness checks pass
						</p>
					</section>
				)
			}
		>
			<nav aria-label="Console views" className="flex w-full flex-col gap-3">
				<NavSection collapsed={railCollapsed}>
					{row('overview', 'Overview', LayoutDashboard)}
					{row('catalog', 'Catalog', Package)}
					{row('customers', 'Customers', Users, attention > 0 ? <NavCount value={attention} tone="warning" /> : <NavCount value={data.customers.length} />, attention > 0 ? `${attention} need attention` : undefined)}
				</NavSection>
				<hr className="border-sidebar-border" />
				<NavSection title="Operations" collapsed={railCollapsed}>
					{row('provider', 'Provider', PlugZap, failing > 0 ? <NavCount value={failing} tone="danger" /> : null, failing > 0 ? `${failing} checks failing` : undefined)}
					{row('standing', 'Standing', ShieldAlert, suspended > 0 ? <NavCount value={suspended} tone="danger" /> : null, suspended > 0 ? `${suspended} suspended` : undefined)}
				</NavSection>
			</nav>
		</SidebarFrame>
	);
}

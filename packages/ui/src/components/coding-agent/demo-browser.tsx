'use client';

import { ShieldCheck } from 'lucide-react';

import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import type { BrowserPageRenderer } from './types';

/** Addresses an empty browser tab offers while the bundled demo preview stands in for the host's renderer. */
export const DEMO_QUICK_LINKS = ['localhost:3000/login', 'localhost:3000/dashboard'];

/** The demo app runs on a local dev server, so any local address is one of its pages. */
function isDemoUrl(url: string) {
	try {
		const { hostname } = new URL(url);
		return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
	} catch {
		return false;
	}
}

/** The bundled preview of the demo app: its sign-in page and a dashboard, drawn with the kit's own controls. */
function DemoSite({ url }: { url: string }) {
	const parsed = new URL(url);
	const next = parsed.searchParams.get('next');
	if (parsed.pathname.startsWith('/login')) {
		return (
			<div className="grid min-h-full place-items-center bg-muted/40 p-6">
				<div className="w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-card">
					<div className="mb-4 flex items-center gap-2">
						<span className="grid size-6 place-items-center rounded-md bg-foreground text-[0.6875rem] font-semibold text-background">A</span>
						<span className="text-sm font-medium text-foreground">Sign in to Acme</span>
					</div>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="demo-email" className="text-xs">Email</Label>
							<Input id="demo-email" size="sm" defaultValue="dana@acme.dev" readOnly />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="demo-password" className="text-xs">Password</Label>
							<Input id="demo-password" size="sm" type="password" defaultValue="hunter22" readOnly />
						</div>
						<Button size="sm" className="mt-1 w-full">Continue</Button>
					</div>
					{next ? (
						<p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
							<ShieldCheck aria-hidden="true" className="mt-px size-3.5 shrink-0 text-success" />
							<span>
								<code className="font-mono text-foreground [overflow-wrap:anywhere]">next={next}</code> is off-site, so you’ll land on{' '}
								<code className="font-mono text-foreground">/dashboard</code>.
							</span>
						</p>
					) : null}
				</div>
			</div>
		);
	}
	if (parsed.pathname.startsWith('/settings/team')) {
		return (
			<div className="flex min-h-full flex-col gap-5 bg-background p-6">
				<div className="flex items-center justify-between gap-3">
					<span className="text-sm font-medium text-foreground">Team</span>
					<div className="flex items-center gap-1.5">
						<Input size="sm" aria-label="Email to invite" placeholder="name@company.com" className="w-48" readOnly />
						<Button size="sm">Invite</Button>
					</div>
				</div>
				<ul className="flex flex-col text-[0.8125rem]">
					{[
						['dana@acme.dev', 'Owner'],
						['sam@acme.dev', 'Admin'],
						['jo@acme.dev', 'Member']
					].map(([email, role]) => (
						<li key={email} className="flex h-9 items-center justify-between border-b border-border last:border-b-0">
							<span className="text-foreground">{email}</span>
							<span className="text-muted-foreground">{role}</span>
						</li>
					))}
				</ul>
				<div className="flex flex-col gap-2">
					<span className="text-xs font-medium text-muted-foreground">Pending invites</span>
					<ul className="flex flex-col text-[0.8125rem]">
						{[
							['priya@acme.dev', 'Expires Oct 30'],
							['lee@contractor.io', 'Expires Oct 28']
						].map(([email, expiry]) => (
							<li key={email} className="flex h-9 items-center justify-between gap-3">
								<span className="min-w-0 truncate text-foreground">{email}</span>
								<span className="flex shrink-0 items-center gap-3">
									<span className="text-xs text-muted-foreground">{expiry}</span>
									<Button size="xs" variant="ghost" className="text-destructive">
										Revoke
									</Button>
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		);
	}
	return (
		<div className="flex min-h-full flex-col gap-4 bg-background p-6">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-foreground">Dashboard</span>
				<span className="text-xs text-muted-foreground">dana@acme.dev</span>
			</div>
			<div className="grid grid-cols-3 gap-3">
				{[
					['Orders', '1,284'],
					['Revenue', '$48,210'],
					['Refunds', '12']
				].map(([label, value]) => (
					<div key={label} className="rounded-lg border border-border bg-card p-3">
						<p className="text-xs text-muted-foreground">{label}</p>
						<p className="mt-1 text-lg font-medium text-foreground tabular-nums">{value}</p>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * The browser panel's renderer when the host passes none: local addresses draw the bundled demo app, and anything
 * else shows the panel's "can't preview" note.
 */
export const renderDemoPage: BrowserPageRenderer = (url) => (isDemoUrl(url) ? <DemoSite url={url} /> : null);

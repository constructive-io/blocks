'use client';

import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from '../dialog';
import { Spinner } from '../spinner';
import { Switch } from '../switch';
import { IntegrationMark } from './integration-mark';
import { focusRingClass } from './primitives';
import type { Integration } from './types';
import { startViewTransition, ViewAnimation } from './view-transition';

type Phase = 'sign-in' | 'authorizing' | 'tools' | 'connecting';

type ConnectIntegrationDialogProps = {
	integration: Integration | undefined;
	appName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/**
	 * Runs the real OAuth handoff. Resolve when the provider redirects back;
	 * the dialog then asks which tools agents may use.
	 */
	onAuthorize?: (integration: Integration) => Promise<void>;
	/** Persists the connection with the tools the person left enabled. */
	onConnect: (integration: Integration, toolIds: string[]) => void | Promise<void>;
};

function StepMarker({ index, state }: { index: number; state: 'active' | 'done' | 'upcoming' }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'grid size-6 shrink-0 place-items-center rounded-full border text-xs tabular-nums',
				state === 'active' && 'border-primary text-foreground',
				state === 'done' && 'border-transparent bg-muted text-foreground',
				state === 'upcoming' && 'border-border text-muted-foreground',
			)}
		>
			{state === 'done' ? <Check className="size-3.5" /> : index}
		</span>
	);
}

const simulateAuthorize = () => new Promise<void>((resolve) => window.setTimeout(resolve, 1400));

type ConnectFlowProps = Omit<ConnectIntegrationDialogProps, 'integration' | 'open' | 'onOpenChange'> & {
	integration: Integration;
	onDone: () => void;
};

/** Dialog body. Keyed per integration and unmounted on close, so every visit starts at sign-in. */
function ConnectFlow({ integration, appName, onAuthorize = simulateAuthorize, onConnect, onDone }: ConnectFlowProps) {
	const [phase, setPhase] = React.useState<Phase>('sign-in');
	const [enabled, setEnabled] = React.useState<ReadonlySet<string>>(() => new Set(integration.tools.map((tool) => tool.id)));

	const authorize = async () => {
		setPhase('authorizing');
		try {
			await onAuthorize(integration);
			startViewTransition(() => setPhase('tools'));
		} catch {
			setPhase('sign-in');
		}
	};

	const connect = async () => {
		setPhase('connecting');
		try {
			await onConnect(integration, [...enabled]);
			onDone();
		} catch {
			setPhase('tools');
		}
	};

	const toggleTool = (toolId: string, checked: boolean) =>
		setEnabled((current) => {
			const next = new Set(current);
			if (checked) next.add(toolId);
			else next.delete(toolId);
			return next;
		});

	const signedIn = phase === 'tools' || phase === 'connecting';
	const toolCount = integration.tools.length;

	return (
		<div className="flex flex-col gap-5 p-5">
			<div className="flex flex-col gap-3">
				<IntegrationMark integration={integration} size="md" />
				<div className="flex flex-col gap-1">
					<DialogTitle className="text-base font-medium">Connect {integration.name}</DialogTitle>
					<DialogDescription className="text-[13px]">
						Your agents get <span className="tabular-nums">{toolCount}</span> new {toolCount === 1 ? 'tool' : 'tools'} once
						this is connected
					</DialogDescription>
				</div>
			</div>

			<ol className="flex flex-col">
				<li className="flex gap-3">
					<div className="flex flex-col items-center">
						<StepMarker index={1} state={signedIn ? 'done' : 'active'} />
						<span aria-hidden="true" className="my-1 w-px flex-1 border-l border-dashed border-border" />
					</div>
					<div className="min-w-0 flex-1 pb-5">
						<p className={cn('flex h-6 items-center text-sm', signedIn ? 'text-muted-foreground' : 'font-medium text-foreground')}>
							Sign in
						</p>
						{phase === 'sign-in' ? (
							<div className="mt-2 flex flex-col gap-3">
								<p className="text-[13px] text-muted-foreground">
									Authorization happens on {integration.vendor}&apos;s side. Takes about a minute
								</p>
								<ul className="divide-y divide-border overflow-hidden rounded-lg border border-border text-[13px] text-foreground">
									<li className="flex min-h-10 flex-wrap items-center gap-1 px-3 py-2">
										A new tab opens at
										<span className="inline-flex h-5 items-center rounded-[5px] border border-border bg-muted px-1 font-mono text-xs">
											{integration.authDomain}
										</span>
									</li>
									<li className="flex min-h-10 items-center px-3 py-2">
										You approve there. {integration.vendor} asks whether {appName} can read your account
									</li>
									<li className="flex min-h-10 items-center px-3 py-2">
										You come back here. Then you choose which tools agents can use
									</li>
								</ul>
								<Button size="sm" className="self-start" onClick={authorize}>
									Sign in to {integration.name}
								</Button>
							</div>
						) : null}
						{phase === 'authorizing' ? (
							<div className="mt-2 flex flex-col gap-2">
								<p role="status" className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-[13px] text-foreground">
									<Spinner aria-hidden="true" role={undefined} className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
									Authorizing
								</p>
								<p className="text-[13px] text-muted-foreground">
									Window not showing up?{' '}
									<button
										type="button"
										onClick={authorize}
										className={cn('cursor-pointer rounded-sm text-link hover:underline', focusRingClass)}
									>
										Reopen it
									</button>
								</p>
							</div>
						) : null}
					</div>
				</li>
				<li className="flex gap-3">
					<StepMarker index={2} state={signedIn ? 'active' : 'upcoming'} />
					<div className="min-w-0 flex-1">
						<p className={cn('flex h-6 items-center text-sm', signedIn ? 'font-medium text-foreground' : 'text-muted-foreground')}>
							Tools
						</p>
						{signedIn ? (
							<div className="mt-2 flex flex-col gap-3">
								<ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
									{integration.tools.map((tool) => {
										const id = `connect-${integration.id}-${tool.id}`;
										return (
											<li key={tool.id} className="flex h-11 items-center gap-2 pr-1 pl-3">
												<label htmlFor={id} className="min-w-0 flex-1 truncate text-[13px] text-foreground">
													{tool.name}
												</label>
												<span
													className={cn(
														'inline-flex h-5 items-center rounded-[5px] border px-1.5 text-xs',
														tool.access === 'write'
															? 'border-primary/30 bg-primary/6 text-link'
															: 'border-border text-muted-foreground',
													)}
												>
													{tool.access === 'write' ? 'Write' : 'Read'}
												</span>
												<Switch
													id={id}
													checked={enabled.has(tool.id)}
													disabled={phase === 'connecting'}
													onCheckedChange={(checked) => toggleTool(tool.id, checked)}
												/>
											</li>
										);
									})}
								</ul>
								<div className="flex items-center gap-2">
									<Button size="sm" disabled={phase === 'connecting' || enabled.size === 0} onClick={connect}>
										Connect {integration.name}
									</Button>
									<Button size="sm" variant="outline" disabled={phase === 'connecting'} onClick={onDone}>
										Cancel
									</Button>
								</div>
							</div>
						) : null}
					</div>
				</li>
			</ol>
		</div>
	);
}

/**
 * Two-step connect flow: hand off to the provider's consent screen, then pick
 * which of the app's tools agents may call. The host performs both calls.
 */
function ConnectIntegrationDialog({ integration, open, onOpenChange, ...flow }: ConnectIntegrationDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{integration ? (
				<DialogPopup className="max-w-md">
					<ViewAnimation>
						<div>
							<ConnectFlow key={integration.id} integration={integration} onDone={() => onOpenChange(false)} {...flow} />
						</div>
					</ViewAnimation>
				</DialogPopup>
			) : null}
		</Dialog>
	);
}

export { ConnectIntegrationDialog };
export type { ConnectIntegrationDialogProps };

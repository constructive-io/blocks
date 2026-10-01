'use client';

import { Eye, Sparkles } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { focusRingClass, NavMenuButton, pressClass, scrollRowClass, ToneBadge, TooltipIconButton, useInert } from '../workspace-kit/primitives';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';
import { needsAgreement } from './access';
import { AgreementGate } from './agreement-gate';
import { useDataRooms } from './data-rooms-context';
import { daysUntil } from './format';
import { DocumentsTab } from './documents-tab';
import { InsightsTab } from './insights-tab';
import { PeopleTab } from './people-tab';
import { PreviewAsMenu } from './preview-as-menu';
import { QuestionsTab } from './questions-tab';
import { RoomAssistant } from './room-assistant';
import { SettingsTab } from './settings-tab';
import type { Room, RoomTab } from './types';

const TABS: { value: RoomTab; label: string }[] = [
	{ value: 'documents', label: 'Documents' },
	{ value: 'people', label: 'People' },
	{ value: 'questions', label: 'Q&A' },
	{ value: 'insights', label: 'Insights' },
	{ value: 'settings', label: 'Settings' },
];

/** Deadlines closer than this get a warning dot beside the room name. */
const DEADLINE_SOON_DAYS = 7;

/** The tabs the acting person can open in a room. */
function useRoomTabs(room: Room) {
	const { can } = useDataRooms();
	const target = { kind: 'room', roomId: room.id } as const;
	const manages = can('manage_room', target);
	const people = can('invite', target) || can('manage_members', target);
	return TABS.filter((tab) => {
		if (tab.value === 'people') return people;
		if (tab.value === 'insights' || tab.value === 'settings') return manages;
		return true;
	});
}

/** A quiet dot beside the room name while its deadline is near; the date lives in the tooltip. */
function DeadlineDot({ room }: { room: Room }) {
	const { data, format } = useDataRooms();
	if (!room.closesAt) return null;
	const days = daysUntil(room.closesAt, data.clock);
	if (days < 0 || days > DEADLINE_SOON_DAYS) return null;
	const label = `Closes ${format.deadline(room.closesAt)}`;
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span tabIndex={0} className={cn('grid size-4 shrink-0 cursor-default place-items-center rounded-full', focusRingClass)}>
						<span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
						<span className="sr-only">{label}</span>
					</span>
				}
			/>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * One room. A single header row carries the room name, its sections, and two
 * quiet tools (preview as someone, ask the assistant); each section owns its
 * own primary action. People who still have to accept the room's agreement
 * see it in place of the sections.
 */
function RoomView({ room }: { room: Room }) {
	const { data, tab, setTab, actingId, previewAs, person, setPreviewAs, can, assistantOpen, setAssistantOpen } = useDataRooms();
	const tabs = useRoomTabs(room);
	const active = tabs.some((candidate) => candidate.value === tab) ? tab : 'documents';
	const gated = needsAgreement(data, actingId, room.id);
	const canAsk = can('ask_assistant', { kind: 'room', roomId: room.id }) && Boolean(data.assistant) && !gated;
	const panelOpen = assistantOpen && canAsk;
	const panelRef = useInert<HTMLDivElement>(!panelOpen);
	const previewing = previewAs ? person(previewAs) : undefined;
	const openQuestions = data.questions.filter((question) => question.roomId === room.id && question.status === 'open').length;
	const tabId = React.useId();

	const choose = (next: RoomTab) => startViewTransition(() => setTab(next));

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3">
				<NavMenuButton />
				<div className="flex min-w-0 shrink items-center gap-1.5">
					<h1 className="truncate text-sm font-medium text-foreground">{room.name}</h1>
					<DeadlineDot room={room} />
					{room.status === 'archived' ? <ToneBadge tone="neutral">Archived</ToneBadge> : null}
				</div>
				{gated ? (
					<div className="flex-1" />
				) : (
					<div className={cn(scrollRowClass, 'min-w-0 flex-1')}>
						<div role="tablist" aria-label={`${room.name} sections`} className="flex w-max gap-0.5">
							{tabs.map((option) => {
								const selected = option.value === active;
								const count = option.value === 'questions' ? openQuestions : 0;
								return (
									<button
										key={option.value}
										type="button"
										role="tab"
										id={`${tabId}-${option.value}`}
										aria-selected={selected}
										aria-controls={`${tabId}-panel`}
										tabIndex={selected ? 0 : -1}
										onClick={() => choose(option.value)}
										onKeyDown={(event) => {
											if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
											event.preventDefault();
											const index = tabs.findIndex((candidate) => candidate.value === active);
											const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]!;
											choose(next.value);
											event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${tabId}-${next.value}`)}`)?.focus();
										}}
										className={cn(
											'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] pointer-coarse:h-9',
											pressClass,
											focusRingClass,
											selected ? 'bg-overlay-hover font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
										)}
									>
										{option.label}
										{count ? (
											<span className="text-xs text-warning tabular-nums">
												{count}
												<span className="sr-only"> open</span>
											</span>
										) : null}
									</button>
								);
							})}
						</div>
					</div>
				)}
				<div className="flex shrink-0 items-center gap-0.5">
					<PreviewAsMenu room={room} />
					{canAsk ? (
						<TooltipIconButton
							label={panelOpen ? 'Close the assistant' : `Ask about ${room.name}`}
							side="bottom"
							aria-pressed={panelOpen}
							className={cn(panelOpen && 'bg-overlay-hover text-foreground')}
							onClick={() => startViewTransition(() => setAssistantOpen(!panelOpen))}
						>
							<Sparkles aria-hidden="true" className="size-3.5" />
						</TooltipIconButton>
					) : null}
				</div>
			</header>

			{previewing ? (
				<div className="flex shrink-0 items-center gap-2 border-b border-border bg-[color-mix(in_oklab,var(--primary)_7%,var(--background))] px-4 py-2 text-[13px]">
					<Eye aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
					<p className="min-w-0 flex-1 truncate text-foreground">
						Previewing as <span className="font-medium">{previewing.name}</span>
						{previewing.company ? <span className="text-muted-foreground"> · {previewing.company}</span> : null}
						<span className="hidden text-muted-foreground @xl/view:inline">. This is exactly what they can see and do.</span>
					</p>
					<Button size="xs" variant="ghost" onClick={() => setPreviewAs(null)}>
						Exit preview
					</Button>
				</div>
			) : null}

			<div className="flex min-h-0 flex-1">
				<div className={cn('flex min-w-0 flex-1 flex-col', panelOpen && 'hidden @4xl/view:flex')}>
					{gated ? (
						<div className="min-h-0 flex-1 overflow-y-auto">
							<AgreementGate room={room} />
						</div>
					) : (
						<ViewAnimation>
							<div key={active} id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${active}`} className="flex min-h-0 flex-1 flex-col">
								{active === 'documents' ? <DocumentsTab room={room} /> : null}
								{active === 'people' ? <PeopleTab room={room} /> : null}
								{active === 'questions' ? <QuestionsTab room={room} /> : null}
								{active === 'insights' ? <InsightsTab room={room} /> : null}
								{active === 'settings' ? <SettingsTab room={room} /> : null}
							</div>
						</ViewAnimation>
					)}
				</div>
				<div
					ref={panelRef}
					className={cn(
						'flex shrink-0 overflow-hidden border-border transition-[width,opacity] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
						panelOpen ? 'w-full opacity-100 @4xl/view:w-[380px] @4xl/view:border-l' : 'w-0 opacity-0',
					)}
				>
					{canAsk ? <RoomAssistant room={room} onClose={() => startViewTransition(() => setAssistantOpen(false))} /> : null}
				</div>
			</div>
		</div>
	);
}

export { RoomView };

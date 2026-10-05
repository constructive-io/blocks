'use client';

import { Download, Eye, FileDown, Share2, Sparkles } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet';
import { focusRingClass, Segmented, ToneBadge, TooltipIconButton } from '../workspace-kit/primitives';
import { dashedRule, EmptyState } from '../workspace-kit/surface';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';
import { roomPeople } from './access';
import { useDataRooms } from './data-rooms-context';
import { formatDuration } from './format';
import { DocumentGlyph, documentKindLabel, LEVEL_PRESENTATION, PersonAvatar, PersonLine } from './parts';
import type { ActivityKind, DataRoomDocument, Person } from './types';

type SheetTab = 'preview' | 'versions' | 'access' | 'activity';

const VERB: Partial<Record<ActivityKind, string>> = {
	view: 'opened',
	download: 'downloaded',
	version: 'uploaded a new version',
	upload: 'uploaded',
	move: 'moved',
};

/** Faint text lines for a placeholder page; widths vary so it reads as prose. */
const LINE_WIDTHS = [92, 100, 96, 88, 100, 74, 0, 100, 94, 98, 81, 100, 90, 62, 0, 97, 100, 86, 93, 70];

/**
 * Placeholder pages drawn when the host doesn't render previews. Each page
 * carries the reader's watermark when the room or document asks for one.
 */
function PlaceholderPages({ document, viewer, watermark, stamp }: { document: DataRoomDocument; viewer: Person | undefined; watermark: boolean; stamp: string }) {
	const pages = Math.max(1, Math.min(document.pages ?? 3, 4));
	const remaining = (document.pages ?? 0) - pages;
	const label = viewer ? `${viewer.name} · ${viewer.email} · ${stamp}` : stamp;
	const sheet = document.kind === 'sheet';
	return (
		<div className="flex flex-col gap-3">
			<div className="grid grid-cols-1 gap-4 @xl/sheet:grid-cols-2">
				{Array.from({ length: pages }, (_, page) => (
					<figure
						key={page}
						aria-label={`Page ${page + 1}`}
						className="relative isolate aspect-[1/1.414] overflow-hidden rounded-md bg-[color-mix(in_oklab,white_94%,var(--card))] shadow-card dark:bg-[color-mix(in_oklab,white_8%,var(--card))]"
					>
						{sheet ? (
							<div aria-hidden="true" className="absolute inset-[8%] grid grid-cols-5 grid-rows-[repeat(14,1fr)] border-t border-l border-foreground/10">
								{Array.from({ length: 70 }, (_, cell) => (
									<span
										key={cell}
										className={cn('border-r border-b border-foreground/10', cell < 5 && 'bg-foreground/[0.06]', cell % 5 === 0 && cell >= 5 && 'bg-foreground/[0.03]')}
									/>
								))}
							</div>
						) : (
							<div aria-hidden="true" className="absolute inset-x-[10%] top-[9%] flex flex-col gap-[3.2%]">
								{page === 0 ? <span className="mb-[4%] h-2.5 w-3/5 rounded-full bg-foreground/20" /> : null}
								{LINE_WIDTHS.map((width, line) => (
									<span key={line} className="h-1.5 rounded-full bg-foreground/[0.09]" style={{ width: `${width}%`, opacity: width ? 1 : 0 }} />
								))}
							</div>
						)}
						{watermark ? (
							<div aria-hidden="true" className="pointer-events-none absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-center gap-10 select-none">
								{Array.from({ length: 14 }, (_, row) => (
									<span
										key={row}
										className="text-[11px] font-medium whitespace-nowrap text-foreground/10"
										style={{ marginLeft: `${(row % 2) * -12}%` }}
									>
										{`${label}\u2003·\u2003`.repeat(4)}
									</span>
								))}
							</div>
						) : null}
						<figcaption className="absolute right-2 bottom-1.5 text-[10px] text-subtle-foreground tabular-nums">{page + 1}</figcaption>
					</figure>
				))}
			</div>
			{remaining > 0 ? (
				<p className="text-center text-xs text-muted-foreground tabular-nums">
					{remaining} more {remaining === 1 ? 'page' : 'pages'}
				</p>
			) : null}
			{watermark && viewer ? <p className="sr-only">Watermarked for {viewer.name}</p> : null}
		</div>
	);
}

/** One document: preview, versions, who can open it, and its activity. */
export function DocumentSheet() {
	const { data, documentId, openDocument, document: find, room: findRoom, person, actingId, can, emit, openShare, askAssistant, openTrace, renderPreview, format } =
		useDataRooms();
	const document = documentId ? find(documentId) : undefined;
	const [tab, setTab] = React.useState<SheetTab>('preview');
	const [shownId, setShownId] = React.useState(documentId);
	if (shownId !== documentId) {
		setShownId(documentId);
		setTab('preview');
	}

	const room = document ? findRoom(document.roomId) : undefined;
	const target = document ? ({ kind: 'document', documentId: document.id } as const) : null;
	const roomTarget = room ? ({ kind: 'room', roomId: room.id } as const) : null;
	const canDownload = target ? can('download', target) : false;
	const canShare = target ? can('share', target) : false;
	const manages = roomTarget ? can('manage_room', roomTarget) : false;
	const canAsk = target ? can('ask_assistant', target) && Boolean(data.assistant) : false;
	const viewOnly = Boolean(room?.policies.viewOnly || document?.restrictions?.viewOnly);
	const watermark = Boolean(room?.policies.watermark || document?.restrictions?.watermark);
	const viewer = person(actingId);

	const tabs: { value: SheetTab; label: string }[] = [
		{ value: 'preview', label: 'Preview' },
		{ value: 'versions', label: 'Versions' },
		...(manages || canShare ? [{ value: 'access' as const, label: 'Access' }] : []),
		...(manages ? [{ value: 'activity' as const, label: 'Activity' }] : []),
	];
	const active = tabs.some((option) => option.value === tab) ? tab : 'preview';

	const latest = document?.versions[document.versions.length - 1];
	const events = document
		? data.activity
				.filter((event) => event.documentId === document.id && VERB[event.kind])
				.sort((a, b) => b.at.localeCompare(a.at))
				.slice(0, 40)
		: [];
	const readers = document && room ? roomPeople(data, room.id).filter(({ person: candidate }) => can('view', { kind: 'document', documentId: document.id }, candidate.id)) : [];

	return (
		<Sheet open={Boolean(document)} onOpenChange={(open) => (open ? null : openDocument(null))}>
			<SheetContent side="right" className="@container/sheet w-[44rem] max-w-[96vw] gap-0 p-0 sm:max-w-[44rem]">
				{document && room ? (
					<>
						<div className="flex shrink-0 items-start gap-3 border-b border-border bg-muted/50 px-5 pt-5 pb-4 pr-12">
							<DocumentGlyph kind={document.kind} size="lg" />
							<div className="min-w-0 flex-1">
								<SheetTitle className="text-base font-medium break-words">{document.name}</SheetTitle>
								<SheetDescription className="mt-0.5 text-[13px] tabular-nums">
									{document.folder === '/' ? room.name : document.folder.slice(1)} · {documentKindLabel(document.kind)} · {format.bytes(document.size)}
									{latest ? ` · v${latest.number}` : ''}
								</SheetDescription>
							</div>
						</div>
						<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-5 py-2.5">
							{canDownload ? (
								<Button size="xs" onClick={() => emit({ type: 'download', documentId: document.id })}>
									<Download aria-hidden="true" />
									Download
								</Button>
							) : viewOnly ? (
								<ToneBadge tone="neutral">
									<Eye aria-hidden="true" />
									View only
								</ToneBadge>
							) : null}
							{canShare ? (
								<Button size="xs" variant="outline" onClick={() => openShare({ roomId: room.id, folder: document.folder })}>
									<Share2 aria-hidden="true" />
									Share folder
								</Button>
							) : null}
							{canAsk ? (
								<Button
									size="xs"
									variant="outline"
									onClick={() => {
										askAssistant(`Summarize ${document.name}`, document.id);
										openDocument(null);
									}}
								>
									<Sparkles aria-hidden="true" />
									Ask about this
								</Button>
							) : null}
							<Segmented
								label="Document section"
								value={active}
								options={tabs}
								onChange={(next) => startViewTransition(() => setTab(next))}
								className="ml-auto"
							/>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
							<ViewAnimation>
								<div key={active}>
									{active === 'preview' ? (
										renderPreview && viewer ? (
											renderPreview(document, { viewer, watermark, viewOnly })
										) : (
											<PlaceholderPages document={document} viewer={viewer} watermark={watermark} stamp={format.date(data.clock, true)} />
										)
									) : null}

									{active === 'versions' ? (
										<ol className="flex flex-col">
											{[...document.versions].reverse().map((version, index) => {
												const uploader = person(version.uploadedBy);
												return (
													<li key={version.id} className={cn('flex items-center gap-3 py-3', index > 0 && cn('border-t', dashedRule))}>
														<span className="w-8 shrink-0 text-[13px] font-medium text-foreground tabular-nums">v{version.number}</span>
														<span className="min-w-0 flex-1">
															<span className="flex items-center gap-1.5 text-[13px] text-foreground">
																<PersonAvatar person={uploader} size="xs" />
																<span className="truncate">{uploader?.name ?? 'Someone'}</span>
																{index === 0 ? <ToneBadge tone="success">Current</ToneBadge> : null}
															</span>
															<span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
																{format.date(version.uploadedAt, true)} · {format.bytes(version.size)}
																{version.note ? ` · ${version.note}` : ''}
															</span>
														</span>
														{canDownload ? (
															<TooltipIconButton
																label={`Download version ${version.number}`}
																onClick={() => emit({ type: 'download', documentId: document.id, versionId: version.id })}
															>
																<FileDown aria-hidden="true" className="size-3.5" />
															</TooltipIconButton>
														) : null}
													</li>
												);
											})}
										</ol>
									) : null}

									{active === 'access' ? (
										<div className="flex flex-col gap-3">
											<p className="text-[13px] text-muted-foreground tabular-nums">
												{readers.length} {readers.length === 1 ? 'person can' : 'people can'} open this document. Select someone to see why.
											</p>
											<ul className="flex flex-col">
												{readers.map(({ person: reader, access }, index) => {
													const level = LEVEL_PRESENTATION[access.level];
													const viaShare = access.level === 'share' || access.grants.every((grant) => grant.kind === 'share');
													return (
														<li key={reader.id} className={cn(index > 0 && cn('border-t', dashedRule))}>
															<button
																type="button"
																onClick={() => openTrace(reader.id, room.id)}
																className={cn('-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-overlay-hover', focusRingClass)}
															>
																<PersonLine person={reader} className="flex-1" />
																{viaShare ? <span className="hidden text-xs text-muted-foreground @md/sheet:inline">Folder access</span> : null}
																<ToneBadge tone={level.tone}>{level.label}</ToneBadge>
															</button>
														</li>
													);
												})}
											</ul>
										</div>
									) : null}

									{active === 'activity' ? (
										events.length ? (
											<ol className="flex flex-col">
												{events.map((event, index) => {
													const actor = person(event.actorId);
													return (
														<li key={event.id} className={cn('flex items-center gap-3 py-2.5', index > 0 && cn('border-t', dashedRule))}>
															<PersonAvatar person={actor} size="sm" />
															<span className="min-w-0 flex-1 text-[13px]">
																<span className="font-medium text-foreground">{actor?.name ?? 'Someone'}</span>{' '}
																<span className="text-muted-foreground">{VERB[event.kind]}</span>
																{event.kind === 'view' && event.seconds ? (
																	<span className="text-muted-foreground tabular-nums"> · {formatDuration(event.seconds)}</span>
																) : null}
															</span>
															<span className="shrink-0 text-xs text-muted-foreground tabular-nums">{format.relative(event.at)}</span>
														</li>
													);
												})}
											</ol>
										) : (
											<EmptyState icon={Eye} title="No activity yet" description="Views and downloads appear here." />
										)
									) : null}
								</div>
							</ViewAnimation>
						</div>
					</>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

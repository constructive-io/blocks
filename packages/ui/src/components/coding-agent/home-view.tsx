'use client';

import { MessageSquarePlus, Plus } from 'lucide-react';
import * as React from 'react';

import { formatCount, plural } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { Button } from '../button';
import { focusRingClass, SearchField } from '../workspace-kit/primitives';
import { EmptyState, SectionHeading } from '../workspace-kit/surface';
import { useCodingAgent } from './coding-agent-context';
import { SessionGlyph, sessionStatusLabel, SessionTitle } from './session-glyph';
import { frameClasses } from './session-surface';

/** Rows shown per project before "Show all", so a workspace with thousands of sessions still opens at once. */
const PAGE = 50;

/** Every session, open or not, grouped by project and searchable. Choosing one opens it as a tab. */
export function HomeView() {
	const { data, sessions, activate, newSession, openIds, layout } = useCodingAgent();
	const openSet = React.useMemo(() => new Set(openIds), [openIds]);
	const frame = frameClasses(layout);
	const [query, setQuery] = React.useState('');
	const [expanded, setExpanded] = React.useState<string[]>([]);
	const needle = query.trim().toLowerCase();
	const all = sessions.filter((session) => !session.draft);
	const visible = needle ? all.filter((session) => session.title.toLowerCase().includes(needle)) : all;

	return (
		<div className={cn('h-full min-h-0', frame.outer)}>
			<section aria-label="All sessions" className={cn('@container/home h-full overflow-y-auto', frame.surface)}>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
					{all.length === 0 ? (
						<EmptyState
							icon={MessageSquarePlus}
							title="No sessions yet"
							description="Start one and it shows up here, grouped by project."
							action={
								<Button size="sm" onClick={newSession}>
									<Plus aria-hidden="true" className="size-3.5" />
									New session
								</Button>
							}
						/>
					) : (
						<>
							<div className="flex items-center gap-2">
								<SearchField
									label="Search sessions"
									placeholder="Search sessions"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									className="h-8 min-w-0 flex-1"
								/>
								<Button size="sm" aria-label="New session" onClick={newSession} className="shrink-0">
									<Plus aria-hidden="true" className="size-3.5" />
									<span className="sr-only @sm/home:not-sr-only">New session</span>
								</Button>
							</div>
							{data.projects.map((entry) => {
								const rows = visible.filter((session) => session.projectId === entry.id);
								if (rows.length === 0) return null;
								const shown = expanded.includes(entry.id) || needle ? rows : rows.slice(0, PAGE);
								return (
									<div key={entry.id} className="flex min-w-0 flex-col gap-2">
										<SectionHeading
											title={
												<span dir="auto" title={entry.name} className="block truncate [text-align:match-parent]">
													{entry.name}
												</span>
											}
											description={
												<span dir="auto" title={entry.path} className="block truncate font-mono text-xs [text-align:match-parent]">
													{entry.path}
												</span>
											}
										/>
										<ul className="flex flex-col">
											{shown.map((session) => {
												const status = sessionStatusLabel(session);
												return (
													// Off-screen rows skip layout and paint until they scroll near.
													<li key={session.id} className="[contain-intrinsic-size:auto_40px] [content-visibility:auto]">
														<button
															type="button"
															title={status ? `${session.title} · ${status}` : session.title}
															onClick={() => activate(session.id)}
															className={cn('-mx-2 flex h-10 w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 text-start hover:bg-overlay-hover', focusRingClass)}
														>
															<SessionGlyph session={session} projectName={entry.name} />
															<SessionTitle
																session={session}
																className={cn('min-w-16 flex-1 text-[0.8125rem]', session.status !== 'running' && 'text-foreground')}
															/>
															{/* The ring already carries the state, so the words make way first on a narrow screen. */}
															{status ? <span className="hidden shrink-0 text-xs text-muted-foreground @lg/home:inline">{status}</span> : null}
															{session.changedFiles ? (
																<span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums @sm/home:inline">
																	{formatCount(session.changedFiles)} {plural(session.changedFiles, { one: 'file', other: 'files' })}
																</span>
															) : null}
															<span className="min-w-8 shrink-0 text-end text-xs text-subtle-foreground tabular-nums">
																{openSet.has(session.id) ? 'Open' : session.updatedLabel}
															</span>
														</button>
													</li>
												);
											})}
										</ul>
										{shown.length < rows.length ? (
											<Button
												size="xs"
												variant="ghost"
												className="self-start text-muted-foreground"
												onClick={() => setExpanded((current) => [...current, entry.id])}
											>
												Show all <span className="tabular-nums">{formatCount(rows.length)}</span>
											</Button>
										) : null}
									</div>
								);
							})}
							{needle && visible.length === 0 ? (
								<p className="py-8 text-center text-[0.8125rem] text-muted-foreground [overflow-wrap:anywhere]">No sessions match “{query.trim()}”.</p>
							) : null}
						</>
					)}
				</div>
			</section>
		</div>
	);
}

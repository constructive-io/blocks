'use client';

import { Check, ChevronDown, GitBranch, GitBranchPlus, Monitor } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Mascot } from '../agents-builder/mascot';
import type { ModelSelection } from '../ai/model-selector';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '../dropdown-menu';
import { focusRingClass } from '../workspace-kit/primitives';
import { type LiveSession, useCodingAgent } from './coding-agent-context';
import { ProjectMark } from './session-glyph';
import { SessionComposer } from './session-composer';
import { frameClasses } from './session-surface';
import type { WorkspaceLocation } from './types';

const chipClass = cn(
	'flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-md px-2 text-[0.8125rem] text-muted-foreground hover:bg-overlay-hover hover:text-foreground data-popup-open:bg-overlay-hover pointer-coarse:h-10',
	focusRingClass
);

const LOCATIONS: { value: WorkspaceLocation; label: string; description: string; icon: typeof Monitor }[] = [
	{ value: 'local', label: 'Local', description: 'Work in the project checkout', icon: Monitor },
	{ value: 'worktree', label: 'New worktree', description: 'Work on a fresh branch in its own folder', icon: GitBranchPlus }
];

/**
 * A draft session: a greeting, the composer, and where the agent will work — which project, whether in the checkout
 * or a new worktree, and on which branch. Sending turns the draft into a running session.
 */
export function NewSession({ session, active }: { session: LiveSession; active: boolean }) {
	const { data, project: projectOf, startSession, layout } = useCodingAgent();
	const frame = frameClasses(layout);
	const [projectId, setProjectId] = React.useState(session.projectId);
	const [location, setLocation] = React.useState<WorkspaceLocation>('local');
	const [model, setModel] = React.useState<ModelSelection>(data.defaultModel);
	const composerRef = React.useRef<HTMLDivElement>(null);
	const project = projectOf(projectId);
	const place = LOCATIONS.find((entry) => entry.value === location)!;
	const files = React.useMemo(() => Object.keys(project.files).sort(), [project.files]);
	const branch = location === 'worktree' ? `agent/${session.id.replace('draft-', 'session-')}` : project.branch;

	React.useEffect(() => {
		if (active) composerRef.current?.querySelector('textarea')?.focus();
	}, [active]);

	return (
		<div hidden={!active} className={cn('h-full min-h-0', frame.outer)}>
			<section
				aria-label="New session"
				className={cn('flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto px-6', frame.surface)}
			>
				<div className="flex w-full max-w-2xl flex-col items-center gap-6 pb-[12vh]">
					<div className="flex flex-col items-center gap-4">
						<Mascot className="size-12 rounded-[14px]" />
						<h2 className="text-center text-xl font-medium tracking-tight text-balance text-foreground [overflow-wrap:anywhere]">
							What should we build in <bdi>{project.name}</bdi>?
						</h2>
					</div>
					<SessionComposer
						className="w-full"
						inputRef={composerRef}
						onSubmit={(text) => startSession(session.id, { text, projectId, location })}
						commands={data.commands}
						files={files}
						models={data.models}
						model={model}
						onModelChange={setModel}
					/>
					<div className="flex w-full flex-wrap items-center justify-center gap-1">
						<DropdownMenu>
							<DropdownMenuTrigger aria-label={`Project: ${project.name}`} className={chipClass}>
								<ProjectMark name={project.name} />
								<span dir="auto" title={project.name} className="min-w-0 truncate text-foreground">
									{project.name}
								</span>
								<ChevronDown aria-hidden="true" className="size-3 shrink-0" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="center" className="w-auto min-w-(--anchor-width) max-w-(--available-width)">
								<DropdownMenuLabel>Project</DropdownMenuLabel>
								{data.projects.map((entry) => (
									<DropdownMenuItem key={entry.id} title={entry.name} onClick={() => setProjectId(entry.id)}>
										<ProjectMark name={entry.name} />
										<span dir="auto" className="min-w-0 flex-1 truncate [text-align:match-parent]">
											{entry.name}
										</span>
										{entry.id === projectId ? <Check aria-hidden="true" className="size-3.5" /> : null}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
						<span aria-hidden="true" className="text-subtle-foreground">/</span>
						<DropdownMenu>
							<DropdownMenuTrigger aria-label={`Run in: ${place.label}`} className={chipClass}>
								<place.icon aria-hidden="true" className="size-3.5 shrink-0" />
								<span className="shrink-0 text-foreground">{place.label}</span>
								{location === 'local' ? <span aria-hidden="true" className="size-1.5 rounded-full bg-success" /> : null}
								<ChevronDown aria-hidden="true" className="size-3 shrink-0" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="center" className="w-64">
								<DropdownMenuLabel>Run in</DropdownMenuLabel>
								{LOCATIONS.map((entry) => (
									<DropdownMenuItem key={entry.value} onClick={() => setLocation(entry.value)} className="items-start">
										<entry.icon aria-hidden="true" className="mt-0.5 size-3.5" />
										<span className="min-w-0 flex-1">
											<span className="block">{entry.label}</span>
											<span className="block text-xs text-muted-foreground">{entry.description}</span>
										</span>
										{entry.value === location ? <Check aria-hidden="true" className="mt-0.5 size-3.5" /> : null}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
						{/* Where the agent will commit; the location menu decides it, so this reads as a label rather than a control. */}
						<span
							title={branch}
							className="flex h-7 min-w-0 max-w-full items-center gap-1.5 px-1.5 font-mono text-xs text-muted-foreground"
						>
							<GitBranch aria-hidden="true" className="size-3.5 shrink-0" />
							<span dir="ltr" className="min-w-0 truncate">
								{branch}
							</span>
						</span>
					</div>
				</div>
			</section>
		</div>
	);
}

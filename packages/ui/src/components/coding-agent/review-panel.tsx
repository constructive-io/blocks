'use client';

import type { DiffLineAnnotation } from '@pierre/diffs';
import { MultiFileDiff } from '@pierre/diffs/react';
import { ChevronDown, ChevronUp, Columns2, FilePen, FilePlus2, GitCompareArrows, MessageSquare, Rows2 } from 'lucide-react';
import * as React from 'react';

import { plural } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Textarea } from '../textarea';
import { MiddleTruncate } from '../workspace-kit/middle-truncate';
import { Segmented, TooltipIconButton } from '../workspace-kit/primitives';
import { EmptyState } from '../workspace-kit/surface';
import { useElementSize } from '../workspace-kit/use-element-size';
import { useLatest } from '../workspace-kit/use-latest';
import { CODE_THEMES, type ColorScheme, DIFF_SURFACE_STYLE, DIFF_UNSAFE_CSS } from './code-surface-theme';
import { toolbarButtonClass } from './session-surface';
import { type FileChange, lineTotals, type WorktreeSummary } from './harness';
import { type ChangeScope, scopeChanges, type WorktreeAction, WorktreePicker } from './worktree-picker';

export type LineComment = { id: string; path: string; line: number; side: 'additions' | 'deletions'; text: string; sent?: boolean };

type Annotation = { kind: 'comment'; comment: LineComment } | { kind: 'draft' };

type DiffStyle = 'unified' | 'split';

const STYLE_OPTIONS = [
	{ value: 'unified' as const, label: 'Unified', icon: Rows2 },
	{ value: 'split' as const, label: 'Split', icon: Columns2 }
];

/** Below this width two columns of code show too little of either side, so the review stays unified. */
const SPLIT_MIN_WIDTH = 640;

function DraftComment({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
	const [text, setText] = React.useState('');
	const field = React.useRef<HTMLTextAreaElement>(null);
	// The diff takes focus back on pointer-up after the gutter click, so focus lands a frame later.
	React.useEffect(() => {
		const frame = requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
		return () => cancelAnimationFrame(frame);
	}, []);
	return (
		<form
			dir="auto"
			className="m-2 flex max-w-lg flex-col gap-2 rounded-lg border border-border bg-card p-2 font-sans shadow-xs"
			onSubmit={(event) => {
				event.preventDefault();
				if (text.trim()) onSubmit(text.trim());
			}}
		>
			<Textarea
				ref={field}
				aria-label="Comment for the agent"
				placeholder="Add context for this change…"
				value={text}
				onChange={(event) => setText(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Escape') onCancel();
					if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
				}}
				className="min-h-16 text-[0.8125rem]"
			/>
			<div className="flex justify-end gap-1.5">
				<Button type="button" size="sm" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" size="sm" disabled={!text.trim()}>
					Add comment
				</Button>
			</div>
		</form>
	);
}

function SavedComment({ comment }: { comment: LineComment }) {
	return (
		<div dir="auto" className="m-2 flex max-w-lg items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 font-sans text-[0.8125rem] shadow-xs">
			<MessageSquare aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
			<div className="min-w-0">
				<p className="text-foreground [overflow-wrap:anywhere]">{comment.text}</p>
				<p className="mt-0.5 text-xs text-muted-foreground">{comment.sent ? 'Sent with your message' : 'Attached to your next message'}</p>
			</div>
		</div>
	);
}

/** The file's own header row, in the panel's type and icon sizes, with the path cut in the middle so the name shows. */
function DiffHeader({ change, branch }: { change: FileChange; branch?: string }) {
	const Icon = change.before === null ? FilePlus2 : FilePen;
	return (
		<div className="flex h-10 min-w-0 items-center gap-2 bg-muted px-3 font-sans text-[0.8125rem]">
			<Icon aria-hidden="true" className={cn('size-3.5 shrink-0', change.before === null ? 'text-success' : 'text-warning')} />
			<MiddleTruncate text={change.path} tail={Math.min((change.path.split('/').pop() ?? '').length, 28)} className="min-w-0 flex-1 text-foreground" />
			{/* With several worktrees the same path can show twice, so each diff says which branch it's on. */}
			{branch ? (
				<span title={branch} className="max-w-[40%] shrink truncate font-mono text-xs text-muted-foreground">
					{branch}
				</span>
			) : null}
			<span className="shrink-0 font-mono text-xs tabular-nums">
				{change.additions ? <span className="text-success">+{change.additions}</span> : null}
				{change.additions && change.deletions ? ' ' : null}
				{change.deletions ? <span className="text-destructive">−{change.deletions}</span> : null}
			</span>
		</div>
	);
}

type Draft = { path: string; line: number; side: 'additions' | 'deletions' };

/** Files drawn straight away; the rest draw as you scroll toward them. */
const EAGER_FILES = 3;

/** About how tall a file's diff will be before it's drawn: its header and its changed lines, at 20px a line. */
function estimateHeight(change: FileChange, allLines: boolean) {
	const lines = allLines ? change.after.split('\n').length : Math.min(change.additions + change.deletions + 6, 400);
	return 40 + lines * 20;
}

/**
 * One file's diff. Memoized with stable inputs, because the renderer re-diffs whenever its file objects change and
 * repaints whenever its options do, and the session re-renders on every harness event.
 */
const ReviewFile = React.memo(function ReviewFile({
	change,
	index,
	branch,
	diffStyle,
	scheme,
	allLines,
	wrap,
	comments,
	draft,
	onDraft,
	onComment,
	onRegister,
	onCurrent
}: {
	change: FileChange;
	index: number;
	branch?: string;
	diffStyle: DiffStyle;
	scheme: ColorScheme;
	allLines: boolean;
	wrap: boolean;
	comments: LineComment[];
	/** The open draft when it's on this file. */
	draft: Draft | null;
	onDraft: (draft: Draft | null) => void;
	onComment: (comment: Omit<LineComment, 'id'>) => void;
	onRegister: (key: string, node: HTMLElement | null) => void;
	onCurrent: (index: number) => void;
}) {
	const { key, path } = change;
	const oldFile = React.useMemo(() => ({ name: path, contents: change.before ?? '' }), [path, change.before]);
	const newFile = React.useMemo(() => ({ name: path, contents: change.after }), [path, change.after]);
	const options = React.useMemo(
		() => ({
			diffStyle,
			theme: CODE_THEMES,
			themeType: scheme,
			expandUnchanged: allLines,
			stickyHeader: true,
			overflow: wrap ? ('wrap' as const) : ('scroll' as const),
			lineDiffType: 'word' as const,
			hunkSeparators: 'line-info-basic' as const,
			enableGutterUtility: true,
			unsafeCSS: DIFF_UNSAFE_CSS,
			onGutterUtilityClick: (range: { end: number; endSide?: 'additions' | 'deletions'; side?: 'additions' | 'deletions' }) =>
				onDraft({ path, line: range.end, side: range.endSide ?? range.side ?? 'additions' })
		}),
		[diffStyle, scheme, allLines, wrap, path, onDraft]
	);
	const annotations = React.useMemo(() => {
		const out: DiffLineAnnotation<Annotation>[] = comments
			.filter((comment) => comment.path === path)
			.map((comment) => ({ side: comment.side, lineNumber: comment.line, metadata: { kind: 'comment', comment } }));
		if (draft) out.push({ side: draft.side, lineNumber: draft.line, metadata: { kind: 'draft' } });
		return out;
	}, [comments, draft, path]);
	const style = React.useMemo(() => ({ ...DIFF_SURFACE_STYLE, colorScheme: scheme }), [scheme]);
	// Diffing and highlighting a file is the expensive part, so a file far below the fold waits until you scroll near
	// it, holding about its own height meanwhile; once drawn it stays drawn.
	const [near, setNear] = React.useState(index < EAGER_FILES);
	const node = React.useRef<HTMLElement | null>(null);
	const register = React.useCallback(
		(element: HTMLElement | null) => {
			node.current = element;
			onRegister(key, element);
		},
		[onRegister, key]
	);
	React.useEffect(() => {
		const element = node.current;
		if (near || !element) return;
		// Without an observer to say when it's close, draw it now rather than never.
		if (typeof IntersectionObserver === 'undefined') {
			setNear(true);
			return;
		}
		const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNear(true), {
			root: element.closest('[data-review-scroller]'),
			rootMargin: '800px 0px'
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [near]);

	return (
		<section
			aria-label={branch ? `${path} on ${branch}` : path}
			data-key={key}
			ref={register}
			onFocusCapture={() => onCurrent(index)}
			// Each file starts at its tinted header, so files need no rule between them.
			className="pb-3 last:pb-0"
		>
			{near ? (
				<MultiFileDiff<Annotation>
					oldFile={oldFile}
					newFile={newFile}
					options={options}
					renderCustomHeader={() => <DiffHeader change={change} branch={branch} />}
					lineAnnotations={annotations}
					renderAnnotation={(annotation) =>
						annotation.metadata?.kind === 'comment' ? (
							<SavedComment comment={annotation.metadata.comment} />
						) : (
							<DraftComment onCancel={() => onDraft(null)} onSubmit={(text) => onComment({ path, line: annotation.lineNumber, side: annotation.side, text })} />
						)
					}
					style={style}
				/>
			) : (
				<div style={{ height: estimateHeight(change, allLines) }}>
					<DiffHeader change={change} branch={branch} />
				</div>
			)}
		</section>
	);
});

/**
 * Every file the session changed, one diff each, with a split or unified view, collapsed or full context, wrapped
 * or scrolling lines, previous/next file stepping that follows your scrolling, and line comments that ride along
 * with the next message.
 */
export function ReviewPanel({
	changes,
	focusPath,
	scheme,
	comments,
	onComment,
	scopes,
	worktrees,
	names,
	onWorktreeAction
}: {
	changes: FileChange[];
	/** Agents that changed files. With more than one, the review can narrow to a single agent's changes. */
	scopes: { id: string; name: string }[];
	/** Where the changes landed, with each worktree's pull request and CI. With more than one, the review can narrow to one. */
	worktrees: WorktreeSummary[];
	/** Agent names by run id, for the worktree rows. */
	names: Record<string, string>;
	onWorktreeAction: (action: WorktreeAction) => void;
	focusPath: { path: string; nonce: number } | null;
	scheme: ColorScheme;
	comments: LineComment[];
	onComment: (comment: Omit<LineComment, 'id'>) => void;
}) {
	// Bound in the empty state too, so a session that opens with no changes is measured before its first diff lands.
	const [root, { width }] = useElementSize<HTMLDivElement>({ ignoreHidden: true });
	const scroller = React.useRef<HTMLDivElement>(null);
	const [chosenStyle, setDiffStyle] = React.useState<DiffStyle>('unified');
	const [scope, setScopeState] = React.useState<ChangeScope>({ kind: 'all' });
	// Kept stable between harness events, so the scroll observer and file stepping aren't rebuilt each time.
	const shown = React.useMemo(() => scopeChanges(changes, scope), [changes, scope]);
	const several = worktrees.length > 1;
	const branchOf = (id: string) => worktrees.find((entry) => entry.worktree.id === id)?.worktree.branch ?? id;
	const [allLines, setAllLines] = React.useState(false);
	const [wrap, setWrap] = React.useState(false);
	const [current, setCurrent] = React.useState(0);
	const setScope = (next: ChangeScope) => {
		setScopeState(next);
		setCurrent(0);
		scroller.current?.scrollTo({ top: 0 });
	};
	const [draft, setDraft] = React.useState<Draft | null>(null);
	const sections = React.useRef(new Map<string, HTMLElement>());
	const registerSection = React.useCallback((key: string, node: HTMLElement | null) => {
		if (node) sections.current.set(key, node);
		else sections.current.delete(key);
	}, []);
	// The host's callback can change every render; the files get one that never does, so they can skip re-rendering.
	const onCommentRef = useLatest(onComment);
	const submitComment = React.useCallback(
		(comment: Omit<LineComment, 'id'>) => {
			onCommentRef.current(comment);
			setDraft(null);
		},
		[onCommentRef]
	);
	const canSplit = width >= SPLIT_MIN_WIDTH;
	const diffStyle = canSplit ? chosenStyle : 'unified';

	const reveal = React.useCallback(
		(index: number) => {
			const change = shown[index];
			if (!change) return;
			setCurrent(index);
			sections.current.get(change.key)?.scrollIntoView({ block: 'start' });
		},
		[shown]
	);

	React.useEffect(() => {
		if (!focusPath) return;
		const index = shown.findIndex((change) => change.path === focusPath.path);
		if (index >= 0) reveal(index);
		// Only a new focus request moves the view, not every change to the list.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [focusPath]);

	// The counter follows your scrolling: the current file is the first one whose diff reaches the top quarter.
	React.useEffect(() => {
		const node = scroller.current;
		if (!node || shown.length < 2) return;
		const visible = new Map<string, boolean>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) visible.set((entry.target as HTMLElement).dataset.key ?? '', entry.isIntersecting);
				const index = shown.findIndex((change) => visible.get(change.key));
				if (index >= 0) setCurrent(index);
			},
			{ root: node, rootMargin: '0px 0px -75% 0px' }
		);
		for (const element of sections.current.values()) observer.observe(element);
		return () => observer.disconnect();
	}, [shown]);

	// The scope chip: what's in view, its worktree's pull request and CI, and the menu to change it.
	const picker = worktrees.length ? (
		<WorktreePicker
			worktrees={worktrees}
			agents={scopes}
			changes={changes}
			names={names}
			scope={scope}
			onScope={setScope}
			onAction={onWorktreeAction}
		/>
	) : null;

	if (changes.length === 0) {
		return (
			<div ref={root} className="@container/review flex h-full min-h-0 flex-col">
				{picker ? <div className="flex h-10 shrink-0 items-center px-3">{picker}</div> : null}
				<div className="grid min-h-0 flex-1 place-items-center">
					<EmptyState icon={GitCompareArrows} title="No changes yet" description="Files the agent edits in this session show up here as diffs." />
				</div>
			</div>
		);
	}

	const { additions, deletions } = lineTotals(shown);

	return (
		<div ref={root} className="@container/review flex h-full min-h-0 flex-col">
			<div className="flex h-10 shrink-0 items-center gap-2 px-3">
				{picker ?? null}
				{/* The file count keeps its room; the line totals give way first on a narrow panel. */}
				{/* Beside the scope chip on a narrow panel the counts step aside; the chip's menu repeats them. */}
				<p className={cn('flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-xs whitespace-nowrap text-muted-foreground', picker && '@max-lg/review:invisible')}>
					<bdi className="shrink-0">
						<span className="tabular-nums">{shown.length}</span> {plural(shown.length, { one: 'file', other: 'files' })}
					</bdi>
					<bdi className="min-w-0 truncate font-mono tabular-nums">
						{additions ? <span className="text-success">+{additions}</span> : null} {deletions ? <span className="text-destructive">−{deletions}</span> : null}
					</bdi>
				</p>
				{canSplit ? <Segmented label="Diff layout" value={chosenStyle} options={STYLE_OPTIONS} onChange={setDiffStyle} /> : null}
				<Button
					size="xs"
					variant="ghost"
					aria-pressed={wrap}
					onClick={() => setWrap((value) => !value)}
					className={cn('text-muted-foreground', wrap && 'bg-overlay-hover text-foreground')}
				>
					Wrap
				</Button>
				<Button
					size="xs"
					variant="ghost"
					aria-pressed={allLines}
					onClick={() => setAllLines((value) => !value)}
					className={cn('text-muted-foreground', allLines && 'bg-overlay-hover text-foreground')}
				>
					All lines
				</Button>
				{shown.length > 1 ? (
					<div className="flex items-center">
						<TooltipIconButton label="Previous file" disabled={current === 0} onClick={() => reveal(current - 1)} className={toolbarButtonClass}>
							<ChevronUp aria-hidden="true" className="size-3.5" />
						</TooltipIconButton>
						<span className="min-w-9 text-center text-xs text-muted-foreground tabular-nums">
							{current + 1}/{shown.length}
						</span>
						<TooltipIconButton label="Next file" disabled={current === shown.length - 1} onClick={() => reveal(current + 1)} className={toolbarButtonClass}>
							<ChevronDown aria-hidden="true" className="size-3.5" />
						</TooltipIconButton>
					</div>
				) : null}
			</div>
			{/* Code reads left to right whatever the page direction. */}
			<div ref={scroller} data-review-scroller="" dir="ltr" className="min-h-0 flex-1 overflow-y-auto">
				{shown.length === 0 ? (
					<div className="grid h-full place-items-center">
						<EmptyState icon={GitCompareArrows} title="Nothing changed here yet" description="Changes land here as the agents in this worktree edit files." />
					</div>
				) : null}
				{shown.map((change, index) => (
					<ReviewFile
						key={change.key}
						change={change}
						index={index}
						branch={several ? branchOf(change.worktreeId) : undefined}
						diffStyle={diffStyle}
						scheme={scheme}
						allLines={allLines}
						wrap={wrap}
						comments={comments}
						draft={draft?.path === change.path ? draft : null}
						onDraft={setDraft}
						onComment={submitComment}
						onRegister={registerSection}
						onCurrent={setCurrent}
					/>
				))}
			</div>
		</div>
	);
}

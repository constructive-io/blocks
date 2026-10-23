'use client';

import { Eraser, GitBranch, SquareTerminal, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { MiddleTruncate } from '../workspace-kit/middle-truncate';
import { TooltipIconButton } from '../workspace-kit/primitives';
import { toolbarButtonClass } from './session-surface';
import type { TerminalLine } from './harness';

/**
 * The session's terminal dock: everything the agent ran, in order, then a prompt of your own. Where the shell is
 * (folder and branch) sits in the dock header, so the prompt line keeps its full width for what you type. What
 * a command prints is up to `onCommand`.
 */
export function TerminalPanel({
	lines,
	path,
	branch,
	onCommand,
	onClear,
	onClose,
	agentName
}: {
	lines: TerminalLine[];
	/** Another agent's name for lines it ran, so a shared terminal says who ran what. */
	agentName?: (runId: string) => string | undefined;
	path: string;
	branch: string;
	onCommand: (command: string) => void;
	onClear: () => void;
	onClose: () => void;
}) {
	const [value, setValue] = React.useState('');
	// Your own commands, kept apart from the log so `clear` doesn't forget them, and the line you were typing.
	const [history, setHistory] = React.useState<string[]>([]);
	const [recall, setRecall] = React.useState<{ index: number; draft: string } | null>(null);
	const scroller = React.useRef<HTMLDivElement>(null);
	const input = React.useRef<HTMLInputElement>(null);
	const pinned = React.useRef(true);

	const pin = React.useCallback(() => {
		const node = scroller.current;
		if (node && pinned.current) node.scrollTop = node.scrollHeight;
	}, []);
	React.useLayoutEffect(pin, [lines.length, pin]);
	// Resizing the dock keeps the prompt in view while you were at the bottom.
	React.useEffect(() => {
		const node = scroller.current;
		if (!node) return;
		const observer = new ResizeObserver(pin);
		observer.observe(node);
		return () => observer.disconnect();
	}, [pin]);

	const step = (by: -1 | 1) => {
		if (history.length === 0) return;
		if (by === -1) {
			const index = recall ? Math.max(recall.index - 1, 0) : history.length - 1;
			setRecall({ index, draft: recall?.draft ?? value });
			setValue(history[index]);
		} else if (recall) {
			const index = recall.index + 1;
			if (index >= history.length) {
				setValue(recall.draft);
				setRecall(null);
			} else {
				setRecall({ ...recall, index });
				setValue(history[index]);
			}
		}
	};

	return (
		<section aria-label="Terminal" className="flex h-full min-h-0 flex-col">
			<div className="flex h-10 shrink-0 items-center gap-2 ps-3 pe-1.5">
				<SquareTerminal aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
				<span className="shrink-0 text-[0.8125rem] text-foreground">Terminal</span>
				<span dir="ltr" className="flex min-w-0 flex-1 items-center gap-2 font-mono text-xs text-muted-foreground">
					<MiddleTruncate text={path} tail={18} className="max-w-[60%]" />
					<span title={branch} className="flex min-w-0 items-center gap-1">
						<GitBranch aria-hidden="true" className="size-3.5 shrink-0" />
						<span className="min-w-0 truncate">{branch}</span>
					</span>
				</span>
				<TooltipIconButton label="Clear" onClick={onClear} className={toolbarButtonClass}>
					<Eraser aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
				<TooltipIconButton label="Close terminal" onClick={onClose} className={toolbarButtonClass}>
					<X aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
			</div>
			{/* Shell text is always left to right, whatever the page direction. Clicking the log puts the cursor back in the prompt. */}
			<div
				ref={scroller}
				dir="ltr"
				role="log"
				aria-live="polite"
				onScroll={(event) => {
					const node = event.currentTarget;
					pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 24;
				}}
				onMouseUp={() => {
					if (!window.getSelection()?.toString()) input.current?.focus();
				}}
				className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-start font-mono text-xs leading-5"
			>
				{lines.map((line) => (
					<div
						key={line.id}
						className={cn(
							'min-h-5 whitespace-pre-wrap [overflow-wrap:anywhere]',
							line.kind === 'command' ? 'text-foreground' : line.kind === 'error' ? 'text-destructive' : 'text-muted-foreground'
						)}
					>
						{line.kind === 'command' ? (
							<span aria-hidden="true" className="text-success select-none">
								{agentName?.(line.runId) ? <span className="me-1.5 rounded-sm bg-muted px-1 text-muted-foreground">{agentName(line.runId)}</span> : null}❯{' '}
							</span>
						) : null}
						{line.text}
					</div>
				))}
				<form
					className="flex items-baseline"
					onSubmit={(event) => {
						event.preventDefault();
						const command = value.trim();
						if (!command) return;
						onCommand(command);
						setHistory((current) => [...current, command]);
						setValue('');
						setRecall(null);
						pinned.current = true;
					}}
				>
					<span aria-hidden="true" className="shrink-0 text-success select-none">
						❯{' '}
					</span>
					<input
						ref={input}
						aria-label="Terminal input"
						autoComplete="off"
						spellCheck={false}
						value={value}
						onChange={(event) => {
							setValue(event.target.value);
							setRecall(null);
						}}
						onKeyDown={(event) => {
							if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
							event.preventDefault();
							step(event.key === 'ArrowUp' ? -1 : 1);
						}}
						className="min-w-0 flex-1 bg-transparent text-foreground caret-foreground outline-none"
					/>
				</form>
			</div>
		</section>
	);
}

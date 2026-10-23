'use client';

import { motion, type MotionValue, useMotionValue, useSpring, useTransform } from 'motion/react';
import * as React from 'react';

import { plural } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { popoverSurfaceClass } from '../popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';
import { useReducedMotion } from '../workspace-kit/reduced-motion';
import { awaitsPerson, type RunView, TASK_TURN_ID } from './harness';
import { plainText } from './run-presentation';

type TurnState = 'done' | 'running' | 'waiting' | 'failed';

export type Turn = {
	/** The id of the message that opened the turn, which is also its anchor in the transcript. */
	id: string;
	prompt: string;
	/** The agent's last reply in the turn. */
	reply?: string;
	state: TurnState;
	files?: { count: number; additions: number; deletions: number };
};

/**
 * Splits a run's transcript into turns: each of your messages and everything the agent did until the next one. A
 * sub-agent's first turn is the task its parent gave it.
 */
export function turnsOf(run: RunView): Turn[] {
	const turns: Turn[] = run.parentRunId && run.task ? [{ id: TASK_TURN_ID, prompt: run.task, state: 'done' }] : [];
	for (const item of run.items) {
		if (item.type === 'beat' && item.beat.kind === 'user') {
			turns.push({ id: item.id, prompt: item.beat.text, state: 'done' });
			continue;
		}
		const turn = turns[turns.length - 1];
		if (!turn) continue;
		if (item.type === 'beat' && item.beat.kind === 'say') {
			turn.reply = item.beat.text;
			// A reply after an error means the turn recovered, say after a retry.
			if (turn.state === 'failed') turn.state = 'done';
		}
		else if (item.type === 'beat' && item.beat.kind === 'error') turn.state = 'failed';
		else if (item.type === 'turn-end') turn.files = { count: item.paths.length, additions: item.additions, deletions: item.deletions };
		else if ((item.type === 'question' && !item.answer) || (item.type === 'permission' && !item.decision)) turn.state = 'waiting';
	}
	const last = turns[turns.length - 1];
	if (last && last.state === 'done' && (run.status === 'running' || run.status === 'waiting')) {
		last.state = awaitsPerson(run) ? 'waiting' : 'running';
	}
	return turns;
}

/** Rest and peak tick lengths, and how far from the pointer a tick still swells. Subtle on purpose. */
const REST = 16;
const PEAK = 30;
const REACH = 40;

/** How close to either end of the rail the pointer has to be before it scrolls, and its top speed in px per frame. */
const EDGE = 36;
const EDGE_SPEED = 5;

/** The fade at an end with more ticks past it. */
const FADE = 28;

function TurnTick({
	turn,
	index,
	total,
	active,
	pointerY,
	railScroll,
	reduced,
	onJump
}: {
	turn: Turn;
	index: number;
	total: number;
	active: boolean;
	pointerY: MotionValue<number>;
	/** The rail's scroll offset, so ticks re-measure as the rail scrolls under a still pointer. */
	railScroll: MotionValue<number>;
	reduced: boolean;
	onJump: (id: string) => void;
}) {
	const ref = React.useRef<HTMLButtonElement>(null);
	// Like a dock: each tick swells with the pointer's distance from its centre, settling on a spring with no bounce.
	const distance = useTransform([pointerY, railScroll], ([y]: number[]) => {
		const box = ref.current?.getBoundingClientRect();
		return box ? y - (box.top + box.height / 2) : Infinity;
	});
	const target = useTransform(distance, [-REACH, 0, REACH], [REST, PEAK, REST]);
	const width = useSpring(target, { stiffness: 420, damping: 38, mass: 0.35 });

	return (
		<Tooltip>
			<TooltipTrigger
				delay={250}
				render={
					<button
						ref={ref}
						type="button"
						aria-label={`Turn ${index + 1} of ${total}: ${turn.prompt}`}
						aria-current={active ? 'step' : undefined}
						data-turn-id={turn.id}
						onClick={() => onJump(turn.id)}
						// A fixed 10px pitch: when turns outnumber the room, the rail scrolls rather than packing them tighter.
						className="group/tick flex h-2.5 w-9 shrink-0 cursor-pointer items-center justify-start rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					/>
				}
			>
				<motion.span
					aria-hidden="true"
					style={{ width: reduced ? REST : width }}
					className={cn(
						'block h-px rounded-full',
						turn.state === 'failed'
							? 'bg-destructive'
							: turn.state === 'waiting'
								? 'bg-warning'
								: active
									? 'bg-foreground'
									: 'bg-muted-foreground/50 group-hover/tick:bg-foreground/80 group-focus-visible/tick:bg-foreground/80',
						turn.state === 'running' && !active && 'motion-safe:animate-pulse'
					)}
				/>
			</TooltipTrigger>
			<TooltipContent side="right" align="center" sideOffset={6} className={cn(popoverSurfaceClass, 'w-72 max-w-[calc(100vw-2rem)] px-3 py-2.5')}>
				<p dir="auto" className="line-clamp-2 text-xs font-medium text-pretty text-foreground">
					{plainText(turn.prompt)}
				</p>
				{turn.reply ? (
					<p dir="auto" className="mt-1 line-clamp-3 text-xs text-pretty text-muted-foreground">
						{plainText(turn.reply)}
					</p>
				) : null}
				{turn.files ? (
					<p className="mt-1.5 text-[0.6875rem] text-muted-foreground tabular-nums">
						{turn.files.count} {plural(turn.files.count, { one: 'file', other: 'files' })} changed
						{turn.files.additions ? <span className="ms-1.5 font-mono text-success">+{turn.files.additions}</span> : null}
						{turn.files.deletions ? <span className="ms-1 font-mono text-destructive">−{turn.files.deletions}</span> : null}
					</p>
				) : null}
			</TooltipContent>
		</Tooltip>
	);
}

/**
 * A conversation timeline along the transcript's leading edge, clear of the scrollbar: one hairline per turn, the one
 * in view brighter, a turn waiting on you in amber and a failed one in red. Ticks near the pointer swell a little,
 * dock-style; hovering one previews the turn, and clicking it scrolls there. A long thread's rail keeps a fixed
 * height and scrolls, fading at an end with more past it and gliding on when the pointer rests near that end.
 */
export function TurnRail({
	run,
	scroller,
	reveal
}: {
	run: RunView;
	scroller: () => HTMLElement | null;
	/** Renders a turn that the transcript hasn't rendered yet and returns its element. */
	reveal?: (id: string) => HTMLElement | null;
}) {
	const turns = React.useMemo(() => turnsOf(run), [run]);
	const pointerY = useMotionValue(Infinity);
	const railScroll = useMotionValue(0);
	const reduced = Boolean(useReducedMotion());
	const [activeId, setActiveId] = React.useState<string | null>(null);
	const nav = React.useRef<HTMLElement>(null);
	const hovering = React.useRef(false);
	const edgeFrame = React.useRef(0);
	const [hidden, setHidden] = React.useState({ top: false, bottom: false });

	/** Which ends have ticks past them, for the fades. */
	const measureEnds = React.useCallback(() => {
		const node = nav.current;
		if (!node) return;
		const top = node.scrollTop > 1;
		const bottom = node.scrollHeight - node.scrollTop - node.clientHeight > 1;
		setHidden((current) => (current.top === top && current.bottom === bottom ? current : { top, bottom }));
	}, []);

	React.useEffect(() => {
		const node = nav.current;
		if (!node) return;
		measureEnds();
		const observer = new ResizeObserver(measureEnds);
		observer.observe(node);
		return () => {
			observer.disconnect();
			cancelAnimationFrame(edgeFrame.current);
		};
	}, [measureEnds, turns.length]);

	// Near an end, the rail keeps scrolling while the pointer rests there, faster the closer it is to the edge.
	const edgeScroll = (clientY: number) => {
		const node = nav.current;
		cancelAnimationFrame(edgeFrame.current);
		if (!node || node.scrollHeight <= node.clientHeight) return;
		const box = node.getBoundingClientRect();
		const fromTop = clientY - box.top;
		const fromBottom = box.bottom - clientY;
		const speed = fromTop < EDGE ? -EDGE_SPEED * (1 - fromTop / EDGE) : fromBottom < EDGE ? EDGE_SPEED * (1 - fromBottom / EDGE) : 0;
		if (!speed) return;
		const step = () => {
			const before = node.scrollTop;
			node.scrollTop += speed;
			if (node.scrollTop !== before) edgeFrame.current = requestAnimationFrame(step);
		};
		edgeFrame.current = requestAnimationFrame(step);
	};

	const anchor = React.useCallback(
		(id: string) => scroller()?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`) ?? null,
		[scroller]
	);

	// The turn in view is the last one that starts above the upper third of the transcript, or the latest turn once
	// you're at the bottom, however short it is.
	const ids = turns.map((turn) => turn.id).join('|');
	React.useEffect(() => {
		const node = scroller();
		if (!node || turns.length === 0) return;
		let frame = 0;
		const measure = () => {
			frame = 0;
			const line = node.getBoundingClientRect().top + node.clientHeight / 3;
			let current = turns[0]?.id ?? null;
			if (node.scrollHeight - node.scrollTop - node.clientHeight < 4) {
				setActiveId(turns[turns.length - 1]?.id ?? null);
				return;
			}
			for (const turn of turns) {
				const element = anchor(turn.id);
				// A turn the transcript hasn't rendered yet is history above the rows in view.
				if (!element || element.getBoundingClientRect().top <= line) current = turn.id;
			}
			setActiveId(current);
		};
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(measure);
		};
		measure();
		node.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			node.removeEventListener('scroll', onScroll);
			cancelAnimationFrame(frame);
		};
		// `ids` stands in for `turns`, which is rebuilt whenever the run changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [anchor, ids, scroller]);

	// The rail follows the transcript: the turn in view stays in view on the rail, unless you're using the rail.
	React.useEffect(() => {
		const node = nav.current;
		if (!node || !activeId || hovering.current) return;
		const tick = node.querySelector<HTMLElement>(`[data-turn-id="${CSS.escape(activeId)}"]`);
		if (!tick) return;
		const top = tick.offsetTop - node.clientHeight / 2 + tick.offsetHeight / 2;
		node.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
	}, [activeId, reduced]);

	const jump = (id: string) => {
		const target = reveal?.(id) ?? anchor(id);
		// A far jump goes straight there; smooth scrolling across hundreds of rows only makes you wait.
		const far = target ? Math.abs(target.getBoundingClientRect().top) > (scroller()?.clientHeight ?? 0) * 3 : false;
		target?.scrollIntoView({ block: 'start', behavior: reduced || far ? 'auto' : 'smooth' });
		setActiveId(id);
	};

	if (turns.length === 0) return null;
	return (
		// On the leading edge, so ticks grow into the gutter beside the transcript and away from the scrollbar.
		<div className="pointer-events-none absolute inset-y-0 start-0 flex items-center py-6 ps-1.5">
			<TooltipProvider delay={250}>
				<nav
					ref={nav}
					aria-label="Conversation turns"
					onPointerEnter={() => {
						hovering.current = true;
					}}
					onPointerMove={(event) => {
						if (!reduced) pointerY.set(event.clientY);
						edgeScroll(event.clientY);
					}}
					onPointerLeave={() => {
						hovering.current = false;
						pointerY.set(Infinity);
						cancelAnimationFrame(edgeFrame.current);
					}}
					onScroll={(event) => {
						railScroll.set(event.currentTarget.scrollTop);
						measureEnds();
					}}
					// A capped height that scrolls on its own, with no scrollbar; an end fades out while more ticks are past it.
					style={
						hidden.top || hidden.bottom
							? {
									maskImage: `linear-gradient(to bottom, transparent, black ${hidden.top ? FADE : 0}px, black calc(100% - ${hidden.bottom ? FADE : 0}px), transparent)`,
									WebkitMaskImage: `linear-gradient(to bottom, transparent, black ${hidden.top ? FADE : 0}px, black calc(100% - ${hidden.bottom ? FADE : 0}px), transparent)`
								}
							: undefined
					}
					className="pointer-events-auto flex max-h-[min(18rem,40vh)] flex-col overflow-y-auto overscroll-contain py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{turns.map((turn, index) => (
						<TurnTick
							key={turn.id}
							turn={turn}
							index={index}
							total={turns.length}
							active={turn.id === activeId}
							pointerY={pointerY}
							railScroll={railScroll}
							reduced={reduced}
							onJump={jump}
						/>
					))}
				</nav>
			</TooltipProvider>
		</div>
	);
}

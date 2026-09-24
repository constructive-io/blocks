'use client';

import * as React from 'react';

import { usePlaybackClock } from './playback';
import type { AgentRunScript } from './types';

export type NodeStage = 'absent' | 'loading' | 'ready';

export type RunGroupPlay = { state: 'waiting' | 'open' | 'folded'; shown: number; done: number };

type GroupKey = AgentRunScript['groups'][number]['id'];

export type AgentRunState = {
	reasoning: 'hidden' | 'streaming' | 'done';
	/** Plan items finished so far; one per completed phase. */
	planDone: number;
	shownParagraphs: number;
	/** Index of the paragraph currently typing, if any. */
	typing: number | null;
	/** Steps revealed in the trace (0 hides the trace). */
	shownSteps: number;
	doneSteps: number;
	query: 'hidden' | 'code' | 'rows';
	subagents: RunGroupPlay;
	skills: RunGroupPlay;
	shownFindings: number;
	typingFinding: number | null;
	sources: boolean;
	/** The approval card is on screen, waiting on a person. */
	approval: boolean;
	nodes: { tools: NodeStage; subagents: NodeStage; skills: NodeStage };
	settled: boolean;
};

/** Beat lengths for the scripted run, in milliseconds. */
export const RUN_TIMING = {
	reasoning: 1600,
	afterReasoning: 280,
	queryLines: 900,
	queryRows: 520,
	charMs: 9,
	afterParagraph: 320,
	stepIn: 180,
	stepsSpin: 700,
	stepWork: 520,
	stepMorph: 380,
	itemIn: 220,
	itemSlow: 1500,
	groupHold: 520,
	handover: 420,
} as const;

const INITIAL: AgentRunState = {
	reasoning: 'hidden',
	planDone: 0,
	shownParagraphs: 0,
	typing: null,
	shownSteps: 0,
	doneSteps: 0,
	query: 'hidden',
	subagents: { state: 'waiting', shown: 0, done: 0 },
	skills: { state: 'waiting', shown: 0, done: 0 },
	shownFindings: 0,
	typingFinding: null,
	sources: false,
	approval: false,
	nodes: { tools: 'absent', subagents: 'absent', skills: 'absent' },
	settled: false,
};

type Frame = { delay: number; apply: (state: AgentRunState) => AgentRunState };

/**
 * The whole run as a flat list of timed patches: reasoning, narration, the
 * tool trace, the query and its rows, each group fanning out, the findings,
 * then the approval request. Canvas nodes move from absent to loading to
 * ready, and each phase ticks one plan item. Each frame waits `delay`.
 */
export function buildRunTimeline(script: AgentRunScript): Frame[] {
	const frames: Frame[] = [];
	let wait = 0;
	const at = (apply: Frame['apply'], after = 0) => {
		frames.push({ delay: wait, apply });
		wait = after;
	};
	const tick = (state: AgentRunState) => ({ ...state, planDone: state.planDone + 1 });

	if (script.reasoning) {
		at((state) => ({ ...state, reasoning: 'streaming' }), RUN_TIMING.reasoning);
		at((state) => ({ ...state, reasoning: 'done' }), RUN_TIMING.afterReasoning);
	}

	script.paragraphs.forEach((paragraph, index) => {
		at((state) => ({ ...state, shownParagraphs: index + 1, typing: index }), paragraph.length * RUN_TIMING.charMs);
		at((state) => ({ ...state, typing: null }), RUN_TIMING.afterParagraph);
	});
	at(tick);

	at((state) => ({ ...state, nodes: { ...state.nodes, tools: 'loading' } }), RUN_TIMING.stepIn);
	at((state) => ({ ...state, shownSteps: script.steps.length }), RUN_TIMING.stepsSpin + RUN_TIMING.stepWork);
	script.steps.forEach((_, index) => {
		const last = index === script.steps.length - 1;
		at((state) => ({ ...state, doneSteps: index + 1 }), RUN_TIMING.stepMorph + (last ? 0 : RUN_TIMING.stepWork));
	});
	at((state) => tick({ ...state, nodes: { ...state.nodes, tools: 'ready' } }), RUN_TIMING.handover);

	if (script.query) {
		at((state) => ({ ...state, query: 'code' }), RUN_TIMING.queryLines);
		at((state) => tick({ ...state, query: 'rows' }), RUN_TIMING.queryRows + RUN_TIMING.handover);
	}

	for (const group of script.groups) {
		const key: GroupKey = group.id;
		const slowIndex = Math.floor(group.items.length / 2);
		at((state) => ({ ...state, [key]: { state: 'open', shown: 0, done: 0 }, nodes: { ...state.nodes, [key]: 'loading' } }));
		group.items.forEach((_, index) => {
			at(
				(state) => ({ ...state, [key]: { state: 'open', shown: index + 1, done: index } }),
				index === slowIndex ? RUN_TIMING.itemSlow : RUN_TIMING.itemIn,
			);
			at(
				(state) => ({ ...state, [key]: { state: 'open', shown: index + 1, done: index + 1 } }),
				index === group.items.length - 1 ? RUN_TIMING.groupHold : 0,
			);
		});
		const count = group.items.length;
		at(
			(state) => ({ ...state, [key]: { state: 'folded', shown: count, done: count }, nodes: { ...state.nodes, [key]: 'ready' } }),
			RUN_TIMING.handover,
		);
	}

	at(tick);

	script.findings?.paragraphs.forEach((paragraph, index) => {
		at((state) => ({ ...state, shownFindings: index + 1, typingFinding: index }), paragraph.length * RUN_TIMING.charMs);
		at((state) => ({ ...state, typingFinding: null }), RUN_TIMING.afterParagraph);
	});
	if (script.findings) at((state) => tick({ ...state, sources: true }), RUN_TIMING.handover);
	if (script.approval) at((state) => ({ ...state, approval: true }), RUN_TIMING.afterParagraph);

	at((state) => ({ ...state, settled: true }));
	return frames;
}

function settledState(script: AgentRunScript): AgentRunState {
	return buildRunTimeline(script).reduce((state, frame) => frame.apply(state), INITIAL);
}

/**
 * Replays an agent run from its script. `stop` settles everything at once.
 * Replace with live run events in production by producing the same state.
 */
export function useAgentRun(script: AgentRunScript, { autoplay = true }: { autoplay?: boolean } = {}) {
	const timeline = React.useMemo(() => buildRunTimeline(script), [script]);
	const [run, setRun] = React.useState(() =>
		autoplay ? { state: INITIAL, next: 0 } : { state: settledState(script), next: timeline.length },
	);

	usePlaybackClock(timeline[run.next], false, () =>
		setRun((current) => {
			const frame = timeline[current.next];
			return frame ? { state: frame.apply(current.state), next: current.next + 1 } : current;
		}),
	);

	const stop = React.useCallback(() => setRun({ state: settledState(script), next: timeline.length }), [script, timeline.length]);

	return { state: run.state, stop };
}

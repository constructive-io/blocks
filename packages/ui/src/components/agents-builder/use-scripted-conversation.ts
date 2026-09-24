'use client';

import * as React from 'react';

import type { AskAnswer } from '../ai/ask-card';
import { usePlaybackClock } from './playback';
import type { ConversationBeat, ToolStep } from './types';

type Beat<K extends ConversationBeat['kind']> = Extract<ConversationBeat, { kind: K }>;

export type ThreadItem =
	| { kind: 'user'; id: string; text: string }
	| { kind: 'say'; id: string; text: string; streaming: boolean }
	| { kind: 'steps'; id: string; steps: ToolStep[]; done: number }
	| { kind: 'ask'; id: string; beat: Beat<'ask'>; answer?: AskAnswer }
	| { kind: 'connect'; id: string; beat: Beat<'connect'>; status: 'idle' | 'connected' | 'skipped' }
	| { kind: 'agent'; id: string; beat: Beat<'agent'>; chosen?: string };

export type ConversationStatus = 'idle' | 'running' | 'waiting';

/** Pacing, in milliseconds, tuned to read like an agent working rather than a replay. */
export const CONVERSATION_TIMING = {
	charMs: 9,
	sayMin: 280,
	sayMax: 2600,
	afterSay: 320,
	stepWork: 520,
	afterSteps: 380,
	beforeReply: 420,
} as const;

export function sayDuration(text: string) {
	return Math.min(CONVERSATION_TIMING.sayMax, Math.max(CONVERSATION_TIMING.sayMin, text.length * CONVERSATION_TIMING.charMs));
}

/**
 * One timed mutation of the thread. Beats expand into ops up front, so playback
 * is a flat queue: wait `delay`, apply, repeat. `pause` stops the queue until
 * the person resolves the interactive item it appended.
 */
type Op =
	| { kind: 'append'; delay: number; item: ThreadItem; pause?: boolean }
	| { kind: 'finish-say'; delay: number; id: string }
	| { kind: 'step-done'; delay: number; id: string };

type Resolution =
	| { kind: 'ask'; answer: AskAnswer }
	| { kind: 'connect'; outcome: 'connected' | 'skipped' }
	| { kind: 'agent'; optionId: string };

type State = { items: ThreadItem[]; queue: Op[]; waiting: boolean; turns: number; seq: number };

type Action =
	| { type: 'send'; text: string; reply: ConversationBeat[] | undefined }
	| { type: 'tick' }
	| { type: 'resolve'; id: string; resolution: Resolution }
	| { type: 'stop' }
	| { type: 'reset' };

const INITIAL: State = { items: [], queue: [], waiting: false, turns: 0, seq: 0 };

/** Expands beats into ops, numbering new items from `seq`. */
function expand(beats: ConversationBeat[], seq: number, firstDelay: number) {
	const ops: Op[] = [];
	let gap = firstDelay;
	for (const beat of beats) {
		const id = `item-${++seq}`;
		switch (beat.kind) {
			case 'say':
				ops.push(
					{ kind: 'append', delay: gap, item: { kind: 'say', id, text: beat.text, streaming: true } },
					{ kind: 'finish-say', delay: sayDuration(beat.text), id },
				);
				gap = CONVERSATION_TIMING.afterSay;
				break;
			case 'steps':
				ops.push(
					{ kind: 'append', delay: gap, item: { kind: 'steps', id, steps: beat.steps, done: 0 } },
					...beat.steps.map((): Op => ({ kind: 'step-done', delay: CONVERSATION_TIMING.stepWork, id })),
				);
				gap = CONVERSATION_TIMING.afterSteps;
				break;
			case 'ask':
				ops.push({ kind: 'append', delay: gap, pause: true, item: { kind: 'ask', id, beat } });
				break;
			case 'connect':
				ops.push({ kind: 'append', delay: gap, pause: true, item: { kind: 'connect', id, beat, status: 'idle' } });
				break;
			case 'agent':
				ops.push({ kind: 'append', delay: gap, pause: true, item: { kind: 'agent', id, beat } });
				break;
		}
	}
	return { ops, seq };
}

/** Resolves an interactive item, returning the settled item and the beats that follow. */
function settle(item: ThreadItem, resolution: Resolution): [ThreadItem, ConversationBeat[]] | null {
	if (item.kind === 'ask' && resolution.kind === 'ask' && !item.answer) {
		const { answer } = resolution;
		const beats =
			'skipped' in answer
				? (item.beat.onSkip ?? [{ kind: 'say', text: 'Skipped, then. Say if you want to come back to it.' }])
				: item.beat.questions.flatMap<ConversationBeat>((question) => {
						const choice = answer.choices[question.id];
						if (!choice) return [];
						if ('other' in choice) return [{ kind: 'say', text: `Noted: "${choice.other}". I will take it from there.` }];
						return question.options.find((option) => option.id === choice.option)?.then ?? [];
					});
		return [{ ...item, answer }, beats];
	}
	if (item.kind === 'connect' && resolution.kind === 'connect' && item.status === 'idle') {
		const beats = resolution.outcome === 'connected' ? item.beat.onConnected : item.beat.skip.then;
		return [{ ...item, status: resolution.outcome }, beats];
	}
	if (item.kind === 'agent' && resolution.kind === 'agent' && !item.chosen) {
		const beats = item.beat.options.find((option) => option.id === resolution.optionId)?.then ?? [];
		return [{ ...item, chosen: resolution.optionId }, beats];
	}
	return null;
}

function applyOp(items: ThreadItem[], op: Op): ThreadItem[] {
	if (op.kind === 'append') return [...items, op.item];
	return items.map((item) => {
		if (item.id !== op.id) return item;
		if (op.kind === 'finish-say' && item.kind === 'say') return { ...item, streaming: false };
		if (op.kind === 'step-done' && item.kind === 'steps') return { ...item, done: item.done + 1 };
		return item;
	});
}

function reducer(fallbackReply: ConversationBeat[], followUpReply: ConversationBeat[]) {
	return (state: State, action: Action): State => {
		switch (action.type) {
			case 'send': {
				const seq = state.seq + 1;
				const reply = action.reply ?? (state.turns === 0 ? fallbackReply : followUpReply);
				const expanded = expand(reply, seq, CONVERSATION_TIMING.beforeReply);
				return {
					items: [...state.items, { kind: 'user', id: `item-${seq}`, text: action.text }],
					queue: [...state.queue, ...expanded.ops],
					waiting: false,
					turns: state.turns + 1,
					seq: expanded.seq,
				};
			}
			case 'tick': {
				const [op, ...queue] = state.queue;
				if (!op) return state;
				return { ...state, items: applyOp(state.items, op), queue, waiting: op.kind === 'append' && Boolean(op.pause) };
			}
			case 'resolve': {
				const item = state.items.find((entry) => entry.id === action.id);
				const settled = item ? settle(item, action.resolution) : null;
				if (!settled) return state;
				const [next, beats] = settled;
				const expanded = expand(beats, state.seq, CONVERSATION_TIMING.beforeReply);
				return {
					...state,
					items: state.items.map((entry) => (entry.id === action.id ? next : entry)),
					queue: [...expanded.ops, ...state.queue],
					waiting: false,
					seq: expanded.seq,
				};
			}
			case 'stop':
				return {
					...state,
					queue: [],
					waiting: false,
					items: state.items.map((item) =>
						item.kind === 'say'
							? { ...item, streaming: false }
							: item.kind === 'steps'
								? { ...item, done: item.steps.length }
								: item,
					),
				};
			case 'reset':
				return { ...INITIAL, seq: state.seq };
		}
	};
}

type UseScriptedConversationOptions = {
	/** Reply to the first free-form message. */
	fallbackReply: ConversationBeat[];
	/** Reply to every message after the first. */
	followUpReply: ConversationBeat[];
};

/**
 * Plays scripted agent replies beat by beat: streamed prose, tool traces, and
 * interactive beats (questions, connect requests, agent drafts) that pause the
 * run until the person answers. Swap it for a live runtime by mapping streamed
 * events onto the same `ThreadItem` shapes.
 */
export function useScriptedConversation({ fallbackReply, followUpReply }: UseScriptedConversationOptions) {
	const reduce = React.useMemo(() => reducer(fallbackReply, followUpReply), [fallbackReply, followUpReply]);
	const [state, dispatch] = React.useReducer(reduce, INITIAL);

	usePlaybackClock(state.queue[0], state.waiting, () => dispatch({ type: 'tick' }));

	const actions = React.useMemo(
		() => ({
			send: (text: string, reply?: ConversationBeat[]) => dispatch({ type: 'send', text, reply }),
			answer: (id: string, answer: AskAnswer) => dispatch({ type: 'resolve', id, resolution: { kind: 'ask', answer } }),
			resolveConnect: (id: string, outcome: 'connected' | 'skipped') =>
				dispatch({ type: 'resolve', id, resolution: { kind: 'connect', outcome } }),
			choose: (id: string, optionId: string) => dispatch({ type: 'resolve', id, resolution: { kind: 'agent', optionId } }),
			stop: () => dispatch({ type: 'stop' }),
			reset: () => dispatch({ type: 'reset' }),
		}),
		[],
	);

	const status: ConversationStatus = state.waiting ? 'waiting' : state.queue.length > 0 ? 'running' : 'idle';
	return { items: state.items, status, ...actions };
}

export type ScriptedConversation = ReturnType<typeof useScriptedConversation>;

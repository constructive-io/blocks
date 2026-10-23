'use client';

import * as React from 'react';

import type { LineComment } from './review-panel';
import type { ComposerAttachment } from './session-composer';

/** A file, or a range of its lines ("12" or "12–18"), to send along with the next message. */
export type FileReference = { path: string; lines?: string };

/** Something waiting to go out with the next message: a file reference, or a comment on a line of the diff. */
type DraftItem = ({ kind: 'file' } & FileReference) | { kind: 'comment'; comment: LineComment };

type DraftState = {
	pending: DraftItem[];
	/** Comments that went out stay on the diff, marked as sent. */
	sent: LineComment[];
	/** Comments added so far, which numbers the next one. */
	comments: number;
};

type DraftAction =
	| { type: 'attach'; file: FileReference }
	| { type: 'comment'; comment: Omit<LineComment, 'id' | 'sent'> }
	| { type: 'remove'; id: string }
	| { type: 'sent' };

const basename = (path: string) => path.split('/').pop() ?? path;

/** An item's chip id. It is only ever compared, so a path can hold any character without breaking it apart. */
function itemId(item: DraftItem) {
	return item.kind === 'comment' ? `comment:${item.comment.id}` : `file:${JSON.stringify([item.path, item.lines ?? ''])}`;
}

/** The composer chip: a file leads with its name, which tells files apart, and keeps its folder as the second line. */
function chipOf(item: DraftItem): ComposerAttachment {
	if (item.kind === 'comment') {
		return { id: itemId(item), kind: 'comment', label: `${basename(item.comment.path)}:${item.comment.line}`, detail: item.comment.text };
	}
	const name = basename(item.path);
	const folder = item.path.slice(0, -name.length - 1);
	return { id: itemId(item), kind: 'file', label: item.lines ? `${name}:${item.lines}` : name, detail: folder || undefined };
}

/** What the host receives: a file as its full reference, a comment as the line it's on and what was said. */
function serialize(item: DraftItem) {
	if (item.kind === 'comment') return `${basename(item.comment.path)}:${item.comment.line}: ${item.comment.text}`;
	return item.lines ? `${item.path}:${item.lines}` : item.path;
}

function draftReducer(state: DraftState, action: DraftAction): DraftState {
	switch (action.type) {
		case 'attach': {
			const item: DraftItem = { kind: 'file', ...action.file };
			return state.pending.some((entry) => itemId(entry) === itemId(item)) ? state : { ...state, pending: [...state.pending, item] };
		}
		case 'comment': {
			const comments = state.comments + 1;
			return { ...state, comments, pending: [...state.pending, { kind: 'comment', comment: { ...action.comment, id: `comment-${comments}` } }] };
		}
		case 'remove':
			// Removing a comment's chip takes the comment off the diff too; one already sent has no chip to remove.
			return { ...state, pending: state.pending.filter((item) => itemId(item) !== action.id) };
		case 'sent':
			return {
				...state,
				pending: [],
				sent: [...state.sent, ...state.pending.flatMap((item) => (item.kind === 'comment' ? [{ ...item.comment, sent: true }] : []))]
			};
	}
}

const EMPTY: DraftState = { pending: [], sent: [], comments: 0 };

/**
 * What rides along with the next message: files and line ranges you attached and comments you left on the diff.
 * The diff's comments and the composer's chips are both views of it, so removing a chip takes its comment off the
 * diff, and sending marks the comments sent.
 */
export function useDraftContext() {
	const [state, dispatch] = React.useReducer(draftReducer, EMPTY);
	const comments = React.useMemo(
		() => [...state.sent, ...state.pending.flatMap((item) => (item.kind === 'comment' ? [item.comment] : []))],
		[state.sent, state.pending]
	);
	const attachments = React.useMemo(() => state.pending.map(chipOf), [state.pending]);
	return {
		comments,
		attachments,
		attach: (file: FileReference) => dispatch({ type: 'attach', file }),
		comment: (comment: Omit<LineComment, 'id' | 'sent'>) => dispatch({ type: 'comment', comment }),
		remove: (id: string) => dispatch({ type: 'remove', id }),
		/** Everything pending, as the host receives it; the comments stay on the diff, marked as sent. */
		take: () => {
			dispatch({ type: 'sent' });
			return state.pending.map(serialize);
		}
	};
}

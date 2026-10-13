import * as React from 'react';

// A run of only collapsible whitespace never becomes a flex item in a browser, so it is dropped rather than wrapped
// (an empty span would open a gap).
const BLANK = /^[ \t\n\f\r]*$/;

/**
 * Wraps each contiguous run of text (strings and numbers) in ONE truncating span and leaves elements alone, so a
 * flex label longer than its container ends in an ellipsis (`text-overflow` does not apply to the flex container
 * itself, nor to the anonymous item a bare string becomes). A run is wrapped as a whole: `{count}%` or
 * `{used}/{max}` stays a single flex item, as it is without the wrapper, so no `gap` opens inside it.
 *
 * `text` is the whole label when the children are text only, for a full-text `title`; otherwise it is undefined.
 */
export function truncateTextRuns(children: React.ReactNode, className = 'min-w-0 truncate') {
	const nodes: React.ReactNode[] = [];
	let run = '';
	let text = '';
	let onlyText = true;

	const flush = () => {
		if (!BLANK.test(run)) {
			nodes.push(
				<span key={`text-${nodes.length}`} className={className} dir="auto">
					{run}
				</span>,
			);
		}
		run = '';
	};

	for (const child of React.Children.toArray(children)) {
		if (typeof child === 'string' || typeof child === 'number') {
			run += child;
			text += child;
		} else {
			flush();
			nodes.push(child);
			onlyText = false;
		}
	}
	flush();

	return { nodes, text: onlyText ? text : undefined };
}

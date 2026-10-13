import React from 'react';

/**
 * Break-UI harness: every story that opts in with `parameters.breakUi` gets a
 * dev-only "Demo / Worst case / …" switch pinned to the bottom of the canvas.
 * The selection lives in the `dataset` Storybook global, so it persists in the
 * URL (`&globals=dataset:worst`) and stories swap fixtures at the data boundary.
 */
export type Dataset = 'demo' | 'worst' | 'empty' | 'one' | 'huge';

export const DATASET_LABELS: Record<Dataset, string> = {
	demo: 'Demo data',
	worst: 'Worst case',
	empty: 'Empty',
	one: 'One',
	huge: '1,000 rows',
};

export type BreakUiParameter = true | { states?: Dataset[] };

export function datasetStates(param: BreakUiParameter | undefined): Dataset[] {
	if (!param) return [];
	if (param === true || !param.states) return ['demo', 'worst'];
	return param.states;
}

/** Read the active dataset from a story context (`render: (args, ctx) => …`). */
export function getDataset(context: { globals: Record<string, unknown> }): Dataset {
	const value = context.globals.dataset as Dataset | undefined;
	return value ?? 'demo';
}

/**
 * Pick the fixture for the active dataset. States a story doesn't provide fall
 * back to `demo`, so a story can opt into only the states that make sense.
 */
export function pickDataset<T>(
	context: { globals: Record<string, unknown> },
	fixtures: { demo: T } & Partial<Record<Exclude<Dataset, 'demo'>, T>>,
): T {
	const dataset = getDataset(context);
	return (fixtures[dataset] ?? fixtures.demo) as T;
}

/** Bottom-center segmented control; plain chrome, not part of the design under test. */
export function BreakUiToggle({
	states,
	active,
	onSelect,
}: {
	states: Dataset[];
	active: Dataset;
	onSelect: (state: Dataset) => void;
}) {
	return React.createElement(
		'div',
		{
			'data-break-ui-toggle': '',
			role: 'radiogroup',
			'aria-label': 'Fixture dataset',
			style: {
				position: 'fixed',
				left: '50%',
				bottom: 12,
				transform: 'translateX(-50%)',
				zIndex: 2147483647,
				display: 'flex',
				gap: 2,
				padding: 3,
				borderRadius: 999,
				background: '#e5e5e5',
				boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
				font: '12px/1 system-ui, sans-serif',
				direction: 'ltr',
				pointerEvents: 'auto',
			},
		},
		states.map((state) =>
			React.createElement(
				'button',
				{
					key: state,
					type: 'button',
					role: 'radio',
					'aria-checked': active === state,
					'data-dataset': state,
					onClick: () => onSelect(state),
					style: {
						border: 0,
						borderRadius: 999,
						padding: '6px 10px',
						cursor: 'pointer',
						color: '#171717',
						background: active === state ? '#ffffff' : 'transparent',
						boxShadow: active === state ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
						font: 'inherit',
					},
				},
				DATASET_LABELS[state],
			),
		),
	);
}

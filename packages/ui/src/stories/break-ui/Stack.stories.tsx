import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/button';
import {
	CardStackProvider,
	CardStackViewport,
	useCardStack,
	type CardComponent,
	type CardSpec,
} from '../../components/stack';
import { getDataset, type Dataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Stack',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] },
	},
};
export default meta;

type DetailsProps = { rows: Array<[string, string]>; note?: string };

/** Card body: a label/value list plus a paragraph, the usual detail panel. */
const Details: CardComponent<DetailsProps> = ({ rows, note, card }) => (
	<div className="space-y-4 p-4" data-card-body={card.id}>
		<dl className="space-y-3 text-sm">
			{rows.map(([label, value]) => (
				<div key={label}>
					<dt className="text-xs text-muted-foreground">{label}</dt>
					<dd>{value}</dd>
				</div>
			))}
		</dl>
		{note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
	</div>
);

const demoCards: CardSpec[] = [
	{
		id: 'demo',
		title: 'Project',
		description: 'Acme',
		Component: Details as CardSpec['Component'],
		props: { rows: [['Owner', 'Jane Doe'], ['Email', 'jane@acme.com']] },
		width: 480,
	},
];

const worstCards: CardSpec[] = [
	{
		id: 'w1',
		title: identifiers.snakeIdentifier,
		description: identifiers.url,
		Component: Details as CardSpec['Component'],
		props: {
			rows: [
				['Owner', names.longHyphenated],
				['Email', emails.long],
				['Record', identifiers.uuid],
				['File', identifiers.cameraFile],
			],
			note: labels.longDescription,
		},
		width: 560,
	},
	{
		id: 'w2',
		title: identifiers.fileName,
		description: labels.longDescription,
		headerSize: 'lg',
		Component: Details as CardSpec['Component'],
		props: { rows: [['Owner', names.cjk], ['Email', emails.plus]], note: labels.french },
		width: 480,
	},
	{
		id: 'w3',
		title: '',
		description: names.vietnamese,
		headerSize: 'sm',
		Component: Details as CardSpec['Component'],
		props: { rows: [['Owner', names.rtl], ['Email', emails.subdomains]] },
		width: 420,
	},
];

const hugeCards: CardSpec[] = manyRows(12, (i): CardSpec => ({
	id: `h${i}`,
	title: `Level ${i + 1} · ${worstCards[i % worstCards.length].title || 'untitled'}`,
	description: `Depth ${i + 1} of 12`,
	Component: Details as CardSpec['Component'],
	props: { rows: [['Level', String(i + 1)]] },
	width: 420 + (i % 3) * 60,
}));

function Controls() {
	const stack = useCardStack();
	return (
		<div className="flex flex-wrap gap-2 p-4">
			<Button
				variant="outline"
				onClick={() =>
					stack.push({
						id: `pushed-${Date.now()}`,
						title: identifiers.cameraFile,
						description: emails.long,
						Component: Details as CardSpec['Component'],
						props: { rows: [['Owner', names.longSuffix]] },
						width: 440,
					})
				}
			>
				Push a card with an unbroken title
			</Button>
			<Button variant="outline" onClick={() => stack.clear()}>
				Clear
			</Button>
		</div>
	);
}

function cardsFor(dataset: Dataset): CardSpec[] {
	if (dataset === 'worst') return worstCards;
	if (dataset === 'one') return [worstCards[0]];
	if (dataset === 'huge') return hugeCards;
	if (dataset === 'empty') return [];
	return demoCards;
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const dataset = getDataset(context);
		return (
			<CardStackProvider key={dataset} layoutMode="cascade" defaultPeekOffset={32} initial={cardsFor(dataset)}>
				<Controls />
				<CardStackViewport peekDepth={3} renderEmpty={() => <p className="p-4 text-sm text-muted-foreground">Nothing open.</p>} />
			</CardStackProvider>
		);
	},
};

export const SideBySide: StoryObj = {
	render: (_args, context) => {
		const dataset = getDataset(context);
		return (
			<CardStackProvider key={dataset} layoutMode="side-by-side" defaultPeekOffset={48} initial={cardsFor(dataset)}>
				<Controls />
				<CardStackViewport peekDepth={3} />
			</CardStackProvider>
		);
	},
};

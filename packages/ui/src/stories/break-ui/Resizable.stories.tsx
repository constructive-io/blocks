import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/resizable';

const meta: Meta = {
	title: 'Break UI/Resizable',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Pane = { title: string; rows: string[] };

const demo: Pane[] = [
	{ title: 'Schema', rows: ['users', 'orders', 'invoices'] },
	{ title: 'Rows', rows: ['Jane Doe', 'Sam Lee', 'Priya Nair'] },
	{ title: 'Inspector', rows: ['id', 'email'] },
];

const worst: Pane[] = [
	{ title: labels.german, rows: manyRows(12, (index) => [identifiers.snakeIdentifier, identifiers.cameraFile, identifiers.fileName][index % 3]) },
	{ title: identifiers.fileName, rows: manyRows(12, (index) => [emails.long, names.longHyphenated, names.cjk, identifiers.url][index % 4]) },
	{ title: labels.french, rows: manyRows(12, (index) => [labels.status, names.rtl, identifiers.uuid][index % 3]) },
];

const huge: Pane[] = worst.map((pane) => ({ ...pane, rows: manyRows(1000, (index) => `${pane.rows[index % pane.rows.length]} ${index + 1}`) }));

function PaneBody({ pane }: { pane: Pane }) {
	return (
		<div className="flex h-full flex-col text-sm">
			<div className="border-b px-3 py-2 font-medium">{pane.title}</div>
			<ul className="min-h-0 flex-1 overflow-y-auto">
				{pane.rows.map((row, index) => (
					<li key={index} className="border-b px-3 py-1.5 last:border-b-0">
						{row}
					</li>
				))}
			</ul>
		</div>
	);
}

/** A three-pane workspace at page width, plus a two-pane split in a 280px column and a vertical split. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const panes = pickDataset<Pane[]>(context, {
			demo,
			worst,
			empty: demo.map((pane) => ({ ...pane, rows: [] })),
			one: [worst[0]],
			huge,
		});
		return (
			<div className="flex w-full flex-col gap-8">
				<div className="h-64 w-full rounded-md border" data-testid="three">
					<ResizablePanelGroup direction="horizontal">
						{panes.map((pane, index) => (
							<PanelWithHandle key={index} first={index === 0} pane={pane} size={even(index, panes.length)} />
						))}
					</ResizablePanelGroup>
				</div>
				<div style={{ width: 280, maxWidth: '100%' }} className="h-64 rounded-md border" data-testid="narrow">
					<ResizablePanelGroup direction="horizontal">
						{panes.slice(0, 2).map((pane, index, pair) => (
							<PanelWithHandle key={index} first={index === 0} pane={pane} size={even(index, pair.length)} />
						))}
					</ResizablePanelGroup>
				</div>
				<div className="h-72 w-full rounded-md border" data-testid="vertical">
					<ResizablePanelGroup direction="vertical">
						{panes.map((pane, index) => (
							<PanelWithHandle key={index} first={index === 0} pane={pane} size={even(index, panes.length)} />
						))}
					</ResizablePanelGroup>
				</div>
			</div>
		);
	},
};

/** Even split that sums to exactly 100: the last panel takes the rounding remainder. */
function even(index: number, count: number) {
	const base = Math.floor(100 / count);
	return index === count - 1 ? 100 - base * (count - 1) : base;
}

function PanelWithHandle({ pane, first, size }: { pane: Pane; first: boolean; size: number }) {
	return (
		<>
			{first ? null : <ResizableHandle withHandle />}
			<ResizablePanel defaultSize={size} minSize={10}>
				<PaneBody pane={pane} />
			</ResizablePanel>
		</>
	);
}

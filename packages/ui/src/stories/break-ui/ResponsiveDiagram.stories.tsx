import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';
import { ResponsiveDiagram } from '../../components/responsive-diagram';

const meta: Meta = {
	title: 'Break UI/ResponsiveDiagram',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Column = { title: string; labels: string[] };

const demo: Column[] = [
	{ title: 'Tables', labels: ['users', 'orders', 'products'] },
	{ title: 'Joins', labels: ['order_items', 'inventory'] },
	{ title: 'Logs', labels: ['audit_log'] },
];

// A schema diagram: table names are identifiers (no spaces), plus one translated column heading.
const worst: Column[] = [
	{ title: labels.german, labels: [identifiers.snakeIdentifier, identifiers.cameraFile, emails.long] },
	{ title: labels.french, labels: [names.cjk, identifiers.uuid, identifiers.snakeIdentifier + '_archive'] },
	{ title: 'Jo', labels: manyRows(6, (index) => `${identifiers.snakeIdentifier}_${index + 1}`) },
	{ title: names.longHyphenated, labels: [identifiers.fileName] },
];

const huge: Column[] = manyRows(40, (index) => ({ title: `Schema ${index + 1}`, labels: manyRows(8, (row) => `${identifiers.snakeIdentifier}_${index}_${row}`) }));

function Node({ label }: { label: string }) {
	return <div className="flex h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-md border bg-card px-3 text-sm">{label}</div>;
}

/** The diagram in a 480px card, a 280px column and full width; it scales to fit by transform only. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const columns = pickDataset<Column[]>(context, { demo, worst, empty: [], one: [demo[0]], huge });
		const diagram = (
			<ResponsiveDiagram className="rounded-md border bg-muted/30 p-4">
				<div className="flex items-start gap-8">
					{columns.map((column, index) => (
						<div key={index} className="flex flex-col gap-3">
							<span className="text-xs font-medium text-muted-foreground">{column.title}</span>
							{column.labels.map((label, row) => (
								<Node key={row} label={label} />
							))}
						</div>
					))}
				</div>
			</ResponsiveDiagram>
		);
		return (
			<div className="flex w-full flex-col gap-8">
				<div style={{ width: 480, maxWidth: '100%' }} data-testid="diagram-480">
					{diagram}
				</div>
				<div style={{ width: 280, maxWidth: '100%' }} data-testid="diagram-280">
					{diagram}
				</div>
				<div className="w-full" data-testid="diagram-full">
					{diagram}
				</div>
			</div>
		);
	},
};

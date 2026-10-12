import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names, numbers } from './worst-case';
import { Avatar, AvatarFallback } from '../../components/avatar';
import { Badge } from '../../components/badge';
import { Checkbox } from '../../components/checkbox';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableGroupRow,
	TableHead,
	TableHeader,
	TableRow,
} from '../../components/table';

const meta: Meta = {
	title: 'Break UI/Table',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Status = 'active' | 'invited' | 'expired' | 'suspended';
type Row = {
	id: string;
	name: string;
	email: string;
	role: string;
	status: Status;
	statusLabel: string;
	amount: number;
	updated: string;
	file: string;
};

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const statusVariant = { active: 'success', invited: 'info', expired: 'warning', suspended: 'error' } as const;

const demo: Row[] = [
	{ id: '1', name: 'Jane Doe', email: 'jane@acme.com', role: 'Designer', status: 'active', statusLabel: 'Active', amount: 250, updated: 'Jun 24, 2026', file: 'report.pdf' },
	{ id: '2', name: 'Sam Lee', email: 'sam@acme.com', role: 'Engineer', status: 'invited', statusLabel: 'Invited', amount: 150, updated: 'Jun 23, 2026', file: 'budget.xlsx' },
	{ id: '3', name: 'Priya Nair', email: 'priya@acme.com', role: 'PM', status: 'expired', statusLabel: 'Expired', amount: 350, updated: 'Jun 20, 2026', file: 'notes.md' },
];

// Failures are spread across rows, like real data: long name, long email, long title, huge/negative/float amounts, badge copy that got translated.
const worst: Row[] = [
	{ id: '1', name: names.longHyphenated, email: emails.long, role: labels.jobTitle, status: 'active', statusLabel: 'Active', amount: numbers.currency, updated: 'Jun 24, 2026', file: identifiers.fileName },
	{ id: '2', name: names.twoLetters, email: emails.short, role: 'Jo', status: 'invited', statusLabel: labels.status, amount: numbers.negative, updated: '—', file: identifiers.cameraFile },
	{ id: '3', name: names.longSuffix, email: emails.plus, role: '', status: 'expired', statusLabel: 'Abgelaufen vor 12 Tagen', amount: numbers.floatError, updated: 'Dec 31, 2025, 11:30 PM', file: identifiers.snakeIdentifier + '.csv' },
	{ id: '4', name: names.rtl, email: emails.subdomains, role: labels.french, status: 'suspended', statusLabel: 'Suspended', amount: 0, updated: 'Jan 1, 1970', file: identifiers.uuid },
	{ id: '5', name: names.cjk, email: identifiers.url, role: names.emojiFirst, status: 'active', statusLabel: 'Active', amount: 1_000_000_000, updated: 'Jun 24, 2026', file: labels.german },
];

const huge: Row[] = manyRows(1000, (index) => ({ ...worst[index % worst.length], id: `r${index}`, name: `${worst[index % worst.length].name} ${index + 1}` }));

/** A people/billing table in a 480px card and at page width, plus one that truncates a long column. Cells never wrap, so the wrapper scrolls. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const rows = pickDataset<Row[]>(context, { demo, worst, empty: [], one: [worst[0]], huge });
		const total = rows.reduce((sum, row) => sum + row.amount, 0);
		const table = () => (
			<Table>
				<TableCaption>{labels.french}</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead>
							<Checkbox aria-label="Select all" />
						</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>File</TableHead>
						<TableHead>Updated</TableHead>
						<TableHead className="text-right">Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.length > 0 ? (
						<TableGroupRow colSpan={7}>{labels.german}</TableGroupRow>
					) : null}
					{rows.map((row) => (
						<TableRow key={row.id}>
							<TableCell>
								<Checkbox aria-label={`Select ${row.name}`} />
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<Avatar>
										<AvatarFallback>{row.name.slice(0, 2).toUpperCase()}</AvatarFallback>
									</Avatar>
									<div className="flex flex-col">
										<span className="font-medium">{row.name}</span>
										<span className="text-xs text-muted-foreground">{row.email}</span>
									</div>
								</div>
							</TableCell>
							<TableCell>{row.role}</TableCell>
							<TableCell>
								<Badge variant={statusVariant[row.status]}>{row.statusLabel}</Badge>
							</TableCell>
							<TableCell className="font-mono text-xs">{row.file}</TableCell>
							<TableCell>{row.updated}</TableCell>
							<TableCell className="text-right tabular-nums">{money.format(row.amount)}</TableCell>
						</TableRow>
					))}
				</TableBody>
				<TableFooter>
					<TableRow>
						<TableCell colSpan={6}>Total</TableCell>
						<TableCell className="text-right tabular-nums">{money.format(total)}</TableCell>
					</TableRow>
				</TableFooter>
			</Table>
		);
		// The opt-in `truncate` cell: one long value gives up its tail instead of widening the whole table.
		const truncating = (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-1/2">Name</TableHead>
						<TableHead className="w-1/2">File</TableHead>
						<TableHead className="text-right">Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.slice(0, 8).map((row) => (
						<TableRow key={row.id}>
							<TableCell truncate title={row.name}>
								{row.name}
							</TableCell>
							<TableCell truncate title={row.file} className="font-mono text-xs">
								{row.file}
							</TableCell>
							<TableCell className="text-right tabular-nums">{money.format(row.amount)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
		return (
			<div className="flex w-full flex-col gap-8">
				<div style={{ width: 480, maxWidth: '100%' }} className="rounded-lg border" data-testid="truncating">
					{truncating}
				</div>
				<div style={{ width: 480, maxWidth: '100%' }} className="rounded-lg border" data-testid="narrow">
					{table()}
				</div>
				<div className="w-full rounded-lg border" data-testid="wide">
					{table()}
				</div>
			</div>
		);
	},
};

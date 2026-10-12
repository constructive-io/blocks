import type { Meta, StoryObj } from '@storybook/react-vite';

import { Progress } from '../../components/progress';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { numbers } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Progress',
	parameters: { breakUi: true },
};
export default meta;

type Row = { note: string; value: number | null | undefined; shown?: string };

const demo: Row[] = [
	{ note: 'Storage', value: 60, shown: '60%' },
];

// Values a quota or upload calculation really produces: over-quota, refunds, divide-by-zero, floats, no data yet.
const worst: Row[] = [
	{ note: 'zero', value: numbers.zero, shown: '0%' },
	{ note: 'one', value: numbers.one, shown: '1%' },
	{ note: 'half', value: 50, shown: '50%' },
	{ note: 'full', value: 100, shown: '100%' },
	{ note: 'over quota', value: numbers.overPercent, shown: '142%' },
	{ note: 'negative (refund / underflow)', value: numbers.underPercent, shown: '-3%' },
	{ note: 'NaN (0 / 0)', value: Number.NaN, shown: 'NaN%' },
	{ note: 'Infinity (n / 0)', value: Number.POSITIVE_INFINITY, shown: 'Infinity%' },
	{ note: 'null (indeterminate)', value: null, shown: '—' },
	{ note: 'undefined (not loaded)', value: undefined, shown: '—' },
	{ note: 'float noise 0.1 + 0.2', value: numbers.floatError, shown: String(numbers.floatError) },
	{ note: 'just under full', value: 99.999, shown: '99.999%' },
	{ note: 'huge', value: 1_000_000, shown: '1000000%' },
];

export const Stress: StoryObj = {
	render: (_args, context) => {
		const rows = pickDataset(context, { demo, worst });

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={280} label="Progress bars in a 280px card">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 8 }}>
						{rows.map((row) => (
							<div key={row.note} data-progress-row={row.note}>
								<div className="mb-1 flex justify-between text-xs text-muted-foreground">
									<span>{row.note}</span>
									<span className="tabular-nums">{row.shown}</span>
								</div>
								<Progress value={row.value as number} />
							</div>
						))}
					</div>
				</Frame>

				{rows === worst ? (
					<Frame width={280} label="max = 0 and min > max (bad bounds)">
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 8 }}>
							<div data-progress-row="max0">
								<div className="mb-1 text-xs text-muted-foreground">value 5, max 0</div>
								<Progress value={5} max={0} />
							</div>
							<div data-progress-row="range">
								<div className="mb-1 text-xs text-muted-foreground">value 5, min 10, max 20</div>
								<Progress value={5} min={10} max={20} />
							</div>
						</div>
					</Frame>
				) : null}
			</div>
		);
	},
};

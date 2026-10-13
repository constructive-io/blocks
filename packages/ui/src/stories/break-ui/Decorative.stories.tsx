import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { identifiers, manyRows, names } from './worst-case';
import { FlickeringGrid } from '../../components/flickering-grid';
import { MotionGrid } from '../../components/motion-grid';
import { ProgressiveBlur } from '../../components/progressive-blur';
import { ProgressiveBlurScrollContainer } from '../../components/progressive-blur-scroll-container';

const meta: Meta = {
	title: 'Break UI/Decorative',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Fixture = {
	rows: string[];
	grid: [number, number];
	/** Width and height of the box the flickering grid fills. */
	box: [number, number];
	/** What the scroll container is told about its content. */
	itemCount: number;
};

const pool = [identifiers.cameraFile, identifiers.fileName, names.longHyphenated, names.cjk];

const demo: Fixture = { rows: ['Jane Doe', 'Sam Lee', 'Priya Nair', 'Alex Morgan', 'Maya Chen', 'Theo Brooks', 'Rosa Alvarez', 'Noa Levi'], grid: [8, 4], box: [320, 160], itemCount: 8 };
const worst: Fixture = { rows: manyRows(40, (index) => pool[index % pool.length]), grid: [40, 20], box: [1280, 640], itemCount: 40 };
const huge: Fixture = { rows: manyRows(1000, (index) => `${pool[index % pool.length]} ${index + 1}`), grid: [60, 30], box: [2560, 1440], itemCount: 1000 };

/** Four decorative pieces, each in the box a page would give it. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const fixture = pickDataset<Fixture>(context, {
			demo,
			worst,
			empty: { ...demo, rows: [], grid: [0, 0], box: [0, 0], itemCount: 0 },
			one: { ...demo, rows: [demo.rows[0]], grid: [1, 1], box: [24, 24], itemCount: 1 },
			huge,
		});
		return (
			<div className="flex flex-col gap-8">
				{/* 1. Blur on a short scroll area: plain, and with the footgun (`minItemsForBlur` without `itemCount`). */}
				<div className="flex flex-wrap gap-6">
					<div className="flex h-56 w-72 flex-col rounded-md border" data-testid="blur-ok">
						<ProgressiveBlurScrollContainer itemCount={fixture.itemCount} minItemsForBlur={5}>
							<ul>
								{fixture.rows.map((row, index) => (
									<li key={index} className="border-b px-3 py-2 text-sm whitespace-nowrap">
										{row}
									</li>
								))}
							</ul>
						</ProgressiveBlurScrollContainer>
					</div>
					<div className="flex h-56 w-72 flex-col rounded-md border" data-testid="blur-footgun">
						<ProgressiveBlurScrollContainer minItemsForBlur={5}>
							<ul>
								{fixture.rows.map((row, index) => (
									<li key={index} className="border-b px-3 py-2 text-sm whitespace-nowrap">
										{row}
									</li>
								))}
							</ul>
						</ProgressiveBlurScrollContainer>
					</div>
					<div className="relative h-56 w-72 overflow-hidden rounded-md border" data-testid="blur-both">
						<ul>
							{fixture.rows.slice(0, 12).map((row, index) => (
								<li key={index} className="border-b px-3 py-2 text-sm whitespace-nowrap">
									{row}
								</li>
							))}
						</ul>
						<ProgressiveBlur position="both" blurPx={0} intensity={2} />
					</div>
				</div>

				{/* 2. The loading grid. */}
				<div style={{ maxWidth: '100%' }} className="overflow-visible" data-testid="motion-grid-box">
					<MotionGrid gridSize={fixture.grid} />
				</div>

				{/* 3. A flickering background that fills a hero. */}
				<div style={{ width: fixture.box[0], height: fixture.box[1], maxWidth: '100%' }} className="relative overflow-hidden rounded-md border" data-testid="flicker-box">
					<FlickeringGrid />
				</div>
			</div>
		);
	},
};

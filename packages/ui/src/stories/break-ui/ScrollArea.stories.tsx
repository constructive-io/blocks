import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';
import { ScrollArea } from '../../components/scroll-area';

const meta: Meta = {
	title: 'Break UI/ScrollArea',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const demo = ['Jane Doe', 'Sam Lee', 'Priya Nair', 'Alex Morgan', 'Maya Chen', 'Theo Brooks'];

const worstPool = [
	identifiers.cameraFile,
	identifiers.fileName,
	emails.long,
	labels.french,
	names.longHyphenated,
	names.cjk,
	identifiers.url,
	names.zwjEmoji,
];
const worst = manyRows(30, (index) => worstPool[index % worstPool.length]);
const huge = manyRows(5000, (index) => `${worstPool[index % worstPool.length]} ${index + 1}`);

/** Three ScrollArea options in 280x200 boxes: plain, fade masks, and a scrollbar gutter. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const rows = pickDataset<string[]>(context, { demo, worst, empty: [], one: [worst[0]], huge });
		const list = (
			<ul className="flex flex-col text-sm">
				{rows.map((row, index) => (
					<li key={index} className="border-b px-3 py-2 whitespace-nowrap last:border-b-0">
						{row}
					</li>
				))}
			</ul>
		);
		const box = (testId: string, title: string, props: { scrollFade?: boolean; scrollbarGutter?: boolean }) => (
			<div className="flex flex-col gap-1">
				<span className="text-xs text-muted-foreground">{title}</span>
				<div style={{ width: 280, height: 200, maxWidth: '100%' }} className="rounded-md border" data-testid={testId}>
					<ScrollArea {...props}>{list}</ScrollArea>
				</div>
			</div>
		);
		return (
			<div className="flex flex-wrap items-start gap-6">
				{box('plain', 'Default', {})}
				{box('fade', 'scrollFade', { scrollFade: true })}
				{box('gutter', 'scrollbarGutter', { scrollbarGutter: true })}
			</div>
		);
	},
};

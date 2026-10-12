import type { Meta, StoryObj } from '@storybook/react-vite';
import { getDataset, pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/accordion';
import {
	Collapsible,
	CollapsibleIcon,
	CollapsiblePanel,
	CollapsibleTrigger,
} from '../../components/collapsible';

const meta: Meta = {
	title: 'Break UI/Accordion and Collapsible',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Section = { value: string; trigger: string; body: string };

const demo: Section[] = [
	{ value: 'a', trigger: 'Is it accessible?', body: 'Yes. It adheres to the WAI-ARIA design pattern.' },
	{ value: 'b', trigger: 'Is it styled?', body: 'Yes. It comes with default styles that match the other components.' },
	{ value: 'c', trigger: 'Is it animated?', body: 'Yes. It is animated by default.' },
];

// Triggers are questions, file names and translated headings; bodies carry pasted text, URLs and identifiers.
const worst: Section[] = [
	{ value: 'a', trigger: identifiers.cameraFile, body: `${identifiers.url}` },
	{ value: 'b', trigger: labels.french, body: labels.longDescription },
	{ value: 'c', trigger: emails.long, body: `${emails.long} ${identifiers.uuid} ${identifiers.snakeIdentifier}` },
	{ value: 'd', trigger: 'Jo', body: names.vietnamese },
	{ value: 'e', trigger: `${names.longHyphenated}, ${names.longSuffix}, ${names.compound} and 1,284 others`, body: names.rtl },
	{ value: 'f', trigger: labels.german, body: labels.markup },
];

const huge: Section[] = manyRows(1000, (index) => ({
	value: `s${index}`,
	trigger: `${identifiers.snakeIdentifier} ${index + 1}`,
	body: `Body ${index + 1}`,
}));

/** Accordion (one open at a time) and a stack of collapsibles, in a 280px column and at page width. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const sections = pickDataset<Section[]>(context, { demo, worst, empty: [], one: [demo[0]], huge });
		// The first section starts open so the panel's own overflow is visible without a click.
		const open = sections.slice(0, 1).map((section) => section.value);
		const dataset = getDataset(context);
		// `defaultValue` is read once, so each dataset gets a fresh uncontrolled Accordion.
		const accordion = (testId: string) => (
			<Accordion key={dataset} defaultValue={open} data-testid={testId}>
				{sections.map((section) => (
					<AccordionItem key={section.value} value={section.value}>
						<AccordionTrigger>{section.trigger}</AccordionTrigger>
						<AccordionContent>{section.body}</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		);
		const collapsibles = (testId: string) => (
			<div className="flex flex-col" data-testid={testId}>
				{sections.slice(0, 40).map((section, index) => (
					<Collapsible key={section.value} defaultOpen={index === 0}>
						<CollapsibleTrigger className="gap-2 py-2">
							<span>{section.trigger}</span>
							<CollapsibleIcon />
						</CollapsibleTrigger>
						<CollapsiblePanel>{section.body}</CollapsiblePanel>
					</Collapsible>
				))}
			</div>
		);
		return (
			<div className="flex w-full flex-col gap-8">
				<div style={{ width: 280, maxWidth: '100%' }} className="outline outline-1 outline-dashed outline-border" data-testid="narrow">
					{accordion('accordion-narrow')}
					<div className="mt-6">{collapsibles('collapsible-narrow')}</div>
				</div>
				<div className="w-full outline outline-1 outline-dashed outline-border" data-testid="wide">
					{accordion('accordion-wide')}
				</div>
			</div>
		);
	},
};

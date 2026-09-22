import type { Meta, StoryObj } from '@storybook/react-vite';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/accordion';

const meta: Meta<typeof Accordion> = {
	title: 'UI/Accordion',
	component: Accordion,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const FAQ = [
	{
		q: 'What counts as a compute hour?',
		a: 'One hour of an active compute unit serving requests. Paused projects accrue nothing.',
	},
	{
		q: 'Can I pause a project?',
		a: 'Yes — projects on the free plan pause after 7 days of inactivity, or on demand.',
	},
	{
		q: 'How do read replicas bill?',
		a: 'Each replica bills as its own compute size plus the storage it holds.',
	},
];

export const Default: Story = {
	render: () => (
		<div className='w-96'>
			<Accordion defaultValue={['item-0']}>
				{FAQ.map((f, i) => (
					<AccordionItem key={f.q} value={`item-${i}`}>
						<AccordionTrigger>{f.q}</AccordionTrigger>
						<AccordionContent>{f.a}</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	),
};

export const Multiple: Story = {
	render: () => (
		<div className='w-96'>
			<Accordion multiple>
				{FAQ.map((f, i) => (
					<AccordionItem key={f.q} value={`item-${i}`}>
						<AccordionTrigger>{f.q}</AccordionTrigger>
						<AccordionContent>{f.a}</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	),
};

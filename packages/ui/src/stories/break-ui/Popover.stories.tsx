import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, names } from './worst-case';
import { Button } from '../../components/button';
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '../../components/popover';

const meta: Meta = {
	title: 'Break UI/Popover',
	// Fullscreen so the triggers can sit at the left and right edges of the viewport.
	parameters: { layout: 'fullscreen', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Person = { name: string; detail: string };

const worstPeople: Person[] = [
	{ name: names.longHyphenated, detail: emails.long },
	{ name: names.longSuffix, detail: emails.plus },
	{ name: names.twoLetters, detail: emails.short },
	{ name: names.vietnamese, detail: identifiers.url },
	{ name: names.emojiFirst, detail: identifiers.uuid },
	{ name: names.particles, detail: emails.subdomains },
];

type Copy = { title: string; description: string; people: Person[] };

const demo: Copy = {
	title: 'Dimensions',
	description: 'Set the dimensions for the layer.',
	people: [
		{ name: 'Jane Doe', detail: 'jane@acme.com' },
		{ name: 'Sam Lee', detail: 'sam@acme.com' },
	],
};

const worst: Copy = {
	title: emails.long,
	description: `${identifiers.url} ${labels.longDescription}`,
	people: Array.from({ length: 40 }, (_, index) => worstPeople[index % worstPeople.length]),
};

function PeopleList({ people }: { people: Person[] }) {
	if (people.length === 0) return <p className="text-sm text-muted-foreground">Nobody yet.</p>;
	return (
		<ul className="mt-2 flex flex-col">
			{people.map((person, index) => (
				<li key={index} className="flex flex-col border-b py-1.5 text-sm last:border-b-0">
					<span className="font-medium">{person.name}</span>
					<span className="text-muted-foreground">{person.detail}</span>
				</li>
			))}
		</ul>
	);
}

/** Triggers at the left edge, center, and right edge; each opens the same content. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const copy = pickDataset<Copy>(context, {
			demo,
			worst,
			empty: { ...demo, people: [] },
			one: { ...demo, people: [demo.people[0]] },
			huge: { ...worst, people: Array.from({ length: 1000 }, (_, index) => worstPeople[index % worstPeople.length]) },
		});
		const content = (
			<>
				<PopoverTitle>{copy.title}</PopoverTitle>
				<PopoverDescription>{copy.description}</PopoverDescription>
				<PeopleList people={copy.people} />
			</>
		);
		return (
			<div className="flex min-h-[420px] w-full items-start justify-between gap-2 p-2">
				<Popover>
					<PopoverTrigger asChild>
						<Button data-testid="open-left" variant="outline" size="sm">Left</Button>
					</PopoverTrigger>
					<PopoverContent align="start">{content}</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild>
						<Button data-testid="open-center" variant="outline" size="sm">Center</Button>
					</PopoverTrigger>
					<PopoverContent>{content}</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild>
						<Button data-testid="open-right" variant="outline" size="sm">Right</Button>
					</PopoverTrigger>
					<PopoverContent align="end">{content}</PopoverContent>
				</Popover>
			</div>
		);
	},
};

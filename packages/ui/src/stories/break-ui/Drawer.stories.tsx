import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, names } from './worst-case';
import { Button } from '../../components/button';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../../components/drawer';

const meta: Meta = {
	title: 'Break UI/Drawer',
	parameters: { layout: 'centered', breakUi: true },
};
export default meta;

type DrawerCopy = {
	title: string;
	description: string;
	rows: { name: string; detail: string }[];
	cancel: string;
	confirm: string;
};

const demo: DrawerCopy = {
	title: 'Move goal',
	description: 'Set your daily activity goal.',
	rows: [
		{ name: 'Jane Doe', detail: 'jane@acme.com' },
		{ name: 'Sam Lee', detail: 'sam@acme.com' },
	],
	cancel: 'Cancel',
	confirm: 'Submit',
};

const worstPeople = [
	{ name: names.longHyphenated, detail: emails.long },
	{ name: names.longSuffix, detail: emails.plus },
	{ name: names.twoLetters, detail: emails.short },
	{ name: names.vietnamese, detail: identifiers.url },
	{ name: names.emojiFirst, detail: identifiers.uuid },
	{ name: names.particles, detail: emails.subdomains },
];

const worst: DrawerCopy = {
	title: identifiers.cameraFile,
	description: `${identifiers.url} ${labels.longDescription}`,
	rows: Array.from({ length: 30 }, (_, index) => worstPeople[index % worstPeople.length]),
	cancel: 'Änderungen verwerfen',
	confirm: 'Benachrichtigungseinstellungen speichern',
};

/** Each trigger opens one drawer direction; ids are stable so a test can click them. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const copy = pickDataset(context, { demo, worst });
		const body = (
			<ul className="flex flex-col px-4">
				{copy.rows.map((row, index) => (
					<li key={index} className="flex flex-col border-b py-2 text-sm last:border-b-0">
						<span className="font-medium">{row.name}</span>
						<span className="text-muted-foreground">{row.detail}</span>
					</li>
				))}
			</ul>
		);
		const footer = (
			<DrawerFooter>
				<Button>{copy.confirm}</Button>
				<DrawerClose asChild>
					<Button variant="outline">{copy.cancel}</Button>
				</DrawerClose>
			</DrawerFooter>
		);
		const header = (
			<DrawerHeader>
				<DrawerTitle>{copy.title}</DrawerTitle>
				<DrawerDescription>{copy.description}</DrawerDescription>
			</DrawerHeader>
		);
		return (
			<div className="flex w-full flex-col items-start gap-3">
				<Drawer>
					<DrawerTrigger asChild>
						<Button data-testid="open-bottom" variant="outline">Bottom drawer</Button>
					</DrawerTrigger>
					<DrawerContent>
						{header}
						{body}
						{footer}
					</DrawerContent>
				</Drawer>

				<Drawer direction="right">
					<DrawerTrigger asChild>
						<Button data-testid="open-right" variant="outline">Right drawer</Button>
					</DrawerTrigger>
					<DrawerContent>
						{header}
						{body}
						{footer}
					</DrawerContent>
				</Drawer>

				<Drawer direction="left">
					<DrawerTrigger asChild>
						<Button data-testid="open-left" variant="outline">Left drawer</Button>
					</DrawerTrigger>
					<DrawerContent>
						{header}
						{body}
						{footer}
					</DrawerContent>
				</Drawer>

				<Drawer direction="top">
					<DrawerTrigger asChild>
						<Button data-testid="open-top" variant="outline">Top drawer</Button>
					</DrawerTrigger>
					<DrawerContent>
						{header}
						{body}
						{footer}
					</DrawerContent>
				</Drawer>
			</div>
		);
	},
};

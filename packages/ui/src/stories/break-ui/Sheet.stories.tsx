import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, names } from './worst-case';
import { Button } from '../../components/button';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../../components/sheet';

const meta: Meta = {
	title: 'Break UI/Sheet',
	parameters: { layout: 'centered', breakUi: true },
};
export default meta;

type SheetCopy = {
	title: string;
	description: string;
	rows: { name: string; detail: string }[];
	cancel: string;
	confirm: string;
};

const demo: SheetCopy = {
	title: 'Edit profile',
	description: 'Make changes to your profile here.',
	rows: [
		{ name: 'Jane Doe', detail: 'jane@acme.com' },
		{ name: 'Sam Lee', detail: 'sam@acme.com' },
		{ name: 'Priya Nair', detail: 'priya@acme.com' },
	],
	cancel: 'Cancel',
	confirm: 'Save',
};

const worstPeople = [
	{ name: names.longHyphenated, detail: emails.long },
	{ name: names.longSuffix, detail: emails.plus },
	{ name: names.twoLetters, detail: emails.short },
	{ name: names.rtl, detail: emails.subdomains },
	{ name: names.vietnamese, detail: emails.plus },
	{ name: names.cjk, detail: identifiers.url },
	{ name: names.emojiFirst, detail: identifiers.uuid },
	{ name: names.particles, detail: emails.long },
];

const worst: SheetCopy = {
	title: identifiers.cameraFile,
	description: `Anyone with ${identifiers.url} can comment. ${labels.longDescription}`,
	rows: Array.from({ length: 32 }, (_, index) => worstPeople[index % worstPeople.length]),
	cancel: 'Änderungen verwerfen',
	confirm: 'Benachrichtigungseinstellungen speichern',
};

function Rows({ rows }: { rows: SheetCopy['rows'] }) {
	return (
		<ul className="flex flex-col">
			{rows.map((row, index) => (
				<li key={index} className="flex flex-col border-b py-2 text-sm last:border-b-0">
					<span className="font-medium">{row.name}</span>
					<span className="text-muted-foreground">{row.detail}</span>
				</li>
			))}
		</ul>
	);
}

/** Each trigger opens one sheet shape; ids are stable so a test can click them. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const copy = pickDataset(context, { demo, worst });
		return (
			<div className="flex w-full flex-col items-start gap-3">
				{/* 1. Default right sheet, plain composition: header, rows, footer. */}
				<Sheet>
					<SheetTrigger asChild>
						<Button data-testid="open-right" variant="outline">Right sheet</Button>
					</SheetTrigger>
					<SheetContent>
						<SheetHeader>
							<SheetTitle>{copy.title}</SheetTitle>
							<SheetDescription>{copy.description}</SheetDescription>
						</SheetHeader>
						<Rows rows={copy.rows} />
						<SheetFooter>
							<SheetClose asChild>
								<Button wrap variant="outline">{copy.cancel}</Button>
							</SheetClose>
							<SheetClose asChild>
								<Button wrap>{copy.confirm}</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>

				{/* 2. Band header and footer. */}
				<Sheet>
					<SheetTrigger asChild>
						<Button data-testid="open-band" variant="outline">Banded sheet</Button>
					</SheetTrigger>
					<SheetContent>
						<SheetHeader variant="band">
							<SheetTitle>{copy.title}</SheetTitle>
							<SheetDescription>{copy.description}</SheetDescription>
						</SheetHeader>
						<Rows rows={copy.rows} />
						<SheetFooter variant="band">
							<SheetClose asChild>
								<Button wrap variant="outline">{copy.cancel}</Button>
							</SheetClose>
							<SheetClose asChild>
								<Button wrap>{copy.confirm}</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>

				{/* 3. Left sheet. */}
				<Sheet>
					<SheetTrigger asChild>
						<Button data-testid="open-left" variant="outline">Left sheet</Button>
					</SheetTrigger>
					<SheetContent side="left">
						<SheetHeader>
							<SheetTitle>{copy.title}</SheetTitle>
							<SheetDescription>{copy.description}</SheetDescription>
						</SheetHeader>
						<Rows rows={copy.rows} />
					</SheetContent>
				</Sheet>

				{/* 4. Bottom sheet. */}
				<Sheet>
					<SheetTrigger asChild>
						<Button data-testid="open-bottom" variant="outline">Bottom sheet</Button>
					</SheetTrigger>
					<SheetContent side="bottom">
						<SheetHeader>
							<SheetTitle>{copy.title}</SheetTitle>
							<SheetDescription>{copy.description}</SheetDescription>
						</SheetHeader>
						<Rows rows={copy.rows} />
						<SheetFooter>
							<SheetClose asChild>
								<Button wrap>{copy.confirm}</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>

				{/* 5. Top sheet. */}
				<Sheet>
					<SheetTrigger asChild>
						<Button data-testid="open-top" variant="outline">Top sheet</Button>
					</SheetTrigger>
					<SheetContent side="top">
						<SheetHeader>
							<SheetTitle>{copy.title}</SheetTitle>
							<SheetDescription>{copy.description}</SheetDescription>
						</SheetHeader>
						<Rows rows={copy.rows} />
					</SheetContent>
				</Sheet>
			</div>
		);
	},
};

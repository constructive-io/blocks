import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels } from './worst-case';
import { Button } from '../../components/button';
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from '../../components/dialog';

const meta: Meta = {
	title: 'Break UI/Dialog',
	parameters: { layout: 'centered', breakUi: true },
};
export default meta;

type DialogCopy = {
	title: string;
	/** A title made of ordinary words, so the first line fills the header and meets the close button. */
	wordsTitle: string;
	description: string;
	rows: string[];
	cancel: string;
	confirm: string;
};

const demo: DialogCopy = {
	title: 'Remove member?',
	wordsTitle: 'Delete 3 members?',
	description: 'They will lose access to this workspace immediately.',
	rows: ['Q3 Board Deck.pdf', 'Roadmap.md', 'Budget.xlsx'],
	cancel: 'Cancel',
	confirm: 'Remove',
};

// Titles built from data ("Remove {email}?") are the common way a dialog title gets long.
const worst: DialogCopy = {
	title: `Remove ${emails.long} from the workspace?`,
	wordsTitle: 'Permanently delete all 1,284 members and their data from Northwind Industries?',
	description: `Their access to ${identifiers.url} ends immediately. ${labels.longDescription}`,
	rows: Array.from({ length: 28 }, (_, index) =>
		index % 3 === 0
			? identifiers.fileName
			: index % 3 === 1
				? identifiers.cameraFile
				: identifiers.snakeIdentifier + '.csv',
	),
	// A real German + French pair for "Discard changes" / "Save notification settings".
	cancel: 'Änderungen verwerfen',
	confirm: 'Benachrichtigungseinstellungen speichern',
};

function Row({ children }: { children: React.ReactNode }) {
	return <li className="border-b py-2 text-sm last:border-b-0">{children}</li>;
}

/** Each trigger opens one dialog shape; ids are stable so a test can click them. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const copy = pickDataset(context, { demo, worst });
		return (
			<div className="flex w-full flex-col items-start gap-3">
				{/* 1. Title + description only (a confirmation). */}
				<Dialog>
					<DialogTrigger asChild>
						<Button data-testid="open-title" variant="outline">Long title</Button>
					</DialogTrigger>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>{copy.title}</DialogTitle>
							<DialogDescription>{copy.description}</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">{copy.cancel}</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button>{copy.confirm}</Button>
							</DialogClose>
						</DialogFooter>
					</DialogPopup>
				</Dialog>

				{/* 1b. Ordinary words that wrap: does line one run under the close button? */}
				<Dialog>
					<DialogTrigger asChild>
						<Button data-testid="open-words" variant="outline">Long title (words)</Button>
					</DialogTrigger>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>{copy.wordsTitle}</DialogTitle>
							<DialogDescription>This cannot be undone.</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">{demo.cancel}</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button>Delete</Button>
							</DialogClose>
						</DialogFooter>
					</DialogPopup>
				</Dialog>

				{/* 2. Header + scrolling panel + footer: footer must stay reachable. */}
				<Dialog>
					<DialogTrigger asChild>
						<Button data-testid="open-body" variant="outline">Long body</Button>
					</DialogTrigger>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>Affected files</DialogTitle>
							<DialogDescription>{copy.description}</DialogDescription>
						</DialogHeader>
						<DialogPanel>
							<ul>
								{copy.rows.map((row, index) => (
									<Row key={index}>{row}</Row>
								))}
							</ul>
						</DialogPanel>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">{copy.cancel}</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button>{copy.confirm}</Button>
							</DialogClose>
						</DialogFooter>
					</DialogPopup>
				</Dialog>

				{/* 3. Footer only matters: translated labels, three actions. */}
				<Dialog>
					<DialogTrigger asChild>
						<Button data-testid="open-footer" variant="outline">Long footer labels</Button>
					</DialogTrigger>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>Notifications</DialogTitle>
							<DialogDescription>Choose how you hear about activity.</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="ghost">{labels.german}</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button variant="outline">{copy.cancel}</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button>{copy.confirm}</Button>
							</DialogClose>
						</DialogFooter>
					</DialogPopup>
				</Dialog>

				{/* 4. Band header variant + bare footer. */}
				<Dialog>
					<DialogTrigger asChild>
						<Button data-testid="open-band" variant="outline">Band header</Button>
					</DialogTrigger>
					<DialogPopup>
						<DialogHeader variant="band">
							<DialogTitle>{copy.title}</DialogTitle>
							<DialogDescription>{labels.french}</DialogDescription>
						</DialogHeader>
						<DialogPanel>
							<p className="text-sm">{copy.description}</p>
						</DialogPanel>
						<DialogFooter variant="bare">
							<DialogClose asChild>
								<Button variant="outline">{copy.cancel}</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button>{copy.confirm}</Button>
							</DialogClose>
						</DialogFooter>
					</DialogPopup>
				</Dialog>

				{/* 5. Not a bottom sheet on mobile. */}
				<Dialog>
					<DialogTrigger asChild>
						<Button data-testid="open-centered" variant="outline">Centered on mobile</Button>
					</DialogTrigger>
					<DialogPopup bottomStickOnMobile={false}>
						<DialogHeader>
							<DialogTitle>{copy.title}</DialogTitle>
							<DialogDescription>{copy.description}</DialogDescription>
						</DialogHeader>
						<DialogPanel>
							<ul>
								{copy.rows.map((row, index) => (
									<Row key={index}>{row}</Row>
								))}
							</ul>
						</DialogPanel>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">{copy.cancel}</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button>{copy.confirm}</Button>
							</DialogClose>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
			</div>
		);
	},
};

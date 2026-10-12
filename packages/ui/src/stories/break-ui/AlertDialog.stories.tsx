import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels } from './worst-case';
import { Button } from '../../components/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../../components/alert-dialog';

const meta: Meta = {
	title: 'Break UI/AlertDialog',
	parameters: { layout: 'centered', breakUi: true },
};
export default meta;

type AlertCopy = {
	title: string;
	/** Quoted data in the sentence, like the storage kit's delete confirmation. */
	subject: string;
	long: string;
	cancel: string;
	confirm: string;
};

const demo: AlertCopy = {
	title: 'Delete this file?',
	subject: 'report.pdf',
	long: 'This action cannot be undone.',
	cancel: 'Cancel',
	confirm: 'Delete',
};

const worst: AlertCopy = {
	title: `Remove ${emails.long}?`,
	subject: identifiers.cameraFile,
	long: labels.longDescription,
	cancel: 'Änderungen verwerfen',
	confirm: 'Benachrichtigungseinstellungen speichern',
};

/** Each trigger opens one confirmation shape; ids are stable so a test can click them. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const copy = pickDataset(context, { demo, worst });
		return (
			<div className="flex w-full flex-col items-start gap-3">
				{/* 1. The delete confirmation shape used by the storage detail sheet. */}
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button data-testid="open-subject" variant="outline">Quoted file name</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{demo.title}</AlertDialogTitle>
							<AlertDialogDescription>{`"${copy.subject}" will be permanently removed. This action cannot be undone.`}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{demo.cancel}</AlertDialogCancel>
							<AlertDialogAction>{demo.confirm}</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* 2. Long unbreakable title. */}
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button data-testid="open-title" variant="outline">Long title</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{copy.title}</AlertDialogTitle>
							<AlertDialogDescription>{demo.long}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{demo.cancel}</AlertDialogCancel>
							<AlertDialogAction>{demo.confirm}</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* 3. Long copy: the whole popup scrolls, so is the footer still reachable? */}
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button data-testid="open-body" variant="outline">Long body</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{demo.title}</AlertDialogTitle>
							<AlertDialogDescription>{copy.long}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{demo.cancel}</AlertDialogCancel>
							<AlertDialogAction>{demo.confirm}</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* 4. Translated action labels. */}
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button data-testid="open-footer" variant="outline">Long footer labels</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{demo.title}</AlertDialogTitle>
							<AlertDialogDescription>{demo.long}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
							<AlertDialogAction>{copy.confirm}</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		);
	},
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { DownloadIcon, UserPlusIcon } from 'lucide-react';

import { Button } from '../../components/button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '../../components/button-group';
import { Spinner } from '../../components/spinner';
import { UnlinkButton } from '../../components/unlink-button';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { identifiers, labels, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Button',
	parameters: { breakUi: true },
};
export default meta;

const demo = {
	primary: 'Save changes',
	secondary: 'Cancel',
	assignee: 'Jane Doe',
	views: ['Day', 'Week', 'Month'],
	linkText: 'example.com/s/abc123',
	chips: ['Acme Inc', 'Globex'],
};

const worst = {
	primary: 'Enregistrer les paramètres de confidentialité et de sécurité',
	secondary: 'Abbrechen und zurück zu den Benachrichtigungseinstellungen',
	assignee: names.longHyphenated,
	views: ['Tag', 'Woche', 'Monat', 'Quartal', 'Jahr', 'Gesamtzeitraum'],
	linkText: identifiers.url,
	chips: [names.longSuffix, labels.longTag, names.cjk, names.emojiFirst],
};

/** The record chip a relation picker renders: name plus the unlink affordance. */
function Chip({ label, unlinking, disabled, ariaLabel }: { label: string; unlinking?: boolean; disabled?: boolean; ariaLabel?: string }) {
	return (
		<span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-card py-0.5 pl-2 pr-1 text-xs">
			<span className="min-w-0 truncate">{label}</span>
			<UnlinkButton onUnlink={() => {}} isUnlinking={unlinking} disabled={disabled} aria-label={ariaLabel} />
		</span>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const d = pickDataset(context, { demo, worst });
		const isWorst = d === worst;

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={480} label="Dialog footer (480px dialog, 24px padding → 432px of room)">
					<div className="flex justify-end gap-2 p-6">
						<Button variant="outline">{d.secondary}</Button>
						<Button>{d.primary}</Button>
					</div>
				</Frame>

				<Frame width={288} label="Full-width CTA in a 320px viewport (288px after gutters)">
					<div className="flex flex-col gap-2">
						<Button className="w-full">{d.primary}</Button>
						<Button variant="outline" className="w-full">
							<UserPlusIcon />
							{d.assignee}
						</Button>
					</div>
				</Frame>

				<Frame width={280} label="Content-sized buttons in a 280px sidebar">
					<div className="flex flex-col items-start gap-2 p-2">
						<Button size="sm" variant="secondary">
							<UserPlusIcon />
							Assign to {d.assignee}
						</Button>
						<Button size="xs" variant="ghost">
							<DownloadIcon />
							{isWorst ? identifiers.fileName : 'report.pdf'}
						</Button>
					</div>
				</Frame>

				<Frame width={320} label="Loading swap: label width before and after">
					<div className="flex items-center gap-3 p-2">
						<Button data-case="idle">Save</Button>
						<Button data-case="loading" disabled>
							<Spinner />
							Saving…
						</Button>
					</div>
				</Frame>

				<Frame width={320} label="ButtonGroup view switcher at 320px">
					<ButtonGroup>
						{d.views.map((view) => (
							<Button key={view} variant="outline">
								{view}
							</Button>
						))}
					</ButtonGroup>
				</Frame>

				<Frame width={320} label="ButtonGroup with text prefix (share link)">
					<ButtonGroup>
						<ButtonGroupText>{d.linkText}</ButtonGroupText>
						<ButtonGroupSeparator />
						<Button variant="outline">Copy</Button>
					</ButtonGroup>
				</Frame>

				<Frame width={240} label="Vertical ButtonGroup in 240px">
					<ButtonGroup orientation="vertical" className="w-full">
						{d.views.slice(0, 3).map((view) => (
							<Button key={view} variant="outline" className="justify-start">
								{view}
							</Button>
						))}
					</ButtonGroup>
				</Frame>

				<Frame width={280} label="UnlinkButton in record chips (280px)">
					<div className="flex flex-wrap gap-2 p-2">
						{d.chips.map((chip) => (
							<Chip key={chip} label={chip} />
						))}
						<Chip label="Unlinking…" unlinking />
						<Chip label="Disabled" disabled />
						<Chip label={names.longSuffix} ariaLabel={`Unlink ${names.longSuffix}`} />
					</div>
				</Frame>
			</div>
		);
	},
};

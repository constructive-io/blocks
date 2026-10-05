import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
	DATA_ROOMS_DEMO,
	DataRooms,
	type DataRoomsAction,
	type DataRoomsCommand,
	type DataRoomsProps,
	type DataRoomsView,
	type RoomTab,
} from '../components/data-rooms';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const meta: Meta<typeof DataRooms> = {
	title: 'Templates/DataRooms',
	component: DataRooms,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Secure document rooms for an organization and its sub-organizations. Access carries down from the organization to its units and rooms, folders can be shared with guests until a date, agreements gate entry, and every room has Q&A, insights, and an assistant that only cites what the reader can open. Admins can preview the workspace as anyone.',
			},
		},
	},
	args: {
		data: DATA_ROOMS_DEMO,
	},
	argTypes: {
		data: { control: false },
		defaultView: { control: 'inline-radio', options: ['home', 'access-map', 'activity', 'room'] satisfies DataRoomsView[] },
		defaultTab: { control: 'inline-radio', options: ['documents', 'people', 'questions', 'insights', 'settings'] satisfies RoomTab[] },
	},
};

export default meta;
type Story = StoryObj<typeof DataRooms>;

type LogEntry = { label: string; detail: string };

/** Renders the template with simulated host callbacks and a log of what the host receives. */
function Frame({ failInvites = false, ...props }: DataRoomsProps & { failInvites?: boolean }) {
	const [log, setLog] = useState<LogEntry[]>([]);
	const record = (label: string, detail: unknown) => setLog((current) => [{ label, detail: JSON.stringify(detail) }, ...current].slice(0, 3));
	return (
		<div className="flex h-dvh min-h-[680px] flex-col gap-2 p-4">
			<div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
				<DataRooms
					{...props}
					onAction={(action: DataRoomsAction) => record('onAction', action)}
					onCommand={async (command: DataRoomsCommand) => {
						await wait(450);
						if (failInvites && command.type === 'invite') throw new Error('The invite service is unavailable. Nothing was sent; try again.');
						record('onCommand', { type: command.type });
					}}
				/>
			</div>
			<p className="truncate font-mono text-xs text-muted-foreground" aria-live="polite">
				{log.length ? log.map((entry) => `${entry.label} → ${entry.detail}`).join('  ·  ') : 'Host callbacks appear here.'}
			</p>
		</div>
	);
}

const room = (tab: RoomTab, roomId = 'room-atlas'): Partial<DataRoomsProps> => ({ defaultView: 'room', defaultRoomId: roomId, defaultTab: tab });

export const Home: Story = { args: { defaultView: 'home' }, render: (args) => <Frame {...args} /> };

export const Documents: Story = { name: 'Room: documents', args: room('documents'), render: (args) => <Frame {...args} /> };

export const People: Story = { name: 'Room: people', args: room('people'), render: (args) => <Frame {...args} /> };

export const Questions: Story = { name: 'Room: Q&A', args: room('questions'), render: (args) => <Frame {...args} /> };

export const Insights: Story = { name: 'Room: insights', args: room('insights'), render: (args) => <Frame {...args} /> };

export const Settings: Story = { name: 'Room: settings', args: room('settings'), render: (args) => <Frame {...args} /> };

export const AccessMap: Story = { name: 'Access map', args: { defaultView: 'access-map' }, render: (args) => <Frame {...args} /> };

export const Activity: Story = { args: { defaultView: 'activity' }, render: (args) => <Frame {...args} /> };

export const PreviewAsBidder: Story = {
	name: 'Preview as a bidder',
	args: { ...room('documents'), defaultPreviewAs: 'person-dana' },
	parameters: { docs: { description: { story: 'A guest with room-wide viewer access: view-only documents hide Download, and Q&A shows only their company’s questions.' } } },
	render: (args) => <Frame {...args} />,
};

export const AgreementGate: Story = {
	name: 'Agreement gate',
	args: { ...room('documents'), defaultPreviewAs: 'person-owen' },
	parameters: { docs: { description: { story: 'Owen accepted version 1 of the agreement; version 2 asks him again before he can enter.' } } },
	render: (args) => <Frame {...args} />,
};

export const FolderShareOnly: Story = {
	name: 'Folder share only',
	args: { ...room('documents'), defaultPreviewAs: 'person-kai' },
	parameters: { docs: { description: { story: 'A valuation advisor who can only see the model folder. The assistant cites nothing outside it.' } } },
	render: (args) => <Frame {...args} />,
};

export const RestrictedRoom: Story = {
	name: 'Restricted room, from a fund analyst',
	args: { defaultView: 'home', defaultPreviewAs: 'person-hana' },
	parameters: { docs: { description: { story: 'Hana is a Fund II member. She joins open rooms automatically, but Project Atlas is restricted, so it is not on her list.' } } },
	render: (args) => <Frame {...args} />,
};

export const CollapsedSidebar: Story = { args: { ...room('documents'), defaultSidebarCollapsed: true }, render: (args) => <Frame {...args} /> };

export const ControlledView: Story = {
	render: function ControlledViewStory(args) {
		const [view, setView] = useState<DataRoomsView>('home');
		const [roomId, setRoomId] = useState<string | null>(null);
		return (
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">
					Host state: view <code className="font-mono">{view}</code>, room <code className="font-mono">{roomId ?? 'none'}</code>
				</p>
				<Frame {...args} view={view} onViewChange={setView} roomId={roomId} onRoomChange={setRoomId} />
			</div>
		);
	},
};

export const FailingInvite: Story = {
	name: 'Invite refused by the host',
	args: room('people'),
	render: (args) => <Frame {...args} failInvites />,
};

export const HostAssistant: Story = {
	name: 'Host-run assistant',
	args: {
		...room('documents'),
		onAskAssistant: async ({ prompt }) => {
			await wait(900);
			return { text: `Your host answered “${prompt}” using its own runtime, citing the audited accounts.`, citations: [{ documentId: 'doc-audited', page: 4 }] };
		},
	},
	render: (args) => <Frame {...args} />,
};

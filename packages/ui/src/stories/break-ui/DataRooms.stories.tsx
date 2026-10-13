import type { Meta, StoryObj } from '@storybook/react-vite';

import { DATA_ROOMS_DEMO, DataRooms, type DataRoomsData, type DataRoomsView, type RoomTab } from '../../components/data-rooms';
import { pickDataset } from './dataset';
import { emptyRooms, hugeRooms, oneRoom, worstRoomsData } from './rooms-worst-case';

const meta: Meta = {
	title: 'Break UI/Data Rooms',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] },
	},
};
export default meta;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function Frame({ data, view, tab, previewAs }: { data: DataRoomsData; view: DataRoomsView; tab?: RoomTab; previewAs?: string }) {
	return (
		<div className="h-dvh min-h-[680px] p-2">
			<div className="h-full overflow-hidden rounded-xl border border-border shadow-sm">
				<DataRooms
					data={data}
					defaultView={view}
					defaultRoomId={view === 'room' ? (data.rooms.find((room) => room.id === 'room-atlas')?.id ?? data.rooms[0]?.id ?? null) : null}
					defaultTab={tab}
					defaultPreviewAs={previewAs ?? null}
					onCommand={async () => {
						await wait(300);
					}}
				/>
			</div>
		</div>
	);
}

const story =
	(view: DataRoomsView, tab?: RoomTab): StoryObj =>
	({
		render: (_args, context) => {
			const data = pickDataset(context, { demo: DATA_ROOMS_DEMO, worst: worstRoomsData, empty: emptyRooms, one: oneRoom, huge: hugeRooms });
			return <Frame data={data} view={view} tab={tab} />;
		},
	});

export const Home: StoryObj = story('home');
export const Documents: StoryObj = story('room', 'documents');
export const People: StoryObj = story('room', 'people');
export const Questions: StoryObj = story('room', 'questions');
export const Insights: StoryObj = story('room', 'insights');
export const Settings: StoryObj = story('room', 'settings');
export const AccessMap: StoryObj = story('access-map');
export const Activity: StoryObj = story('activity');

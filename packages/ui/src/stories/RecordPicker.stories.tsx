import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RecordPicker } from '../components/record-picker';

const meta: Meta<typeof RecordPicker> = {
	title: 'UI/RecordPicker',
	component: RecordPicker,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const CUSTOMERS = [
	{ id: 'cus_01', name: 'Ada Lovelace', email: 'ada@analytical.dev' },
	{ id: 'cus_02', name: 'Grace Hopper', email: 'grace@compiler.io' },
	{ id: 'cus_03', name: 'Katherine Johnson', email: 'kj@orbital.dev' },
	{ id: 'cus_04', name: 'Margaret Hamilton', email: 'margaret@apollo.dev' },
	{ id: 'cus_05', name: 'Radia Perlman', email: 'radia@spanning.dev' },
	{ id: 'cus_06', name: 'Barbara Liskov', email: 'barbara@clu.dev' },
];

function PickerDemo({ linked = new Set<string>(['cus_02']) }: { linked?: Set<string> }) {
	const [linkedIds, setLinkedIds] = useState(linked);
	const [isLinking, setIsLinking] = useState(false);

	return (
		<div className='w-[380px] rounded-md border p-3'>
			<RecordPicker
				records={CUSTOMERS}
				linkedRecordIds={linkedIds}
				isLinking={isLinking}
				getRecordId={(record) => record.id}
				getRecordLabel={(record) => `${record.name} — ${record.email}`}
				searchFields={['name', 'email']}
				placeholder='Search customers…'
				onLink={(record) => {
					setIsLinking(true);
					setTimeout(() => {
						setLinkedIds((prev) => new Set(prev).add(record.id));
						setIsLinking(false);
					}, 500);
				}}
			/>
			<p className='mt-2 font-mono text-xs text-muted-foreground'>
				linked: {[...linkedIds].join(', ') || 'none'}
			</p>
		</div>
	);
}

export const Default: Story = {
	render: () => <PickerDemo />,
};

export const Empty: Story = {
	render: () => (
		<div className='w-[380px] rounded-md border p-3'>
			<RecordPicker
				records={[]}
				linkedRecordIds={new Set()}
				isLinking={false}
				getRecordId={(r) => r.id}
				getRecordLabel={(r) => r.name}
				placeholder='Search customers…'
				onLink={() => {}}
			/>
		</div>
	),
};

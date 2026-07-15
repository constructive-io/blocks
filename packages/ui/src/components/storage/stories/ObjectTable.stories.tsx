import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ObjectTable } from '../object-table';
import type { ObjectSort } from '../types';
import { objects } from './fixtures';

const meta: Meta<typeof ObjectTable> = {
	title: 'Storage/ObjectTable',
	component: ObjectTable,
	parameters: { layout: 'fullscreen' },
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div className='w-full max-w-4xl p-4'>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

function TableHarness(props: {
	initialSelected?: string[];
	isLoading?: boolean;
	data?: typeof objects;
	emptyLabel?: string;
}) {
	const [selectedIds, setSelectedIds] = React.useState<string[]>(props.initialSelected ?? []);
	const [sort, setSort] = React.useState<ObjectSort>({ column: 'createdAt', direction: 'desc' });

	return (
		<ObjectTable
			objects={props.data ?? objects}
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			sort={sort}
			onSortChange={setSort}
			onOpenObject={() => {}}
			onDownload={() => {}}
			onCopyLink={() => {}}
			onRename={() => {}}
			onDelete={() => {}}
			isLoading={props.isLoading}
			emptyLabel={props.emptyLabel}
		/>
	);
}

export const Populated: Story = {
	render: () => <TableHarness />,
};

export const Loading: Story = {
	render: () => <TableHarness isLoading />,
};

export const Empty: Story = {
	render: () => <TableHarness data={[]} />,
};

export const EmptySearch: Story = {
	render: () => <TableHarness data={[]} emptyLabel='No files match “invoice”' />,
};

export const Selection: Story = {
	render: () => <TableHarness initialSelected={['obj-1', 'obj-2', 'obj-4']} />,
};

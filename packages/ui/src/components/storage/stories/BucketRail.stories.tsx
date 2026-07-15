import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BucketRail } from '../bucket-rail';
import { buckets } from './fixtures';

const meta: Meta<typeof BucketRail> = {
	title: 'Storage/BucketRail',
	component: BucketRail,
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div className='h-96 w-64 overflow-hidden rounded-lg border'>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		function Harness() {
			const [selected, setSelected] = React.useState<string>('bucket-public');
			return (
				<BucketRail
					buckets={buckets.filter((bucket) => bucket.provisioned !== false)}
					selectedBucketId={selected}
					onSelectBucket={setSelected}
					onNewBucket={() => {}}
				/>
			);
		}
		return <Harness />;
	},
};

export const WithUnprovisioned: Story = {
	render: () => {
		function Harness() {
			const [selected, setSelected] = React.useState<string>('bucket-private');
			return (
				<BucketRail
					buckets={buckets}
					selectedBucketId={selected}
					onSelectBucket={setSelected}
					onNewBucket={() => {}}
				/>
			);
		}
		return <Harness />;
	},
};

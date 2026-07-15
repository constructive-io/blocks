import type { Meta, StoryObj } from '@storybook/react-vite';

import { BucketConfigSheet } from '../bucket-config-sheet';
import { buckets } from './fixtures';

const meta: Meta<typeof BucketConfigSheet> = {
	title: 'Storage/BucketConfigSheet',
	component: BucketConfigSheet,
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
	render: () => <BucketConfigSheet mode='create' open onOpenChange={() => {}} onSubmit={() => {}} onCancel={() => {}} />,
};

export const Edit: Story = {
	render: () => (
		<BucketConfigSheet
			mode='edit'
			initial={buckets[0]}
			open
			onOpenChange={() => {}}
			onSubmit={() => {}}
			onCancel={() => {}}
		/>
	),
};

// A host whose schema only has the core columns (e.g. a default-provisioned
// AppBucket without allowCustomKeys/limits): only key + visibility render.
export const ReducedFields: Story = {
	render: () => (
		<BucketConfigSheet
			mode='create'
			open
			onOpenChange={() => {}}
			onSubmit={() => {}}
			onCancel={() => {}}
			supportedFields={{
				allowCustomKeys: false,
				allowedMimeTypes: false,
				maxFileSize: false,
				allowedOrigins: false,
				description: false,
			}}
		/>
	),
};

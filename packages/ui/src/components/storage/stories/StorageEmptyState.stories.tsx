import type { Meta, StoryObj } from '@storybook/react-vite';

import { StorageEmptyState, type StorageEmptyStateVariant } from '../storage-empty-state';

const meta: Meta<typeof StorageEmptyState> = {
	title: 'Storage/StorageEmptyState',
	component: StorageEmptyState,
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS: StorageEmptyStateVariant[] = ['no-buckets', 'not-provisioned', 'empty-bucket', 'no-access'];

export const AllVariants: Story = {
	render: () => (
		<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
			{VARIANTS.map((variant) => (
				<div key={variant} className='h-72 overflow-hidden rounded-lg border'>
					<StorageEmptyState variant={variant} onAction={() => {}} onSecondaryAction={() => {}} />
				</div>
			))}
		</div>
	),
};

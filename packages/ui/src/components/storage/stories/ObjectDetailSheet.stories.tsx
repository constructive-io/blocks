import type { Meta, StoryObj } from '@storybook/react-vite';

import { ObjectDetailSheet } from '../object-detail-sheet';
import { documentObject, imageObject } from './fixtures';

const meta: Meta<typeof ObjectDetailSheet> = {
	title: 'Storage/ObjectDetailSheet',
	component: ObjectDetailSheet,
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ImageFile: Story = {
	render: () => (
		<ObjectDetailSheet
			object={imageObject}
			open
			onOpenChange={() => {}}
			onDownload={() => {}}
			onCopyLink={() => {}}
			onRename={() => {}}
			onDelete={() => {}}
		/>
	),
};

export const DocumentFile: Story = {
	render: () => (
		<ObjectDetailSheet
			object={documentObject}
			open
			onOpenChange={() => {}}
			onDownload={() => {}}
			onCopyLink={() => {}}
			onRename={() => {}}
			onDelete={() => {}}
		/>
	),
};

// Image file whose signed downloadUrl hasn't resolved yet: the preview shows a
// Skeleton instead of a broken <img>.
export const ImagePreviewLoading: Story = {
	render: () => (
		<ObjectDetailSheet
			object={{ ...imageObject, downloadUrl: null }}
			open
			isPreviewLoading
			onOpenChange={() => {}}
			onDownload={() => {}}
			onCopyLink={() => {}}
			onRename={() => {}}
			onDelete={() => {}}
		/>
	),
};

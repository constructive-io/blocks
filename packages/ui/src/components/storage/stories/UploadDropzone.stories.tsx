import type { Meta, StoryObj } from '@storybook/react-vite';

import { UploadDropzone } from '../upload-dropzone';
import { uploads } from './fixtures';

const meta: Meta<typeof UploadDropzone> = {
	title: 'Storage/UploadDropzone',
	component: UploadDropzone,
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div className='w-full max-w-md'>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
	render: () => <UploadDropzone onFiles={() => {}} maxSize={10 * 1024 * 1024} />,
};

export const Uploading: Story = {
	render: () => (
		<UploadDropzone onFiles={() => {}} uploads={uploads} onCancel={() => {}} maxSize={50 * 1024 * 1024} />
	),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { toast } from 'sonner';

import { Button } from '../components/button';
import { Toaster } from '../components/sonner';

const meta: Meta<typeof Toaster> = {
	title: 'UI/Sonner',
	component: Toaster,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className='flex flex-wrap items-center gap-2'>
			<Toaster />
			<Button variant='outline' onClick={() => toast('Snapshot scheduled for tonight')}>
				Default
			</Button>
			<Button variant='outline' onClick={() => toast.success('Backup verified in two regions')}>
				Success
			</Button>
			<Button
				variant='outline'
				onClick={() =>
					toast.error('Migration failed', {
						description: '0007_add_indexes.sql exited with code 1.',
					})
				}
			>
				Error
			</Button>
			<Button
				variant='outline'
				onClick={() =>
					toast('File uploaded', {
						action: { label: 'Copy link', onClick: () => {} },
					})
				}
			>
				With action
			</Button>
			<Button
				variant='outline'
				onClick={() =>
					toast.promise(new Promise((r) => setTimeout(r, 1600)), {
						loading: 'Uploading cover.png…',
						success: 'Upload complete',
						error: 'Upload failed',
					})
				}
			>
				Promise
			</Button>
		</div>
	),
};

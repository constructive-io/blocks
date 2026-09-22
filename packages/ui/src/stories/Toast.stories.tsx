import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Toaster } from '../components/sonner';
import { toast } from '../components/toast';

const meta: Meta = {
	title: 'UI/Toast',
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
	render: () => (
		<div className='flex flex-wrap items-center gap-2'>
			<Toaster />
			<Button
				variant='outline'
				onClick={() =>
					toast.success({ message: 'Changes saved', description: 'Revision 42 is now live.' })
				}
			>
				Success
			</Button>
			<Button
				variant='outline'
				onClick={() =>
					toast.info({ message: 'Reindexing started', description: 'Search results may lag briefly.' })
				}
			>
				Info
			</Button>
			<Button
				variant='outline'
				onClick={() =>
					toast.warning({ message: 'Quota almost reached', description: '82% of included rows used.' })
				}
			>
				Warning
			</Button>
			<Button
				variant='outline'
				onClick={() =>
					toast.error({ message: 'Connection lost', description: 'Retrying in 5 seconds…' })
				}
			>
				Error
			</Button>
			<Button
				variant='outline'
				onClick={() =>
					toast.success({
						message: 'File uploaded',
						action: { label: 'Copy link', onClick: () => {} },
					})
				}
			>
				With action
			</Button>
		</div>
	),
};

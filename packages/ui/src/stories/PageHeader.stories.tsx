import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { PageHeader } from '../components/page-header';

const meta: Meta<typeof PageHeader> = {
	title: 'UI/PageHeader',
	component: PageHeader,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className='w-[720px] rounded-md border'>
			<PageHeader
				title='production-db'
				description='PostgreSQL 17 database in us-east-1.'
				actions={
					<>
						<Button size='sm' variant='outline'>
							Logs
						</Button>
						<Button size='sm'>Connect</Button>
					</>
				}
			/>
		</div>
	),
};

export const WithBadge: Story = {
	render: () => (
		<div className='w-[720px] rounded-md border'>
			<PageHeader
				title='staging-api'
				description='Deploy previews and integration tests run here.'
				actions={<Badge variant='secondary'>Staging</Badge>}
			/>
		</div>
	),
};

export const TitleOnly: Story = {
	render: () => (
		<div className='w-[720px] rounded-md border'>
			<PageHeader title='Settings' />
		</div>
	),
};

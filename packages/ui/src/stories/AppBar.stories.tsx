import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppBar } from '../components/app-bar';
import { Button } from '../components/button';
import { SidebarProvider } from '../components/sidebar';

const meta: Meta<typeof AppBar> = {
	title: 'Blocks/App Bar',
	component: AppBar,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const StickyBreadcrumbs: Story = {
	render: () => (
		<SidebarProvider>
			<AppBar
				breadcrumbs={[
					{ id: 'workspace', label: 'Acme', href: '/acme' },
					{ id: 'table', label: 'Customers' },
				]}
				actions={<Button size='sm'>Create record</Button>}
			/>
		</SidebarProvider>
	),
};

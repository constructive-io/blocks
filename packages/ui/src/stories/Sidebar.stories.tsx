import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatabaseIcon, FolderIcon, HomeIcon, KeyIcon, SettingsIcon, TableIcon } from 'lucide-react';

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from '../components/sidebar';

const meta: Meta<typeof Sidebar> = {
	title: 'UI/Sidebar',
	component: Sidebar,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const PROJECT_ITEMS = [
	{ icon: HomeIcon, label: 'Overview' },
	{ icon: TableIcon, label: 'Tables', active: true },
	{ icon: DatabaseIcon, label: 'Backups' },
];

const ADMIN_ITEMS = [
	{ icon: KeyIcon, label: 'API keys' },
	{ icon: SettingsIcon, label: 'Settings' },
];

function SidebarDemo({ defaultOpen = true }: { defaultOpen?: boolean }) {
	return (
		<SidebarProvider defaultOpen={defaultOpen} className='h-[480px] min-h-0'>
			<Sidebar>
				<SidebarHeader>
					<div className='flex items-center gap-2 px-2 py-1'>
						<FolderIcon className='size-4 text-muted-foreground' />
						<span className='text-sm font-medium'>production-db</span>
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Project</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{PROJECT_ITEMS.map((item) => (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton isActive={item.active}>
											<item.icon className='size-4' />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>Admin</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{ADMIN_ITEMS.map((item) => (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton>
											<item.icon className='size-4' />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
			<SidebarInset>
				<header className='flex items-center gap-2 border-b px-4 py-2'>
					<SidebarTrigger />
					<span className='text-sm font-medium'>Tables</span>
				</header>
				<div className='p-4 text-sm text-muted-foreground'>
					Content area — toggle the sidebar with the trigger or ⌘B.
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

export const Default: Story = {
	render: () => <SidebarDemo />,
};

export const Collapsed: Story = {
	render: () => <SidebarDemo defaultOpen={false} />,
};

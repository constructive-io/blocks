import type { Meta, StoryObj } from '@storybook/react-vite';
import { BellIcon, ChevronsUpDownIcon, FolderIcon, InboxIcon, MoreHorizontalIcon, SettingsIcon, UsersIcon } from 'lucide-react';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names, numbers } from './worst-case';
import { Avatar, AvatarFallback } from '../../components/avatar';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarTrigger,
} from '../../components/sidebar';

const meta: Meta = {
	title: 'Break UI/Sidebar',
	parameters: { layout: 'fullscreen', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type NavItem = { label: string; badge?: string; sub?: string[] };
type Fixture = {
	workspace: string;
	plan: string;
	group: string;
	items: NavItem[];
	user: { name: string; email: string };
};

const demo: Fixture = {
	workspace: 'Acme Inc',
	plan: 'Enterprise',
	group: 'Platform',
	items: [
		{ label: 'Inbox', badge: '12' },
		{ label: 'Members', sub: ['Active', 'Invited'] },
		{ label: 'Settings' },
	],
	user: { name: 'Jane Doe', email: 'jane@acme.com' },
};

const worstItems: NavItem[] = [
	{ label: labels.german, badge: numbers.million.toLocaleString('en-US') },
	{ label: labels.french, badge: '1,284' },
	{ label: identifiers.fileName, badge: '99+' },
	{ label: names.longHyphenated, sub: [labels.german, identifiers.cameraFile, 'Jo'] },
	{ label: emails.long },
	{ label: 'Jo', badge: '3' },
	{ label: names.cjk },
	{ label: names.rtl, badge: '7' },
];

const worst: Fixture = {
	workspace: 'Northwind Industries Holdings (EMEA) — Platform Infrastructure',
	plan: labels.jobTitle,
	group: labels.french,
	items: [...worstItems, ...manyRows(32, (index) => ({ label: `${identifiers.snakeIdentifier} ${index + 1}` }))],
	user: { name: names.longSuffix, email: emails.long },
};

const hugeFixture: Fixture = { ...worst, items: manyRows(1000, (index) => ({ label: `${worstItems[index % worstItems.length].label} ${index + 1}`, badge: String(index) })) };

function Shell({ data, side }: { data: Fixture; side: 'left' | 'right' }) {
	return (
		<SidebarProvider>
			<Sidebar collapsible="icon" side={side}>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" tooltip={data.workspace} data-testid="workspace-switcher">
								<span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<FolderIcon />
								</span>
								<span className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{data.workspace}</span>
									<span className="truncate text-xs">{data.plan}</span>
								</span>
								<ChevronsUpDownIcon className="ml-auto" />
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>{data.group}</SidebarGroupLabel>
						<SidebarGroupAction title="Add">
							<InboxIcon />
						</SidebarGroupAction>
						<SidebarGroupContent>
							<SidebarMenu>
								{data.items.map((item, index) => (
									<SidebarMenuItem key={index}>
										<SidebarMenuButton isActive={index === 1} tooltip={item.label}>
											<BellIcon />
											<span>{item.label}</span>
										</SidebarMenuButton>
										{item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
										{item.sub ? (
											<SidebarMenuSub>
												{item.sub.map((sub) => (
													<SidebarMenuSubItem key={sub}>
														<SidebarMenuSubButton href="#">
															<span>{sub}</span>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										) : null}
									</SidebarMenuItem>
								))}
								<SidebarMenuItem>
									<SidebarMenuButton tooltip="Teams">
										<UsersIcon />
										<span>{data.items[0]?.label ?? 'Teams'}</span>
									</SidebarMenuButton>
									<SidebarMenuAction showOnHover aria-label="More">
										<MoreHorizontalIcon />
									</SidebarMenuAction>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" tooltip={data.user.name} data-testid="user-menu">
								<Avatar className="size-8 rounded-lg">
									<AvatarFallback className="rounded-lg">{data.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
								</Avatar>
								<span className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{data.user.name}</span>
									<span className="truncate text-xs">{data.user.email}</span>
								</span>
								<SettingsIcon className="ml-auto" />
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset>
				<header className="flex items-center gap-2 border-b px-4 py-2">
					<SidebarTrigger data-testid="sidebar-trigger" />
					<span className="text-sm font-medium">Content</span>
				</header>
				<div className="p-4 text-sm text-muted-foreground">Content area.</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

/** The shell as an app would mount it: switcher, a long nav group, badges, a submenu, and a user footer. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset<Fixture>(context, {
			demo,
			worst,
			empty: { ...demo, items: [] },
			one: { ...demo, items: [demo.items[0]] },
			huge: hugeFixture,
		});
		return <Shell data={data} side="left" />;
	},
};

/** Same shell docked on the right, for the physical-side checks. */
export const RightSide: StoryObj = {
	parameters: { layout: 'fullscreen', breakUi: { states: ['demo', 'worst'] } },
	render: (_args, context) => {
		const data = pickDataset<Fixture>(context, { demo, worst });
		return <Shell data={data} side="right" />;
	},
};

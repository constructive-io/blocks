'use client';

import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ChevronRightIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { AppBar, createAppLink, type AppBarProps, type AppBreadcrumbItem, type AppLinkRenderer } from './app-bar';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './dropdown-menu';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
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
	SidebarRail,
	SidebarSeparator,
	useSidebar,
} from './sidebar';

type AppIcon = React.ComponentType<{
	className?: string;
	'aria-hidden'?: boolean | 'true' | 'false';
}>;

interface AppNavigationChild {
	id: string;
	label: React.ReactNode;
	href: string;
	isActive?: boolean;
	disabled?: boolean;
}

interface AppNavigationItem extends AppNavigationChild {
	icon?: AppIcon;
	badge?: React.ReactNode;
	defaultOpen?: boolean;
	toggleLabel?: string;
	children?: readonly AppNavigationChild[];
}

interface AppNavigationGroup {
	id: string;
	label?: React.ReactNode;
	placement?: 'main' | 'footer';
	items: readonly AppNavigationItem[];
}

interface AppShellBrand {
	name: React.ReactNode;
	description?: React.ReactNode;
	href?: string;
	logo?: React.ReactNode;
}

interface AppAccountActionBase {
	id: string;
	label: React.ReactNode;
	icon?: AppIcon;
	disabled?: boolean;
	variant?: 'default' | 'destructive';
}

type AppAccountAction = AppAccountActionBase &
	(
		| {
				href: string;
				onSelect?: never;
		  }
		| {
				href?: never;
				onSelect: () => void;
		  }
	);

interface AppAccountActionGroup {
	id: string;
	label?: React.ReactNode;
	actions: readonly AppAccountAction[];
}

interface AppAccount {
	name: string;
	secondaryLabel?: string;
	avatarUrl?: string;
	avatarAlt?: string;
	fallback?: string;
	actionGroups?: readonly AppAccountActionGroup[];
}

type SidebarProps = React.ComponentProps<typeof Sidebar>;
type AppShellRootProps = useRender.ComponentProps<'div'> & React.ComponentProps<'div'>;

type AppShellProps = Omit<AppShellRootProps, 'children'> & {
	children: React.ReactNode;
	navigation: readonly AppNavigationGroup[];
	brand?: AppShellBrand;
	account?: AppAccount;
	breadcrumbs?: readonly AppBreadcrumbItem[];
	renderLink?: AppLinkRenderer;
	barLeading?: React.ReactNode;
	barSearch?: React.ReactNode;
	barActions?: React.ReactNode;
	barProps?: Omit<AppBarProps, 'breadcrumbs' | 'renderLink' | 'leading' | 'search' | 'actions'>;
	headerHeight?: string;
	sidebarProps?: Omit<SidebarProps, 'children'>;
	sidebarFooter?: React.ReactNode;
	defaultSidebarOpen?: boolean;
	sidebarOpen?: boolean;
	onSidebarOpenChange?: (open: boolean) => void;
	contentClassName?: string;
	contentProps?: Omit<React.ComponentProps<'main'>, 'children' | 'className'>;
};

function initials(name: string) {
	const parts = name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2);
	return parts.map((part) => part[0]?.toUpperCase()).join('') || 'U';
}

function navigationLink(
	renderLink: AppLinkRenderer | undefined,
	item: AppNavigationChild,
	children: React.ReactNode,
	onAcceptedNavigation?: () => void,
) {
	return createAppLink(renderLink, {
		href: item.href,
		children,
		'aria-current': item.isActive ? 'page' : undefined,
		'aria-disabled': item.disabled || undefined,
		tabIndex: item.disabled ? -1 : undefined,
		onClick: (event) => {
			if (item.disabled) {
				event.preventDefault();
				return;
			}
			if (
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey ||
				(event.currentTarget.target && event.currentTarget.target !== '_self')
			) return;
			onAcceptedNavigation?.();
		},
	});
}

function NavigationGroup({ group, renderLink }: { group: AppNavigationGroup; renderLink?: AppLinkRenderer }) {
	const { isMobile, setOpenMobile } = useSidebar();
	const closeMobileNavigation = React.useCallback(() => {
		if (isMobile) setOpenMobile(false);
	}, [isMobile, setOpenMobile]);

	return (
		<SidebarGroup>
			{group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
			<SidebarGroupContent>
				<SidebarMenu>
					{group.items.map((item) => {
						const Icon = item.icon;
						const itemContent = (
							<>
								{Icon && <Icon aria-hidden='true' />}
								<span>{item.label}</span>
							</>
						);

						if (!item.children?.length) {
							return (
								<SidebarMenuItem key={item.id}>
									<SidebarMenuButton
										isActive={item.isActive}
										tooltip={typeof item.label === 'string' ? item.label : undefined}
										render={navigationLink(renderLink, item, itemContent, closeMobileNavigation)}
									/>
									{item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
								</SidebarMenuItem>
							);
						}

						const hasActiveChild = item.children.some((child) => child.isActive);
						return (
							<Collapsible
								key={item.id}
								defaultOpen={item.defaultOpen ?? item.isActive ?? hasActiveChild}
								render={<SidebarMenuItem />}
							>
								<SidebarMenuButton
									isActive={item.isActive}
									tooltip={typeof item.label === 'string' ? item.label : undefined}
									render={navigationLink(renderLink, item, itemContent, closeMobileNavigation)}
								/>
								<SidebarMenuAction
									render={
										<CollapsibleTrigger
											aria-label={
												item.toggleLabel ??
												(typeof item.label === 'string' ? `Toggle ${item.label}` : 'Toggle navigation group')
											}
										/>
									}
									className='aria-expanded:rotate-90'
								>
									<ChevronRightIcon />
								</SidebarMenuAction>
								<CollapsibleContent innerClassName='py-0'>
									<SidebarMenuSub>
										{item.children.map((child) => (
										<SidebarMenuSubItem key={child.id}>
											<SidebarMenuSubButton
												isActive={child.isActive}
												render={navigationLink(
													renderLink,
													child,
													child.label,
													closeMobileNavigation,
												)}
											/>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</Collapsible>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

function AccountMenu({ account, renderLink }: { account: AppAccount; renderLink?: AppLinkRenderer }) {
	const { isMobile } = useSidebar();

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								size='lg'
								className='aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground'
							/>
						}
					>
						<Avatar>
							{account.avatarUrl && <AvatarImage src={account.avatarUrl} alt={account.avatarAlt ?? account.name} />}
							<AvatarFallback>{account.fallback ?? initials(account.name)}</AvatarFallback>
						</Avatar>
						<div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
							<span className='truncate font-medium'>{account.name}</span>
							{account.secondaryLabel && <span className='truncate text-xs'>{account.secondaryLabel}</span>}
						</div>
						<ChevronsUpDownIcon className='ml-auto' />
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className='min-w-56 rounded-lg'
						side={isMobile ? 'bottom' : 'right'}
						align='end'
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className='p-0 font-normal'>
								<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
									<Avatar>
										{account.avatarUrl && (
											<AvatarImage src={account.avatarUrl} alt={account.avatarAlt ?? account.name} />
										)}
										<AvatarFallback>{account.fallback ?? initials(account.name)}</AvatarFallback>
									</Avatar>
									<div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
										<span className='truncate font-medium'>{account.name}</span>
										{account.secondaryLabel && <span className='truncate text-xs'>{account.secondaryLabel}</span>}
									</div>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						{account.actionGroups?.map((group) => (
							<React.Fragment key={group.id}>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									{group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
									{group.actions.map((action) => {
										const Icon = action.icon;
										const actionContent = (
											<>
												{Icon && <Icon aria-hidden='true' />}
												<span>{action.label}</span>
											</>
										);

										if (action.href) {
											return (
												<DropdownMenuItem
													key={action.id}
													disabled={action.disabled}
													variant={action.variant}
													render={createAppLink(renderLink, {
														href: action.href,
														children: actionContent,
													})}
												/>
											);
										}

										return (
											<DropdownMenuItem
												key={action.id}
												disabled={action.disabled}
												variant={action.variant}
												onClick={action.onSelect}
											>
												{actionContent}
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuGroup>
							</React.Fragment>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

function Brand({ brand, renderLink }: { brand: AppShellBrand; renderLink?: AppLinkRenderer }) {
	const content = (
		<>
			{brand.logo && (
				<div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
					{brand.logo}
				</div>
			)}
			<div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
				<span className='truncate font-medium'>{brand.name}</span>
				{brand.description && <span className='truncate text-xs'>{brand.description}</span>}
			</div>
		</>
	);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					size='lg'
					render={
						brand.href
							? createAppLink(renderLink, { href: brand.href, children: content })
							: <div>{content}</div>
					}
				/>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

function AppShell({
	children,
	navigation,
	brand,
	account,
	breadcrumbs,
	renderLink,
	barLeading,
	barSearch,
	barActions,
	barProps,
	headerHeight = '3.5rem',
	sidebarProps,
	sidebarFooter,
	defaultSidebarOpen = true,
	sidebarOpen,
	onSidebarOpenChange,
	contentClassName,
	contentProps,
	className,
	style,
	render,
	...props
}: AppShellProps) {
	const mainGroups = navigation.filter((group) => group.placement !== 'footer');
	const footerGroups = navigation.filter((group) => group.placement === 'footer');
	const hasFooter = footerGroups.length > 0 || Boolean(account) || Boolean(sidebarFooter);
	const { className: sidebarClassName, ...resolvedSidebarProps } = sidebarProps ?? {};

	const content = (
		<SidebarProvider
			className='min-h-0 flex-1 flex-col'
			defaultOpen={defaultSidebarOpen}
			open={sidebarOpen}
			onOpenChange={onSidebarOpenChange}
		>
			<AppBar
				breadcrumbs={breadcrumbs}
				renderLink={renderLink}
				leading={barLeading}
				search={barSearch}
				actions={barActions}
				{...barProps}
			/>
			<div className='flex min-h-0 flex-1'>
				<Sidebar
					collapsible='icon'
					{...resolvedSidebarProps}
					className={cn(
						'top-(--app-bar-height) h-[calc(100svh-var(--app-bar-height))]!',
						sidebarClassName,
					)}
				>
					{brand && (
						<SidebarHeader>
							<Brand brand={brand} renderLink={renderLink} />
						</SidebarHeader>
					)}
					<SidebarContent>
						{mainGroups.map((group) => (
							<NavigationGroup key={group.id} group={group} renderLink={renderLink} />
						))}
					</SidebarContent>
					{hasFooter && (
						<SidebarFooter>
							<SidebarSeparator />
							{footerGroups.map((group) => (
								<NavigationGroup key={group.id} group={group} renderLink={renderLink} />
							))}
							{sidebarFooter}
							{account && <AccountMenu account={account} renderLink={renderLink} />}
						</SidebarFooter>
					)}
					<SidebarRail />
				</Sidebar>
				<SidebarInset
					{...contentProps}
					className={cn('min-w-0 overflow-auto', contentClassName)}
				>
					{children}
				</SidebarInset>
			</div>
		</SidebarProvider>
	);

	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn('flex min-h-svh w-full flex-col bg-background', className),
				style: {
					'--app-bar-height': headerHeight,
					...style,
				} as React.CSSProperties,
				children: content,
			},
			props,
		),
		render,
		state: {
			slot: 'app-shell',
		},
	});
}

export { AppShell };
export type {
	AppAccount,
	AppAccountAction,
	AppAccountActionGroup,
	AppIcon,
	AppNavigationChild,
	AppNavigationGroup,
	AppNavigationItem,
	AppShellBrand,
	AppShellProps,
};

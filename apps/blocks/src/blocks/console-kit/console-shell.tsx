'use client';

import * as React from 'react';
import {
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CircleDashedIcon,
  DatabaseIcon,
  LockKeyholeIcon,
  TriangleAlertIcon
} from 'lucide-react';

import type { AppLinkRenderProps } from '@constructive-io/ui/app-bar';
import type {
  AppAccount,
  AppNavigationGroup,
  AppNavigationItem,
  AppShellBrand
} from '@constructive-io/ui/app-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@constructive-io/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
import { NavRow, NavSection, SidebarFrame } from '@/components/ui/workspace-kit/nav';
import { focusRingClass, NavMenuButton } from '@/components/ui/workspace-kit/primitives';
import { WorkspaceShell, type WorkspaceSidebarRenderProps } from '@/components/ui/workspace-kit/shell';
import { cn } from '@/lib/utils';

/** Why a feature row isn't simply open: shown as a quiet glyph, announced through the row's badge text. */
export type ConsoleNavigationStatus = 'checking' | 'locked' | 'partial' | 'setup';

export type ConsoleNavigationItem = AppNavigationItem & Readonly<{ status?: ConsoleNavigationStatus }>;

export type ConsoleNavigationGroup = Omit<AppNavigationGroup, 'items'> & Readonly<{
  items: readonly ConsoleNavigationItem[];
}>;

export type ConsoleBreadcrumb = Readonly<{ id: string; label: React.ReactNode; current?: boolean }>;

export type ConsoleShellProps = Readonly<{
  navigation: readonly ConsoleNavigationGroup[];
  brand: AppShellBrand;
  account?: AppAccount;
  breadcrumbs?: readonly ConsoleBreadcrumb[];
  renderLink?: (props: AppLinkRenderProps) => React.ReactElement;
  /** Right side of the top bar, e.g. the connection menu. */
  barActions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}>;

const STATUS_GLYPH: Readonly<Record<Exclude<ConsoleNavigationStatus, 'checking'>, typeof LockKeyholeIcon>> = {
  locked: LockKeyholeIcon,
  partial: CircleDashedIcon,
  setup: TriangleAlertIcon
};

function initials(name: string) {
  return name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function BrandMark({ brand, collapsed }: Readonly<{ brand: AppShellBrand; collapsed: boolean }>) {
  const name = typeof brand.name === 'string' ? brand.name : 'Application';
  const content = (
    <>
      <span aria-hidden='true' className='bg-foreground text-background grid size-5 shrink-0 place-items-center rounded-md [&_svg]:size-3'>
        {brand.logo ?? <DatabaseIcon />}
      </span>
      {collapsed ? <span className='sr-only'>{name}</span> : (
        <span className='min-w-0 flex-1'>
          <span className='text-foreground block truncate text-sm font-medium'>{brand.name}</span>
        </span>
      )}
    </>
  );
  const className = cn('flex h-8 min-w-0 items-center gap-2 rounded-md px-1.5', collapsed ? 'w-8 justify-center px-0' : 'flex-1');
  return brand.href
    ? <a className={cn(className, 'hover:bg-overlay-hover', focusRingClass)} href={brand.href}>{content}</a>
    : <div className={className}>{content}</div>;
}

/** The signed-in person at the foot of the sidebar, opening their session actions. */
function AccountMenu({
  account,
  collapsed,
  renderLink
}: Readonly<{ account: AppAccount; collapsed: boolean; renderLink?: ConsoleShellProps['renderLink'] }>) {
  const avatar = (
    <Avatar className='size-6 shrink-0 ring-1 ring-foreground/[0.06]'>
      {account.avatarUrl ? <AvatarImage alt={account.avatarAlt ?? ''} src={account.avatarUrl} /> : null}
      <AvatarFallback className='bg-muted text-[10px] font-medium'>{account.fallback ?? initials(account.name)}</AvatarFallback>
    </Avatar>
  );
  const groups = account.actionGroups?.filter((group) => group.actions.length > 0) ?? [];
  const person = (
    <span className='min-w-0 flex-1 text-left'>
      <span className='text-foreground block truncate text-[13px] font-medium'>{account.name}</span>
      {account.secondaryLabel ? <span className='text-muted-foreground block truncate text-xs'>{account.secondaryLabel}</span> : null}
    </span>
  );

  if (groups.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 border-t border-sidebar-border p-2.5', collapsed && 'justify-center')} data-slot='console-account'>
        {avatar}
        {collapsed ? <span className='sr-only'>{account.name}</span> : person}
      </div>
    );
  }

  return (
    <div className='border-t border-sidebar-border p-2' data-slot='console-account'>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Account: ${account.name}`}
          className={cn(
            'hover:bg-overlay-hover data-[popup-open]:bg-overlay-hover flex w-full cursor-pointer items-center gap-2 rounded-md p-1.5',
            collapsed && 'justify-center',
            focusRingClass
          )}
        >
          {avatar}
          {collapsed ? null : (
            <>
              {person}
              <ChevronsUpDownIcon aria-hidden='true' className='text-muted-foreground size-3.5 shrink-0' />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-60' side={collapsed ? 'right' : 'top'}>
          <DropdownMenuLabel className='flex items-center gap-2.5 py-2 font-normal'>
            {avatar}
            {person}
          </DropdownMenuLabel>
          {groups.map((group) => (
            <React.Fragment key={group.id}>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {group.label ? <DropdownMenuLabel className='text-muted-foreground text-xs font-normal'>{group.label}</DropdownMenuLabel> : null}
                {group.actions.map((action) => {
                  const Icon = action.icon;
                  const body = (
                    <>
                      {Icon ? <Icon aria-hidden='true' className='size-3.5' /> : null}
                      {action.label}
                    </>
                  );
                  return action.href ? (
                    <DropdownMenuItem
                      className='gap-2'
                      disabled={action.disabled}
                      key={action.id}
                      render={renderLink ? renderLink({ href: action.href }) : <a href={action.href} />}
                      variant={action.variant}
                    >
                      {body}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className='gap-2'
                      disabled={action.disabled}
                      key={action.id}
                      onClick={action.onSelect}
                      variant={action.variant}
                    >
                      {body}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ItemIcon({ icon: Icon, active }: Readonly<{ icon?: AppNavigationItem['icon']; active?: boolean }>) {
  if (!Icon) return <span aria-hidden='true' className='size-3.5 shrink-0' />;
  return <Icon aria-hidden='true' className={cn('size-3.5 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />;
}

function StatusGlyph({ status, badge }: Readonly<{ status?: ConsoleNavigationStatus; badge?: React.ReactNode }>) {
  if (!status || status === 'checking') {
    return badge ? <span className='text-muted-foreground text-xs'>{badge}</span> : null;
  }
  const Glyph = STATUS_GLYPH[status];
  return (
    <span className={cn('flex shrink-0 items-center', status === 'setup' ? 'text-warning' : 'text-muted-foreground')}>
      <Glyph aria-hidden='true' className='size-3.5' />
      {badge ? <span className='sr-only'>{badge}</span> : null}
    </span>
  );
}

/**
 * Console Kit's frame on the shared workspace shell: the application's
 * features in the sidebar (links, so hosts keep their router), the signed-in
 * account at its foot, and a slim bar with the current location and any host
 * actions. Below the sidebar breakpoint the features move into the drawer.
 */
export function ConsoleShell({
  navigation,
  brand,
  account,
  breadcrumbs,
  renderLink,
  barActions,
  className,
  children
}: ConsoleShellProps) {
  const sidebar = ({ mode, collapsed, onCollapsedChange, onNavigate }: WorkspaceSidebarRenderProps) => {
    const railCollapsed = mode === 'rail' && collapsed;
    return (
      <SidebarFrame
        collapsed={collapsed}
        drawer={mode === 'drawer'}
        footer={account ? <AccountMenu account={account} collapsed={railCollapsed} renderLink={renderLink} /> : null}
        label='Application'
        menu={<BrandMark brand={brand} collapsed={railCollapsed} />}
        onClose={onNavigate}
        onCollapsedChange={onCollapsedChange}
      >
        {navigation.map((group) => (
          <NavSection collapsed={railCollapsed} key={group.id} title={typeof group.label === 'string' ? group.label : undefined}>
            {group.items.map((item) => {
              const label = typeof item.label === 'string' ? item.label : item.id;
              return (
                <NavRow
                  active={item.isActive}
                  busy={item.status === 'checking'}
                  collapsed={railCollapsed}
                  disabled={item.disabled}
                  href={item.href ?? `#${item.id}`}
                  key={item.id}
                  label={label}
                  leading={<ItemIcon active={item.isActive} icon={item.icon} />}
                  muted={Boolean(item.status && item.status !== 'checking')}
                  onClick={onNavigate}
                  renderLink={renderLink}
                  trailing={<StatusGlyph badge={item.badge} status={item.status} />}
                />
              );
            })}
          </NavSection>
        ))}
      </SidebarFrame>
    );
  };

  return (
    <WorkspaceShell className={cn('h-dvh', className)} sidebar={sidebar} slot='console-kit'>
      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-12 shrink-0 items-center gap-2 border-b border-dashed border-foreground/10 px-4'>
          <NavMenuButton />
          {breadcrumbs?.length ? (
            <nav aria-label='Breadcrumb' className='min-w-0 flex-1'>
              <ol className='flex min-w-0 items-center gap-1 text-sm'>
                {breadcrumbs.map((crumb, index) => (
                  <li className='flex min-w-0 items-center gap-1' key={crumb.id}>
                    {index > 0 ? <ChevronRightIcon aria-hidden='true' className='text-subtle-foreground size-3.5 shrink-0' /> : null}
                    <span
                      aria-current={crumb.current ? 'page' : undefined}
                      className={cn('truncate', crumb.current ? 'text-foreground font-medium' : 'text-muted-foreground')}
                    >
                      {crumb.label}
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
          ) : <div className='flex-1' />}
          {barActions ? <div className='flex shrink-0 items-center gap-1.5'>{barActions}</div> : null}
        </header>
        <div className='min-h-0 flex-1 overflow-y-auto outline-none' id='main-content' tabIndex={-1}>
          <div className='mx-auto flex min-h-full w-full max-w-6xl min-w-0 flex-col gap-4 p-4 sm:p-6 lg:p-8'>
            {children}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

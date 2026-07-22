'use client';

import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '../lib/utils';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from './breadcrumb';
import { Separator } from './separator';
import { SidebarTrigger } from './sidebar';

interface AppLinkRenderProps extends Omit<React.ComponentProps<'a'>, 'href'> {
	href: string;
}

type AppLinkRenderer = (props: AppLinkRenderProps) => React.ReactElement;

interface AppBreadcrumbItem {
	id: string;
	label: React.ReactNode;
	href?: string;
	current?: boolean;
}

type AppBarRootProps = useRender.ComponentProps<'header'> & React.ComponentProps<'header'>;

type AppBarProps = Omit<AppBarRootProps, 'children'> & {
	breadcrumbs?: readonly AppBreadcrumbItem[];
	renderLink?: AppLinkRenderer;
	leading?: React.ReactNode;
	search?: React.ReactNode;
	actions?: React.ReactNode;
	toggleLabel?: string;
};

function createAppLink(renderLink: AppLinkRenderer | undefined, props: AppLinkRenderProps) {
	return renderLink ? renderLink(props) : <a {...props} />;
}

function AppBar({
	breadcrumbs = [],
	renderLink,
	leading,
	search,
	actions,
	toggleLabel = 'Toggle navigation',
	className,
	render,
	...props
}: AppBarProps) {
	const content = (
		<div className='flex h-[var(--app-bar-height,3.5rem)] w-full min-w-0 items-center gap-2 px-4'>
			<SidebarTrigger aria-label={toggleLabel} />
			<Separator orientation='vertical' className='mr-2 h-4 self-center' />
			{leading}
			{breadcrumbs.length > 0 && (
				<Breadcrumb className='hidden min-w-0 sm:block'>
					<BreadcrumbList className='flex-nowrap'>
						{breadcrumbs.map((item, index) => {
							const current = item.current ?? index === breadcrumbs.length - 1;
							const breadcrumbContent = current || !item.href ? (
								<BreadcrumbPage className='block max-w-56 truncate'>{item.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									render={createAppLink(renderLink, {
										href: item.href,
										children: item.label,
									})}
								/>
							);

							return (
								<React.Fragment key={item.id}>
									{index > 0 && <BreadcrumbSeparator />}
									<BreadcrumbItem className='min-w-0'>{breadcrumbContent}</BreadcrumbItem>
								</React.Fragment>
							);
						})}
					</BreadcrumbList>
				</Breadcrumb>
			)}
			{search && <div className='ml-auto min-w-0'>{search}</div>}
			{actions && <div className={cn('flex items-center gap-2', !search && 'ml-auto')}>{actions}</div>}
		</div>
	);

	return useRender({
		defaultTagName: 'header',
		props: mergeProps<'header'>(
			{
				className: cn('sticky top-0 z-30 flex w-full shrink-0 items-center border-b bg-background', className),
				children: content,
			},
			props,
		),
		render,
		state: {
			slot: 'app-bar',
		},
	});
}

export { AppBar, createAppLink };
export type { AppBarProps, AppBreadcrumbItem, AppLinkRenderer, AppLinkRenderProps };

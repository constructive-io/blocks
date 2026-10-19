'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { focusRingClass } from '../workspace-kit/primitives';
import { AuthLink, AuthLinkContext } from './auth-card';
import type { AuthBrand, AuthLayoutProps } from './types';

const brandClass = 'flex min-w-0 max-w-full items-center justify-center gap-2.5 text-foreground';

function BrandMark({ brand }: { brand: AuthBrand }) {
	const content = (
		<>
			{brand.logo ? (
				<span aria-hidden="true" className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] [&>img]:size-full [&>img]:object-cover [&>svg]:size-5">
					{brand.logo}
				</span>
			) : null}
			<span className="min-w-0 text-pretty text-base font-semibold tracking-tight [overflow-wrap:anywhere]" dir="auto">
				{brand.name}
			</span>
		</>
	);

	if (!brand.href) return <div className={brandClass}>{content}</div>;
	return (
		<AuthLink
			className={cn(brandClass, 'rounded-md hover:opacity-80', focusRingClass)}
			href={brand.href}
		>
			{content}
		</AuthLink>
	);
}

/**
 * The page around an auth panel: a centred column on the page background with
 * the brand above the card and a small muted footer below. It adds no
 * landmarks, so it can sit inside the host's own `main`.
 */
export function AuthLayout({ children, brand, footer, linkComponent, className }: AuthLayoutProps) {
	return (
		<AuthLinkContext.Provider value={linkComponent}>
			<div
				className={cn('flex min-h-dvh w-full min-w-0 flex-col items-center bg-background px-4 py-10 text-foreground sm:py-16', className)}
				data-slot="auth-layout"
			>
				<div className="flex w-full min-w-0 max-w-sm flex-1 flex-col items-center justify-center gap-6">
					{brand ? <BrandMark brand={brand} /> : null}
					{children}
					{footer ? (
						<div className="text-muted-foreground w-full min-w-0 text-pretty text-center text-xs [overflow-wrap:anywhere] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-foreground">
							{footer}
						</div>
					) : null}
				</div>
			</div>
		</AuthLinkContext.Provider>
	);
}

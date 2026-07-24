import * as React from 'react';

import { cn } from '../../utils/cn';
import { Card, CardContent } from '@constructive-io/ui/card';

import type { AuthBrandingProps } from './auth-screen-header';

type AuthScreenLayoutFill = 'viewport' | 'parent';

export interface AuthScreenLayoutProps extends AuthBrandingProps {
	children: React.ReactNode;
	fill?: AuthScreenLayoutFill;
	className?: string;
}

export function AuthScreenLayout({
	children,
	fill = 'parent',
	className,
}: AuthScreenLayoutProps) {
	return (
		<div
			className={cn(
				'bg-background relative flex flex-col',
				fill === 'viewport' ? 'min-h-dvh w-dvw' : 'h-full w-full',
				className,
			)}
		>
			<div className='flex flex-1 items-center justify-center p-6'>
				<div className='relative z-10 w-full max-w-md'>
					<Card className='overflow-hidden border-border/80'>
						<CardContent className='space-y-2 pt-6'>{children}</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

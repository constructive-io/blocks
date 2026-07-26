import * as React from 'react';

import { cn } from '../../utils/cn';

export interface AuthBrandingProps {
	logo?: React.ReactNode;
	appName?: string;
	showLogo?: boolean;
}

interface AuthScreenHeaderProps extends AuthBrandingProps {
	title: string;
	description?: string;
	className?: string;
}

export function AuthScreenHeader({
	title,
	description,
	logo,
	appName,
	showLogo = true,
	className,
}: AuthScreenHeaderProps) {
	return (
		<div className={cn('space-y-4 text-center', className)}>
			{showLogo && logo ? (
				<div className='flex items-center justify-center'>{logo}</div>
			) : null}
			{appName ? (
				<span className='text-primary text-[15px] font-semibold tracking-tight'>{appName}</span>
			) : null}

			<div className='space-y-1.5'>
				<h2
					className='from-foreground via-foreground to-foreground/70 bg-linear-to-br bg-clip-text text-xl
						font-semibold tracking-tight text-transparent'
				>
					{title}
				</h2>
				{description ? <p className='text-muted-foreground text-[13px] leading-relaxed'>{description}</p> : null}
			</div>
		</div>
	);
}

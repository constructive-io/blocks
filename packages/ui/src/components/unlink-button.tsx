import { RiCloseLine, RiLoader4Line } from '@remixicon/react';

import { cn } from '../lib/utils';
import { Button } from './button';

interface UnlinkButtonProps {
	onUnlink: () => void;
	isUnlinking?: boolean;
	disabled?: boolean;
	size?: 'sm' | 'xs';
	variant?: 'destructive' | 'ghost';
	className?: string;
	'aria-label'?: string;
}

export function UnlinkButton({
	onUnlink,
	isUnlinking = false,
	disabled = false,
	size = 'xs',
	variant = 'ghost',
	className,
	'aria-label': ariaLabel = 'Unlink record',
}: UnlinkButtonProps) {
	return (
		<Button
			variant={variant}
			size={size}
			onClick={onUnlink}
			disabled={disabled || isUnlinking}
			className={cn(
				'hover:bg-destructive/10 hover:text-destructive h-5 w-5 p-0',
				'focus:ring-destructive/20 focus:ring-2 focus:ring-offset-1',
				isUnlinking && 'cursor-not-allowed opacity-50',
				className,
			)}
			aria-label={ariaLabel}
			title={isUnlinking ? 'Unlinking...' : 'Unlink record'}
		>
			{isUnlinking ? <RiLoader4Line className='h-3 w-3 animate-spin' /> : <RiCloseLine className='h-3 w-3' />}
		</Button>
	);
}

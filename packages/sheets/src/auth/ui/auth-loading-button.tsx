import { ComponentProps } from 'react';
import { LoaderIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Button } from '@constructive-io/ui/button';

interface AuthLoadingButtonProps extends ComponentProps<typeof Button> {
	isLoading: boolean;
	loadingText?: string;
}

export function AuthLoadingButton({
	children,
	isLoading,
	loadingText = 'Please wait...',
	disabled,
	className,
	...props
}: AuthLoadingButtonProps) {
	return (
		<Button disabled={disabled || isLoading} className={cn('relative', className)} {...props}>
			{isLoading && <LoaderIcon className='mr-2 h-4 w-4 animate-spin' />}
			{isLoading ? loadingText : children}
		</Button>
	);
}

'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface AdvancedSectionProps {
	children: React.ReactNode;
	defaultOpen?: boolean;
}

/**
 * Collapsible section for advanced configuration options
 */
export function AdvancedSection({ children, defaultOpen = false }: AdvancedSectionProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<div className='mt-6 border-t pt-4'>
			<button
				type='button'
				className='text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium'
				onClick={() => setIsOpen(!isOpen)}
			>
				<ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
				Advanced Options
			</button>

			{isOpen && <div className='mt-4 space-y-4 pl-6'>{children}</div>}
		</div>
	);
}

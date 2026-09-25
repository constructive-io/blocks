import type { Decorator } from '@storybook/react-vite';
import * as React from 'react';

import { BillingFormatProvider, DEMO_NOW } from '../../components/billing-kit';
import { TooltipProvider } from '../../components/tooltip';

/**
 * Wraps a billing-kit story the way the templates do: a fixed clock, a
 * container named `view` for the container queries, and a tooltip provider.
 */
export function billingFrame(width = 'max-w-5xl'): Decorator {
	return (Story) => (
		<BillingFormatProvider now={DEMO_NOW}>
			<TooltipProvider>
				<div className={`@container/view mx-auto w-full p-6 ${width}`}>
					<Story />
				</div>
			</TooltipProvider>
		</BillingFormatProvider>
	);
}

export const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Labels a group of variants inside one story. */
export function Variant({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
	return (
		<section aria-label={label} className={className ?? 'flex flex-col gap-2'}>
			<p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
			{children}
		</section>
	);
}

export function Stack({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-col gap-8">{children}</div>;
}

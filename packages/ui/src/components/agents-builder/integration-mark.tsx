import * as React from 'react';

import { cn } from '../../lib/utils';
import { MarkTile } from '../ai/mark-tile';
import type { Integration } from './types';

type IntegrationMarkProps = {
	integration: Pick<Integration, 'name' | 'mark' | 'color'> | undefined;
	/** Glyph only, for placing inside an existing tile (tool traces, drafts). */
	bare?: boolean;
	size?: 'xs' | 'sm' | 'md';
	className?: string;
};

function monogram(name: string) {
	return name.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || '?';
}

/**
 * App mark for an integration. Hosts pass real brand marks through
 * `integration.mark`; otherwise a monogram tinted with `integration.color`
 * keeps every app recognizable without shipping third-party logos. The tint
 * mixes toward the foreground more in dark mode so dark brand colors stay
 * legible.
 */
function IntegrationMark({ integration, bare, size = 'sm', className }: IntegrationMarkProps) {
	const color = integration?.color;
	const glyph = integration?.mark ?? (
		<span
			className="font-semibold leading-none [--mark-mix:22%] dark:[--mark-mix:50%]"
			style={color ? { color: `color-mix(in oklab, ${color}, var(--foreground) var(--mark-mix))` } : undefined}
		>
			{monogram(integration?.name ?? '')}
		</span>
	);

	if (bare) return glyph;

	return (
		<MarkTile
			data-slot="integration-mark"
			size={size}
			className={cn('text-foreground', className)}
			style={color && !integration?.mark ? { backgroundColor: `color-mix(in oklab, ${color} 14%, var(--card))` } : undefined}
		>
			{glyph}
		</MarkTile>
	);
}

export { IntegrationMark };
export type { IntegrationMarkProps };

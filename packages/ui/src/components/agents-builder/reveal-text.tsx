'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type RevealTextProps = {
	text: string;
	/** While true, characters reveal over `duration` ms; false shows the full text. */
	revealing: boolean;
	duration: number;
	className?: string;
};

/**
 * Typewriter reveal paced to a known duration, so it finishes exactly when the
 * playback engine moves on. The unrevealed tail stays in the layout (invisible)
 * so the paragraph never reflows or pushes content below it.
 */
function RevealText({ text, revealing, duration, className }: RevealTextProps) {
	const [shown, setShown] = React.useState(revealing ? 0 : text.length);

	React.useEffect(() => {
		if (!revealing) {
			setShown(text.length);
			return;
		}
		const start = performance.now();
		let frame = 0;
		const tick = (now: number) => {
			const progress = Math.min(1, (now - start) / duration);
			setShown(Math.round(text.length * progress));
			if (progress < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [duration, revealing, text]);

	return (
		<p className={cn('text-pretty text-sm', className)}>
			{text.slice(0, shown)}
			{shown < text.length ? (
				<span aria-hidden="true" className="text-transparent">
					{text.slice(shown)}
				</span>
			) : null}
		</p>
	);
}

export { RevealText };

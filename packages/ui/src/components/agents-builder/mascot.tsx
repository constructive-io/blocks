'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

/**
 * Greeting mascot: a soft tile whose eyes follow the pointer and blink now and
 * then. Purely decorative; it freezes under reduced motion.
 */
function Mascot({ className }: { className?: string }) {
	const ref = React.useRef<HTMLSpanElement>(null);
	const [look, setLook] = React.useState({ x: 0, y: 0 });
	const [blink, setBlink] = React.useState(false);

	React.useEffect(() => {
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
		let frame = 0;
		const onMove = (event: PointerEvent) => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const box = ref.current?.getBoundingClientRect();
				if (!box) return;
				const dx = event.clientX - (box.left + box.width / 2);
				const dy = event.clientY - (box.top + box.height / 2);
				const distance = Math.hypot(dx, dy) || 1;
				const reach = Math.min(1, distance / 320);
				setLook({ x: (dx / distance) * 4 * reach, y: (dy / distance) * 3 * reach });
			});
		};
		let blinkTimer = 0;
		const scheduleBlink = () => {
			blinkTimer = window.setTimeout(() => {
				setBlink(true);
				window.setTimeout(() => setBlink(false), 140);
				scheduleBlink();
			}, 2600 + Math.random() * 3200);
		};
		scheduleBlink();
		window.addEventListener('pointermove', onMove);
		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(blinkTimer);
			window.removeEventListener('pointermove', onMove);
		};
	}, []);

	return (
		<span
			ref={ref}
			aria-hidden="true"
			className={cn(
				'relative grid size-16 place-items-center overflow-hidden rounded-[18px] shadow-sm',
				'bg-[linear-gradient(155deg,color-mix(in_oklab,var(--primary)_22%,white),color-mix(in_oklab,var(--primary)_55%,white))]',
				'dark:bg-[linear-gradient(155deg,color-mix(in_oklab,var(--primary)_60%,white),var(--primary))]',
				'outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
				className,
			)}
		>
			<span className="absolute inset-x-2 top-1.5 h-5 rounded-full bg-white/35 blur-md" />
			<span
				className="relative flex gap-2.5 transition-transform duration-150 ease-out"
				style={{ transform: `translate(${look.x}px, ${look.y + 4}px)` }}
			>
				{[0, 1].map((eye) => (
					<span
						key={eye}
						className="block h-3.5 w-2 origin-center rounded-full bg-[oklch(0.28_0.03_255)] transition-transform duration-100"
						style={{ transform: `scaleY(${blink ? 0.12 : 1}) rotate(${eye ? 8 : -8}deg)` }}
					/>
				))}
			</span>
		</span>
	);
}

export { Mascot };

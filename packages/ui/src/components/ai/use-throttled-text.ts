'use client';

import { useEffect, useRef, useState } from 'react';

/** Default stream throttle (~15fps) — bounds markdown re-parse cost. */
export const STREAM_THROTTLE_MS = 66;

/**
 * Throttle `text` updates while `streaming` is true; flush immediately when
 * streaming ends so settled content is never delayed.
 */
export function useThrottledText(text: string, streaming: boolean, intervalMs = STREAM_THROTTLE_MS): string {
	const [throttled, setThrottled] = useState(text);
	const latest = useRef(text);
	latest.current = text;
	const lastFlush = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!streaming) {
			if (timer.current) {
				clearTimeout(timer.current);
				timer.current = null;
			}
			setThrottled((prev) => (prev === text ? prev : text));
			return;
		}

		const now = Date.now();
		const elapsed = now - lastFlush.current;
		if (elapsed >= intervalMs) {
			lastFlush.current = now;
			setThrottled(text);
		} else if (timer.current == null) {
			timer.current = setTimeout(() => {
				timer.current = null;
				lastFlush.current = Date.now();
				setThrottled(latest.current);
			}, intervalMs - elapsed);
		}
	}, [text, streaming, intervalMs]);

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);

	return throttled;
}

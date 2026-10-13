'use client';

import * as React from 'react';

/**
 * Whether an `<img>` failed to load, for a fallback such as initials or an icon.
 *
 * `onError` alone misses an image that failed before React was listening: a
 * server-rendered page can hydrate after the browser has already given up on a
 * dead URL, and that `error` event is never replayed. So the ref also checks the
 * element when it mounts. A finished image with no pixels either failed or is an
 * SVG without an intrinsic size (which reports a natural width of 0 as well), and
 * `decode()` tells the two apart; a browser without it counts the image as failed.
 *
 * `failed` stays set for the life of the component that calls the hook, so key
 * that component by the image address and a new address gets a fresh attempt:
 *
 * ```tsx
 * function Photo({ src, fallback }: { src: string; fallback: React.ReactNode }) {
 *   const { failed, ref, onError } = useImageFailed();
 *   return failed ? fallback : <img ref={ref} src={src} onError={onError} alt="" />;
 * }
 * // <Photo key={url} src={url} fallback={<Initials />} />
 * ```
 */
export function useImageFailed() {
	const [failed, setFailed] = React.useState(false);
	const onError = React.useCallback(() => setFailed(true), []);
	const ref = React.useCallback((image: HTMLImageElement | null) => {
		if (!image || !image.complete || image.naturalWidth > 0) return;
		if (typeof image.decode !== 'function') setFailed(true);
		else image.decode().catch(() => setFailed(true));
	}, []);
	return { failed, ref, onError };
}

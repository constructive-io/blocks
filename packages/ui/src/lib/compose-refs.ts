import { useMemo } from 'react';
import type { MutableRefObject, Ref, RefCallback } from 'react';

type PossibleRef<T> = Ref<T> | undefined;

/** Points a ref at `node`, and returns the cleanup a callback ref handed back (React 19), if any. */
function assign<T>(ref: PossibleRef<T>, node: T | null): (() => void) | undefined {
	if (typeof ref === 'function') {
		const cleanup = ref(node);
		return typeof cleanup === 'function' ? cleanup : undefined;
	}
	if (ref) (ref as MutableRefObject<T | null>).current = node;
	return undefined;
}

/**
 * Merges refs into one callback ref and keeps React 19's ref contract for each of them:
 *
 * - a callback ref that returns a cleanup function has that cleanup run on detach, and is never called with `null`;
 * - any other callback ref is called with `null` on detach, and a ref object is set back to `null`.
 *
 * The merged ref only returns a cleanup when one of the refs did. React 18 does not run cleanups (and warns in
 * development when a ref returns one), and with plain refs React 19 calls the merged ref again with `null`, which
 * is how every plain ref gets detached.
 */
export function mergeRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
	return (node) => {
		if (node === null) {
			for (const ref of refs) assign(ref, null);
			return;
		}
		const cleanups = refs.map((ref) => assign(ref, node));
		if (!cleanups.some(Boolean)) return;
		return () => {
			refs.forEach((ref, index) => (cleanups[index] ? cleanups[index]() : assign(ref, null)));
		};
	};
}

/**
 * `mergeRefs` for a component that needs its own ref and also forwards the one it was given. The merged ref is
 * memoized on the refs themselves, so React attaches it once and only again when a ref changes: passing a ref that
 * is stable keeps it from being detached and attached on every render.
 */
export function useMergedRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
	// A component passes the same number of refs on every render, so the list of dependencies never changes length.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => mergeRefs(...refs), refs);
}

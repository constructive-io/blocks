'use client';

import * as React from 'react';

// Layout effects warn during React 18 server rendering; plain effects are enough there.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

/**
 * A ref that always holds the latest value, so memoised callbacks can call
 * the host's newest handlers without listing them as dependencies.
 */
export function useLatest<T>(value: T) {
	const ref = React.useRef(value);
	useIsomorphicLayoutEffect(() => {
		ref.current = value;
	});
	return ref;
}

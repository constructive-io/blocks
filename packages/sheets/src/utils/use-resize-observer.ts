import { useCallback, useRef, useState } from 'react';

interface Size { width: number; height: number; }

export function useResizeObserver<T extends HTMLElement>(): [React.RefCallback<T>, Size] {
	const [size, setSize] = useState<Size>({ width: 0, height: 0 });
	const observerRef = useRef<ResizeObserver | null>(null);

	const ref = useCallback((node: T | null) => {
		if (observerRef.current) {
			observerRef.current.disconnect();
			observerRef.current = null;
		}
		if (node) {
			const observer = new ResizeObserver(([entry]) => {
				if (entry) {
					setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
				}
			});
			observer.observe(node);
			observerRef.current = observer;
		}
	}, []);

	return [ref, size];
}

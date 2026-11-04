import { useEffect, useState } from 'react';

export type ImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

export function useImageStatus(src?: string): ImageStatus {
	const [result, setResult] = useState<{ src: string; status: 'loaded' | 'error' }>();

	useEffect(() => {
		if (!src) return;

		const img = new Image();

		const onLoad = () => setResult({ src, status: 'loaded' });
		const onError = () => setResult({ src, status: 'error' });

		img.addEventListener('load', onLoad);
		img.addEventListener('error', onError);
		img.src = src;

		return () => {
			img.removeEventListener('load', onLoad);
			img.removeEventListener('error', onError);
		};
	}, [src]);

	if (!src) return 'idle';
	return result?.src === src ? result.status : 'loading';
}

'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type AiImageProps = Omit<React.ComponentProps<'img'>, 'src'> & {
	/** Base64 payload without data-url prefix, or full data URL. */
	data?: string;
	mimeType?: string;
	src?: string;
	/** Bytes as Uint8Array. */
	bytes?: Uint8Array;
};

/**
 * Display AI-generated or user-uploaded images from base64 / bytes / URL.
 */
function AiImage({
	data,
	mimeType = 'image/png',
	src,
	bytes,
	alt = '',
	className,
	...props
}: AiImageProps) {
	const resolved = React.useMemo(() => {
		if (src) return src;
		if (data) {
			if (data.startsWith('data:')) return data;
			return `data:${mimeType};base64,${data}`;
		}
		if (bytes) {
			let binary = '';
			bytes.forEach((b) => {
				binary += String.fromCharCode(b);
			});
			return `data:${mimeType};base64,${btoa(binary)}`;
		}
		return undefined;
	}, [src, data, bytes, mimeType]);

	if (!resolved) return null;

	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			data-slot="ai-image"
			src={resolved}
			alt={alt}
			className={cn(
				'max-h-80 max-w-full rounded-lg object-contain',
				'outline outline-1 outline-black/10 dark:outline-white/10',
				className,
			)}
			{...props}
		/>
	);
}

export { AiImage };
export type { AiImageProps };

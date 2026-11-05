// Default native DOM view for the media SheetsCell kinds (image/file/video/audio/upload).
//
// A uniform SQUARE thumbnail with object-fit:cover (center-crop, NOT contain) and
// rounded corners, inset by a small pad. A muted box sits UNDER the <img> so it shows
// through while the image loads AND stands alone when there is no preview. A stored
// projection without a public URL resolves a signed preview through
// `useSheetsMediaUrl`; non-image files and unresolved projections render a file chip.
//
// Virtualization destroys off-screen rows, so the body <img> is recreated on every
// scroll-back. Durable URLs are retained in a module LRU (`warmImage`) so a remounted
// <img> paints without a re-fetch; signed URLs live in the query cache and are never
// warmed. No `loading="lazy"` (it forces a fetch-after-mount on every remount).

import { FileIcon } from 'lucide-react';

import { useSheetsMediaUrl } from '../../hooks/use-sheets-media-url';
import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';
import { formatFileSize, getImageMetadata } from '../../utils/file.utils';
import { warmImage } from '../image-cache';

/** Last path segment of a url (sans query/hash), to label a file chip that has no filename. */
function basename(url: string): string {
	const path = url.split(/[?#]/)[0];
	const seg = path.slice(path.lastIndexOf('/') + 1);
	return seg || url;
}

export function ImageCellView(props: CellProps) {
	const meta = getImageMetadata(props.value);
	const previewImage = props.column.cellType === 'image' || Boolean(meta?.mime.startsWith('image/'));
	const { url, durableUrl, id, isLoading, onImageError, onImageLoad } = useSheetsMediaUrl(props.value, previewImage);

	if ((!previewImage && (id || durableUrl)) || (id && !url && !isLoading)) {
		const filename = meta?.filename && meta.filename !== 'Unknown' ? meta.filename : durableUrl ? basename(durableUrl) : 'File';
		const details = [
			filename,
			meta?.size !== undefined ? formatFileSize(meta.size) : null,
			meta?.mime !== 'unknown' ? meta?.mime : null,
		].filter(Boolean).join(' • ');
		return (
			<div
				data-slot="file-cell"
				role="gridcell"
				aria-readonly={props.readOnlyReason ? true : undefined}
				aria-description={props.readOnlyReason}
				className={cn('flex h-full w-full items-center gap-1.5 overflow-hidden px-2')}
			>
				<FileIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
				<span className="truncate text-sm" title={props.readOnlyReason ? `${details}\n${props.readOnlyReason}` : details}>
					{filename}
				</span>
			</div>
		);
	}

	return (
		<div
			data-slot="image-cell"
			role="gridcell"
			aria-readonly={props.readOnlyReason ? true : undefined}
			aria-description={props.readOnlyReason}
			className={cn('flex h-full w-full items-center overflow-hidden p-1')}
		>
			<div className={cn('relative aspect-square h-full max-h-full overflow-hidden rounded-sm bg-muted')}>
				{url ? (
					<img
						key={url}
						src={url}
						decoding="async"
						alt=""
						onError={onImageError}
						onLoad={() => {
							onImageLoad();
							if (durableUrl) warmImage(durableUrl);
						}}
						className={cn(
							'absolute inset-0 h-full w-full rounded-sm object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
						)}
					/>
				) : null}
			</div>
		</div>
	);
}

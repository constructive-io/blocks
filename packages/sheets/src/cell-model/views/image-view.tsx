// Default native DOM view for the `image` SheetsCell kind. Dependency-light: plain
// JSX + Tailwind v4 + local `cn`, no @constructive-io/ui this phase. Reads the URL
// from the factory payload (`cell.data` is `[url]`).
//
// Mirrors the canvas painter (`grid/draw-image-cell.ts`): a uniform SQUARE
// thumbnail with object-fit:cover (center-crop, NOT contain) and rounded corners,
// inset by a small pad. A muted box sits UNDER the <img> so it shows through
// while the image loads AND stands alone when the url is empty (the canvas drew
// the same placeholder for both the loading and missing-url branches).
//
// Virtualization destroys off-screen rows, so the body <img> is recreated on every
// scroll-back. We retain successfully-loaded URLs in a module LRU (`warmImage`) to
// keep them warm in memory — a remounted <img> paints without a re-fetch. No
// `loading="lazy"` (it forces a fetch-after-mount on every remount).

import { FileIcon } from 'lucide-react';

import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';
import { getImageMetadata } from '../../utils/file.utils';
import { warmImage } from '../image-cache';

function readUrl(data: unknown): string {
	if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
	return '';
}

/** Last path segment of a url (sans query/hash), to label a file chip that has no filename. */
function basename(url: string): string {
	const path = url.split(/[?#]/)[0];
	const seg = path.slice(path.lastIndexOf('/') + 1);
	return seg || url;
}

/**
 * On a non-`image` media column (file/video/audio/upload), render a file chip UNLESS we KNOW
 * the value is an image (an `image/*` mime). Non-image mimes, unknown mimes and bare URL
 * strings all chip — mirroring the editor's stored-value preview so the grid never shows a
 * broken <img> for a document. The `image` column is unaffected (always a thumbnail).
 */
function isNonImageFile(cellType: string, value: unknown): boolean {
	if (cellType === 'image' || value == null) return false;
	const mime = getImageMetadata(value)?.mime;
	return !(mime && mime !== 'unknown' && mime.startsWith('image/'));
}

export function ImageCellView(props: CellProps) {
	const url = readUrl(props.cell.data);

	if (url && isNonImageFile(props.column.cellType, props.value)) {
		const meta = getImageMetadata(props.value);
		const filename = meta?.filename && meta.filename !== 'Unknown' ? meta.filename : basename(url);
		return (
			<div
				data-slot="file-cell"
				role="gridcell"
				className={cn('flex h-full w-full items-center gap-1.5 overflow-hidden px-2')}
			>
				<FileIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
				<span className="truncate text-sm" title={filename}>
					{filename}
				</span>
			</div>
		);
	}

	return (
		<div
			data-slot="image-cell"
			role="gridcell"
			className={cn('flex h-full w-full items-center overflow-hidden p-1')}
		>
			<div className={cn('relative aspect-square h-full max-h-full overflow-hidden rounded-sm bg-muted')}>
				{url ? (
					<img
						src={url}
						decoding="async"
						alt=""
						onLoad={() => warmImage(url)}
						className={cn('absolute inset-0 h-full w-full rounded-sm object-cover')}
					/>
				) : null}
			</div>
		</div>
	);
}

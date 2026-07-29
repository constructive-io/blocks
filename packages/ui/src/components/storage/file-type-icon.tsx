import {
	FileArchiveIcon,
	FileAudioIcon,
	FileIcon,
	FileImageIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	FileTypeIcon as FileDocIcon,
	FileVideoIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

interface FileTypeIconProps {
	/** The object's MIME type, e.g. "image/png". */
	mimeType: string | null | undefined;
	className?: string;
	/** Forwarded to the underlying svg as the accessible label, if any. */
	'aria-label'?: string;
}

/**
 * Maps a MIME type to a representative file icon. Pure — render-only.
 */
function resolveIcon(mimeType: string | null | undefined): LucideIcon {
	if (!mimeType) return FileIcon;
	const lower = mimeType.toLowerCase();

	if (lower.startsWith('image/')) return FileImageIcon;
	if (lower.startsWith('audio/')) return FileAudioIcon;
	if (lower.startsWith('video/')) return FileVideoIcon;

	if (
		lower === 'application/pdf' ||
		lower === 'application/msword' ||
		lower === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	) {
		return FileDocIcon;
	}

	if (
		lower === 'text/csv' ||
		lower === 'application/vnd.ms-excel' ||
		lower === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	) {
		return FileSpreadsheetIcon;
	}

	if (
		lower === 'application/zip' ||
		lower === 'application/x-zip-compressed' ||
		lower === 'application/gzip' ||
		lower === 'application/x-tar' ||
		lower === 'application/x-7z-compressed' ||
		lower === 'application/x-rar-compressed'
	) {
		return FileArchiveIcon;
	}

	if (lower.startsWith('text/') || lower === 'application/json') return FileTextIcon;

	return FileIcon;
}

/**
 * `FileTypeIcon` — a single lucide glyph chosen from a file's MIME type.
 * Defaults to a muted foreground tint; override via `className`.
 */
export function FileTypeIcon({ mimeType, className, ...props }: FileTypeIconProps) {
	const Icon = resolveIcon(mimeType);
	return <Icon aria-hidden className={cn('size-4 shrink-0 text-muted-foreground', className)} {...props} />;
}

import {
	FileArchiveIcon,
	FileAudioIcon,
	FileCodeIcon,
	FileIcon,
	FileImageIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	FileVideoIcon,
	FolderIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import type { Tone } from '../workspace-kit/primitives';
import { IconTile } from '../workspace-kit/surface';
import { fileCategory, type FileCategory } from './utils';

const CATEGORY: Record<FileCategory, { icon: LucideIcon; tone: Tone }> = {
	image: { icon: FileImageIcon, tone: 'info' },
	video: { icon: FileVideoIcon, tone: 'violet' },
	audio: { icon: FileAudioIcon, tone: 'violet' },
	document: { icon: FileTextIcon, tone: 'danger' },
	spreadsheet: { icon: FileSpreadsheetIcon, tone: 'success' },
	archive: { icon: FileArchiveIcon, tone: 'amber' },
	text: { icon: FileCodeIcon, tone: 'neutral' },
	folder: { icon: FolderIcon, tone: 'primary' },
	other: { icon: FileIcon, tone: 'neutral' },
};

interface FileTypeIconProps {
	/** The object's MIME type, e.g. "image/png". */
	mimeType: string | null | undefined;
	className?: string;
	/** Forwarded to the underlying svg as the accessible label, if any. */
	'aria-label'?: string;
}

/**
 * `FileTypeIcon` — a single lucide glyph chosen from a file's MIME type.
 * Defaults to a muted foreground tint; override via `className`.
 */
export function FileTypeIcon({ mimeType, className, ...props }: FileTypeIconProps) {
	const Icon = CATEGORY[fileCategory(mimeType)].icon;
	return <Icon aria-hidden className={cn('size-4 shrink-0 text-muted-foreground', className)} {...props} />;
}

interface FileGlyphProps {
	mimeType?: string | null;
	/** Folders get their own glyph regardless of MIME type. */
	kind?: 'file' | 'folder';
	className?: string;
}

/**
 * `FileGlyph` — the file's icon on a small tile tinted by its family (images
 * blue, documents red, spreadsheets green, archives amber), so a list can be
 * scanned by type before reading names.
 */
export function FileGlyph({ mimeType, kind = 'file', className }: FileGlyphProps) {
	const { icon, tone } = CATEGORY[kind === 'folder' ? 'folder' : fileCategory(mimeType)];
	return <IconTile icon={icon} tone={tone} className={className} />;
}

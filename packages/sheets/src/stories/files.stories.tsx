// Showcase/Files — image, upload, upload-list and attachment cells, the file editor
// and the files-table preview, on the captured torture schema.
//
// The data API and the storage API are the in-memory backends of the upload tests
// (`uploads/__tests__/upload-backends.ts`): the storage service's upload mutation, its
// files table and the presigned PUT (a recording XMLHttpRequest stand-in, installed
// while the story is mounted) all run in the browser. No network. The stored images
// are inline SVG, so thumbnails render offline; a pale one and a dark one show the
// image outline against both themes.
//
// Open a file cell (double-click, Enter or F2) to see the file editor. In "Upload in
// progress" every PUT stays at half way, so the progress bar stays on screen. In "File
// not confirmed" the server never confirms an uploaded file: close the editor while it
// says "Processing file…" and the cell shows that state, then "Not saved" with a retry.
import { useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient } from '@tanstack/react-query';

import type { SheetsConfig } from '../context/sheets-context';
import { SheetsProvider } from '../context/sheets-provider';
import { Sheets } from '../grid/sheets';
import { createUploadBackends, type UploadBackends } from '../uploads/__tests__/upload-backends';

function svgImage(from: string, to: string, mark: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><circle cx="66" cy="30" r="12" fill="${mark}"/></svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Mostly white: without an outline it has no edge on a light page. */
const PALE_SKY = svgImage('#e0f2fe', '#ffffff', '#fef9c3');
/** Mostly black: without an outline it has no edge on a dark page. */
const NIGHT = svgImage('#020617', '#0f172a', '#e2e8f0');
const DUSK = svgImage('#fb923c', '#7c3aed', '#fde68a');
const FIELD = svgImage('#bbf7d0', '#15803d', '#ffffff');

const F1 = '00000000-0000-4000-8000-0000000000f1';
const F2 = '00000000-0000-4000-8000-0000000000f2';
const F3 = '00000000-0000-4000-8000-0000000000f3';

/** Stored images with public URLs, a long file name and a large size, on top of the captured rows. */
function prepareRows(backends: UploadBackends) {
	const rows = backends.data.rows.DomainKind ?? [];
	const first = rows.find((row) => row.id === '00000000-0000-4000-8000-0000000000d1');
	if (first) {
		first.avatar = { id: F1, key: 'avatars/a.png', mime: 'image/png', size: 2048, filename: 'a.png', url: PALE_SKY };
		first.gallery = [
			{ id: F2, key: 'gallery/1.jpg', mime: 'image/jpeg', size: 4096, filename: 'sky.jpg', url: PALE_SKY },
			{ id: F3, key: 'gallery/2.jpg', mime: 'image/jpeg', size: 1_048_576, filename: 'night.jpg', url: NIGHT },
			{ key: 'gallery/3.jpg', mime: 'image/jpeg', size: 734_003, filename: 'dusk.jpg', url: DUSK },
			{ key: 'gallery/4.jpg', mime: 'image/jpeg', size: 12_582_912, filename: 'field.jpg', url: FIELD },
		];
	}
	rows.push({
		id: '00000000-0000-4000-8000-0000000000d3',
		contactEmail: 'files@example.com',
		homepage: null,
		host: null,
		allowedOrigin: 'https://files.example.com',
		avatar: { key: 'avatars/night.png', mime: 'image/png', size: 18_431, filename: 'night.png', url: NIGHT },
		document: {
			url: 'https://cdn.example.com/quarterly-report-with-a-very-long-file-name-final-version.pdf',
			mime: 'application/pdf',
			size: 2_621_440,
			filename: 'quarterly-report-with-a-very-long-file-name-final-version.pdf',
		},
		gallery: [{ key: 'gallery/5.jpg', mime: 'image/jpeg', size: 98_304, filename: 'dusk.jpg', url: DUSK }],
		attachmentLink: 'https://example.com/files/2026/contracts/signed-contract-with-a-long-name.pdf',
	});
}

interface FilesGridProps {
	table: 'DomainKind' | 'AppFile';
	/**
	 * `hang` keeps every PUT at half way, so the progress bar stays on screen.
	 * `unconfirmed` uploads, but the server refuses the cell write until the file is
	 * confirmed, which never happens.
	 */
	uploads: 'complete' | 'hang' | 'unconfirmed';
}

function FilesGrid({ table, uploads }: FilesGridProps) {
	const backends = useMemo(() => {
		const created = createUploadBackends(
			uploads === 'hang'
				? { put: () => 'hang' }
				: uploads === 'unconfirmed'
					? { managedColumns: ['DomainKind.avatar', 'DomainKind.document', 'DomainKind.gallery'] }
					: {},
		);
		prepareRows(created);
		return created;
	}, [uploads]);

	// The presigned PUT goes through XMLHttpRequest; the stand-in plays it while the story is mounted.
	useEffect(() => {
		const original = window.XMLHttpRequest;
		window.XMLHttpRequest = backends.FakeXhr as typeof XMLHttpRequest;
		return () => {
			window.XMLHttpRequest = original;
		};
	}, [backends]);

	const config = useMemo<SheetsConfig>(
		() => ({
			endpoint: 'mock://files',
			auth: { mode: 'embedded', getToken: () => 'story', getIdentityKey: () => 'story-user' },
			execute: backends.data.execute,
			storage: { endpoint: 'mock://storage', execute: backends.storage.execute },
			// Short waits, so an unconfirmed file reaches "Not saved" in a few seconds.
			upload: { processing: { timeoutMs: 6000, initialDelayMs: 500, maxDelayMs: 1000 } },
			queryClient: new QueryClient({
				defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
			}),
		}),
		[backends],
	);

	return (
		<div style={{ height: 520, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
			<SheetsProvider key={`${table}:${uploads}`} config={config}>
				<Sheets tableName={table} __impl='dom' showSelection showPagination pageSize={25} />
			</SheetsProvider>
		</div>
	);
}

const meta: Meta<typeof FilesGrid> = {
	title: 'Showcase/Files',
	component: FilesGrid,
	parameters: { layout: 'fullscreen' },
	args: { table: 'DomainKind', uploads: 'complete' },
	argTypes: {
		table: { control: 'inline-radio', options: ['DomainKind', 'AppFile'] },
		uploads: { control: 'inline-radio', options: ['complete', 'hang', 'unconfirmed'] },
	},
};

export default meta;

type Story = StoryObj<typeof FilesGrid>;

/** Image thumbnails, file chips, lists of uploads with their count, attachment links and empty cells. */
export const Files: Story = {};

/** Every upload stays at half way, so the file editor shows its progress bar. */
export const UploadInProgress: Story = { args: { uploads: 'hang' } };

/** The server never confirms an uploaded file: the cell shows "Processing file…", then "Not saved" with a retry. */
export const FileNotConfirmed: Story = { args: { uploads: 'unconfirmed' } };

/** The storage files table: each row gets a preview column with the file and a download link. */
export const FilesTable: Story = { args: { table: 'AppFile' } };

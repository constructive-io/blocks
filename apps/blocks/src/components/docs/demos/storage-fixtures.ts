// Shared, realistic sample data for the Storage ui demos. Static only —
// ported from the packages/ui storage stories. Docs harness only.

import type { StorageBucket, StorageObject, UploadItem } from '@constructive-io/ui/storage';

// A tiny inline SVG data URL so image previews render without a network call.
export const SAMPLE_IMAGE_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
			<defs>
				<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stop-color="#6366f1"/>
					<stop offset="1" stop-color="#22d3ee"/>
				</linearGradient>
			</defs>
			<rect width="320" height="320" fill="url(#g)"/>
			<circle cx="160" cy="130" r="56" fill="#ffffff" opacity="0.9"/>
			<rect x="40" y="210" width="240" height="20" rx="10" fill="#ffffff" opacity="0.7"/>
			<rect x="40" y="244" width="160" height="16" rx="8" fill="#ffffff" opacity="0.5"/>
		</svg>`,
  );

export const buckets: StorageBucket[] = [
  {
    id: 'bucket-public',
    key: 'public-assets',
    visibility: 'public',
    isPublic: true,
    allowCustomKeys: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxFileSize: 10 * 1024 * 1024,
    allowedOrigins: ['https://app.example.com'],
    description: 'Publicly served images and brand assets.',
    provisioned: true,
    objectCount: 8,
    createdAt: '2026-05-02T09:12:00.000Z',
  },
  {
    id: 'bucket-private',
    key: 'user-uploads',
    visibility: 'private',
    isPublic: false,
    allowCustomKeys: false,
    allowedMimeTypes: [],
    maxFileSize: null,
    allowedOrigins: [],
    description: 'Private per-user uploads.',
    provisioned: true,
    objectCount: 3,
    createdAt: '2026-05-20T14:30:00.000Z',
  },
  {
    id: 'bucket-temp',
    key: 'tmp-exports',
    visibility: 'temp',
    isPublic: false,
    allowCustomKeys: false,
    allowedMimeTypes: ['text/csv', 'application/zip'],
    maxFileSize: 50 * 1024 * 1024,
    allowedOrigins: [],
    description: 'Short-lived export artifacts.',
    provisioned: false,
    objectCount: null,
    createdAt: '2026-06-18T11:00:00.000Z',
  },
];

export const objects: StorageObject[] = [
  {
    id: 'obj-1',
    bucketId: 'bucket-public',
    key: 'images/hero-banner.png',
    filename: 'hero-banner.png',
    mimeType: 'image/png',
    size: 482_133,
    isPublic: true,
    status: 'processed',
    createdAt: '2026-06-21T10:15:00.000Z',
    updatedAt: '2026-06-21T10:16:00.000Z',
    downloadUrl: SAMPLE_IMAGE_URL,
  },
  {
    id: 'obj-2',
    bucketId: 'bucket-public',
    key: 'docs/getting-started.pdf',
    filename: 'getting-started.pdf',
    mimeType: 'application/pdf',
    size: 1_204_887,
    isPublic: true,
    status: 'processed',
    createdAt: '2026-06-20T08:42:00.000Z',
    downloadUrl: null,
  },
  {
    id: 'obj-3',
    bucketId: 'bucket-public',
    key: 'docs/contract.docx',
    filename: 'contract.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 88_421,
    isPublic: false,
    status: 'uploaded',
    createdAt: '2026-06-19T16:05:00.000Z',
  },
  {
    id: 'obj-4',
    bucketId: 'bucket-public',
    key: 'data/export-2026-06.csv',
    filename: 'export-2026-06.csv',
    mimeType: 'text/csv',
    size: 24_998,
    isPublic: false,
    status: 'processed',
    createdAt: '2026-06-18T12:30:00.000Z',
  },
  {
    id: 'obj-5',
    bucketId: 'bucket-public',
    key: 'archives/site-backup.zip',
    filename: 'site-backup.zip',
    mimeType: 'application/zip',
    size: 18_446_744,
    isPublic: false,
    status: 'processed',
    createdAt: '2026-06-15T22:10:00.000Z',
  },
  {
    id: 'obj-6',
    bucketId: 'bucket-public',
    key: 'audio/welcome.mp3',
    filename: 'welcome.mp3',
    mimeType: 'audio/mpeg',
    size: 3_551_204,
    isPublic: true,
    status: 'processed',
    createdAt: '2026-06-14T09:00:00.000Z',
  },
];

export const uploads: UploadItem[] = [
  { id: 'up-1', filename: 'annual-report.pdf', size: 2_400_000, progress: 100, status: 'done' },
  { id: 'up-2', filename: 'product-shot.png', size: 5_120_000, progress: 64, status: 'uploading' },
  { id: 'up-3', filename: 'dataset.csv', size: 980_000, progress: 0, status: 'queued' },
  {
    id: 'up-4',
    filename: 'huge-archive.zip',
    size: 1_200_000_000,
    progress: 0,
    status: 'error',
    error: 'File exceeds the 50 MB limit',
  },
];

export const imageObject = objects[0];

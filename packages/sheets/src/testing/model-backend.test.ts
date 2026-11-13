// The model backend is the test server every lane builds on, so its storage
// and relation-filter behavior is pinned here against the captured schema.
//
// Failure modes covered: an upload input the schema rejects passes; a new files
// row is not visible to list reads; a live row at the same key is not a dedup
// hit; a bucket rule (MIME type, size) is not applied; the configured failure
// or dedup option is ignored; a write that references a file row that is not
// live succeeds, or fails with an error shaped unlike the server's guard; a
// rejected upload becomes live; a create that leaves out a column with a
// default stores a made-up value or null for it; a relation filter (to-one, to-many quantifiers, exists) is
// ignored or refused.
import { describe, expect, it } from 'vitest';

import type { ModelBackendUploadOptions } from './model-backend';
import { createPostGraphileAdapter } from '../adapter/postgraphile-adapter';
import { createTortureBackend } from '../adapter/__tests__/torture-backend';
import { responseErrorsOf } from '../context/sheets-execute';

const UPLOAD = /* GraphQL */ `
	mutation Upload($input: UploadAppFileInput!) {
		uploadAppFile(input: $input) { uploadUrl uploadHeaders fileId key deduplicated expiresAt file }
	}
`;

const hash = (character: string) => character.repeat(64);

async function setup(uploads?: ModelBackendUploadOptions) {
	const backend = createTortureBackend({ uploads });
	const adapter = createPostGraphileAdapter();
	const meta = await adapter.fetchMeta(backend.execute);
	const model = (name: string) => adapter.fetchTableModel(backend.execute, meta, name);
	const upload = (input: Record<string, unknown>) =>
		backend.execute<{ uploadAppFile: Record<string, unknown> }>(UPLOAD, { input }).then((data) => data.uploadAppFile);
	return { backend, adapter, model, upload };
}

describe('model backend storage uploads', () => {
	it('creates a files row that list reads see, with the headers the PUT must send', async () => {
		const { backend, adapter, model, upload } = await setup();
		const files = await model('AppFile');

		const payload = await upload({ contentHash: hash('c'), contentType: 'image/png', size: 10, filename: 'c.png', isPublic: true });
		const listed = await adapter.listRows({ model: files, tableName: files.name }, { limit: 50 }, backend.execute);

		expect(payload).toMatchObject({
			deduplicated: false,
			key: hash('c'),
			uploadUrl: expect.stringContaining(String(payload.fileId)),
			uploadHeaders: { 'Content-Type': 'image/png', 'x-amz-meta-upload-id': payload.fileId, 'x-amz-checksum-sha256': expect.any(String) },
			file: { id: payload.fileId, key: hash('c'), mime: 'image/png', size: 10, filename: 'c.png', url: expect.any(String) },
		});
		expect(listed.rows.find((row) => row.id === payload.fileId)).toMatchObject({ key: hash('c'), mimeType: 'image/png', status: 'uploaded' });
		expect(backend.uploads.map((entry) => entry.outcome)).toEqual(['requested']);
		expect(backend.mutations.map((entry) => entry.op)).toEqual(['upload']);
	});

	it('deduplicates a live file, and on request every file', async () => {
		const live = await setup();
		await live.upload({ contentHash: hash('d'), contentType: 'image/png', size: 10, isPublic: true });
		await expect(live.upload({ contentHash: hash('d'), contentType: 'image/png', size: 10, isPublic: true }))
			.resolves.toMatchObject({ deduplicated: true, uploadUrl: null, uploadHeaders: null });

		const forced = await setup({ deduplicated: true });
		await expect(forced.upload({ contentHash: hash('e'), contentType: 'image/png', size: 10, isPublic: true }))
			.resolves.toMatchObject({ deduplicated: true, uploadUrl: null });
	});

	it('applies the bucket rules and the configured failure', async () => {
		const { upload } = await setup({
			failure: (input) => (input.filename === 'broken.png' ? { message: 'Storage is down', code: 'STORAGE_DOWN' } : null),
		});

		await expect(upload({ contentHash: hash('f'), contentType: 'text/html', size: 10, isPublic: true }))
			.rejects.toThrow('CONTENT_TYPE_NOT_ALLOWED');
		await expect(upload({ contentHash: hash('f'), contentType: 'image/png', size: 20_000_000, isPublic: true }))
			.rejects.toThrow('FILE_TOO_LARGE');
		await expect(upload({ contentHash: 'not-a-hash', contentType: 'image/png', size: 10 }))
			.rejects.toThrow('INVALID_CONTENT_HASH_FORMAT');
		await expect(upload({ contentHash: hash('f'), contentType: 'image/png', size: 10, filename: 'broken.png' }))
			.rejects.toMatchObject({ code: 'STORAGE_DOWN' });
		await expect(upload({ contentHash: hash('f'), contentType: 'image/png', size: 10 })).resolves.toMatchObject({ deduplicated: false });
	});

	it('refuses writes that reference a file that is not live yet, as the server does', async () => {
		const { backend, adapter, model, upload } = await setup({ notLiveForWrites: 2 });
		const domains = await model('DomainKind');
		const ctx = { model: domains, tableName: domains.name };
		const [row] = (await adapter.listRows(ctx, { limit: 1 }, backend.execute)).rows;
		const { file, fileId } = await upload({ contentHash: hash('a'), contentType: 'image/png', size: 10, isPublic: true });

		for (let attempt = 0; attempt < 2; attempt += 1) {
			const error = await adapter.updateRow(ctx, row!.id as string, { avatar: file }, backend.execute).catch((caught: unknown) => caught);
			expect(error).toMatchObject({ code: 'FILE_REF_FILE_NOT_LIVE' });
			// The server's guard: the bare code as the message, and the field, file and status as context.
			expect(responseErrorsOf(error)?.[0]).toMatchObject({
				message: 'FILE_REF_FILE_NOT_LIVE',
				extensions: { code: 'FILE_REF_FILE_NOT_LIVE', class: 'public', context: { field: 'avatar', file_id: fileId, status: 'requested' } },
			});
		}
		await expect(adapter.updateRow(ctx, row!.id as string, { avatar: file }, backend.execute))
			.resolves.toMatchObject({ avatar: file });
	});

	it('keeps a rejected upload not live, so every write that references it fails with status rejected', async () => {
		const { backend, adapter, model, upload } = await setup({ rejectUpload: (input) => input.filename === 'tampered.png' });
		const domains = await model('DomainKind');
		const ctx = { model: domains, tableName: domains.name };
		const [row] = (await adapter.listRows(ctx, { limit: 1 }, backend.execute)).rows;
		const { file, fileId } = await upload({ contentHash: hash('b'), contentType: 'image/png', size: 10, filename: 'tampered.png', isPublic: true });
		backend.confirmUpload(String(fileId));

		for (let attempt = 0; attempt < 3; attempt += 1) {
			const error = await adapter.updateRow(ctx, row!.id as string, { avatar: file }, backend.execute).catch((caught: unknown) => caught);
			expect(responseErrorsOf(error)?.[0]?.extensions).toMatchObject({
				code: 'FILE_REF_FILE_NOT_LIVE',
				context: { field: 'avatar', file_id: fileId, status: 'rejected' },
			});
		}
	});
});

describe('model backend writes', () => {
	it('leaves a left-out column with a default absent, since the real default is unknown', async () => {
		const { backend, adapter, model } = await setup();
		const tasks = await model('Task');
		// `Task.status` cannot be null and has a default the captured schema does not describe.
		await expect(
			adapter.createRow({ model: tasks, tableName: tasks.name }, { projectId: 1, title: 'New task' }, backend.execute),
		).rejects.toThrow('Cannot return null for non-nullable field Task.status');
		const stored = backend.rows.Task!.at(-1)!;
		expect(stored).toMatchObject({ projectId: 1, title: 'New task', dueOn: null });
		expect(stored).not.toHaveProperty('status');
	});
});

describe('model backend relation filters', () => {
	it('filters by a linked record, by quantifiers over linked records, and by existence', async () => {
		const { backend, adapter, model } = await setup();
		const projects = await model('Project');
		const ctx = { model: projects, tableName: projects.name };
		const names = async (where: Record<string, unknown>) =>
			(await adapter.listRows(ctx, { where, limit: 50 }, backend.execute)).rows.map((row) => row.name).sort();
		const all = await names({});
		const withTasks = await names({ tasks: { some: {} } });
		const withoutTasks = await names({ tasks: { none: {} } });

		expect([...withTasks, ...withoutTasks].sort()).toEqual(all);
		expect(await names({ tasksExist: true })).toEqual(withTasks);
		expect(await names({ tasksExist: false })).toEqual(withoutTasks);
		expect(await names({ tasks: { every: { title: { isNull: false } } } })).toEqual(all);

		const countries = backend.rows.Country!;
		const country = countries.find((candidate) => backend.rows.Project!.some((project) => project.countryCode === candidate.isoCode))!;
		const inCountry = backend.rows.Project!.filter((project) => project.countryCode === country.isoCode).map((project) => project.name).sort();
		expect(await names({ country: { isoCode: { equalTo: country.isoCode } } })).toEqual(inCountry);
		expect(await names({ countryExists: false })).toEqual(
			backend.rows.Project!.filter((project) => project.countryCode == null).map((project) => project.name).sort(),
		);
	});

	it('searches the text columns and supports the negated and list operators', async () => {
		const { backend, adapter, model } = await setup();
		const scalars = await model('ScalarKind');
		const arrays = await model('ArrayKind');
		const read = async (tableModel: typeof scalars, where: Record<string, unknown>) =>
			(await adapter.listRows({ model: tableModel, tableName: tableModel.name }, { where, limit: 50 }, backend.execute)).rows;
		const labelled = backend.rows.ScalarKind!.find((row) => typeof row.label === 'string' && String(row.label).length > 2)!;
		const fragment = String(labelled.label).slice(1, 3).toUpperCase();

		expect((await read(scalars, { unifiedSearch: fragment })).map((row) => row.id)).toContain(labelled.id);
		expect(await read(scalars, { label: { notStartsWithInsensitive: String(labelled.label).slice(0, 1) } }))
			.not.toContainEqual(expect.objectContaining({ id: labelled.id }));
		expect(await read(scalars, { label: { inInsensitive: [String(labelled.label).toUpperCase()] } }))
			.toContainEqual(expect.objectContaining({ id: labelled.id }));
		const listed = backend.rows.ArrayKind!.find((row) => Array.isArray(row.intList) && (row.intList as unknown[]).length > 0)!;
		const first = (listed.intList as number[])[0];
		expect((await read(arrays, { intList: { overlaps: [first] } })).map((row) => row.id)).toContain(listed.id);
		expect((await read(arrays, { intList: { containedBy: listed.intList } })).map((row) => row.id)).toContain(listed.id);
	});
});

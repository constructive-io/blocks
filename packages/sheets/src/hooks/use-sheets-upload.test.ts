// `executeFieldUpload`, the public one-call upload for a single-file column,
// against the model backend over the captured torture schema (`DomainKind`).
// The file goes out through the injected `send`; the cell write goes through
// the adapter on the data executor.
import { buildClientSchema } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { createTableModelResolver, type TableModel } from '@constructive-io/data';

import { tortureIntrospection, tortureMeta, tortureRows } from '../adapter/__tests__/torture-backend';
import { createPostGraphileAdapter } from '../adapter/postgraphile-adapter';
import type { FileProjection } from '../context/sheets-upload-presigned';
import { createModelBackend } from '../testing/model-backend';
import type { SendFile } from '../uploads/column-storage';
import { executeFieldUpload } from './use-sheets-upload';

const D2 = '00000000-0000-4000-8000-0000000000d2';
const projection: FileProjection = {
	id: '00000000-0000-4000-8000-0000000000f1',
	key: 'avatars/a.png',
	bucket_id: '00000000-0000-4000-8000-0000000000b1',
	mime: 'image/png',
	size: 5,
	filename: 'asset.png',
};
const publicUrl = 'https://cdn.local/avatars/a.png';
const file = new File(['hello'], 'asset.png', { type: 'image/png' });

async function setup() {
	const meta = tortureMeta('v2');
	const backend = createModelBackend({ schema: buildClientSchema(tortureIntrospection('v2')), meta, rows: tortureRows(meta) });
	const table: TableModel = await createTableModelResolver(meta).resolve(backend.execute, 'DomainKind');
	const updates = () => backend.mutations.filter((mutation) => mutation.op === 'update');
	return { backend, table, updates, adapter: createPostGraphileAdapter() };
}

describe('executeFieldUpload', () => {
	it('sends the file and writes the returned projection into the row', async () => {
		const { backend, table, updates, adapter } = await setup();
		const send = vi.fn<SendFile>().mockResolvedValue(projection);

		await expect(executeFieldUpload({ table, column: 'avatar', rowKey: D2 }, file, { execute: backend.execute, adapter, send }))
			.resolves.toEqual(projection);
		expect(send).toHaveBeenCalledWith(file, expect.objectContaining({}));
		expect(updates().map(({ variables }) => variables)).toEqual([{ input: { id: D2, domainKindPatch: { avatar: projection } } }]);
	});

	it('stores a link column as the projection public URL', async () => {
		const { backend, table, updates, adapter } = await setup();
		const send = vi.fn<SendFile>().mockResolvedValue({ ...projection, url: publicUrl });

		await expect(executeFieldUpload({ table, column: 'attachmentLink', rowKey: D2 }, file, { execute: backend.execute, adapter, send }))
			.resolves.toBe(publicUrl);
		expect(updates()[0]!.variables).toEqual({ input: { id: D2, domainKindPatch: { attachmentLink: publicUrl } } });
	});

	it('writes nothing into a link column when the file has no public address', async () => {
		const { backend, table, updates, adapter } = await setup();
		const send = vi.fn<SendFile>().mockResolvedValue(projection);

		await expect(executeFieldUpload({ table, column: 'attachmentLink', rowKey: D2 }, file, { execute: backend.execute, adapter, send }))
			.rejects.toThrow('needs a public bucket');
		expect(updates()).toEqual([]);
	});

	it('clears the cell by writing null without sending anything', async () => {
		const { backend, table, updates, adapter } = await setup();
		const send = vi.fn<SendFile>();

		await expect(executeFieldUpload({ table, column: 'avatar', rowKey: D2 }, null, { execute: backend.execute, adapter, send }))
			.resolves.toBeNull();
		expect(updates()[0]!.variables).toEqual({ input: { id: D2, domainKindPatch: { avatar: null } } });
		expect(send).not.toHaveBeenCalled();
	});

	it('refuses a row key without its key field before sending the file', async () => {
		const { backend, table, updates, adapter } = await setup();
		const send = vi.fn<SendFile>();

		await expect(executeFieldUpload({ table, column: 'avatar', rowKey: { notTheKey: 'x' } }, file, { execute: backend.execute, adapter, send }))
			.rejects.toThrow('no value for id');
		expect(send).not.toHaveBeenCalled();
		expect(updates()).toEqual([]);
	});

	it('keeps the storage error and writes nothing when sending fails', async () => {
		const { backend, table, updates, adapter } = await setup();
		const error = new Error('Storage unavailable');
		const send = vi.fn<SendFile>().mockRejectedValue(error);

		await expect(executeFieldUpload({ table, column: 'avatar', rowKey: D2 }, file, { execute: backend.execute, adapter, send }))
			.rejects.toBe(error);
		expect(updates()).toEqual([]);
	});

	it('refuses a list column, which takes its whole list', async () => {
		const { backend, table, adapter } = await setup();
		const send = vi.fn<SendFile>();

		await expect(executeFieldUpload({ table, column: 'gallery', rowKey: D2 }, file, { execute: backend.execute, adapter, send }))
			.rejects.toThrow('write the whole list');
		expect(send).not.toHaveBeenCalled();
	});
});

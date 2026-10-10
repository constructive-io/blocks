import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	DATA_ROOMS_DEMO,
	DataRooms,
	type DataRoomsAction,
	type DataRoomsCommand,
	type DataRoomsData,
	type DataRoomsProps,
} from '../src/components/data-rooms';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() { return []; }
}

let root: Root;
let container: HTMLDivElement;
let props: DataRoomsProps;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('IntersectionObserver', NoopObserver);
	vi.stubGlobal('matchMedia', (media: string) => ({
		media, matches: false, onchange: null,
		addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
	}));
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.unstubAllGlobals();
});

async function render(next: Partial<DataRoomsProps>) {
	props = { data: DATA_ROOMS_DEMO, ...next };
	await act(async () => root.render(<DataRooms {...props} />));
}

async function update(next: Partial<DataRoomsProps>) {
	props = { ...props, ...next };
	await act(async () => root.render(<DataRooms {...props} />));
}

function button(name: string | RegExp, scope: ParentNode = document.body) {
	const found = [...scope.querySelectorAll<HTMLButtonElement>('button')].find((element) => {
		const visible = element.cloneNode(true) as HTMLElement;
		visible.querySelectorAll('[aria-hidden="true"]').forEach((child) => child.remove());
		const label = element.getAttribute('aria-label') ?? visible.textContent?.trim() ?? '';
		return typeof name === 'string' ? label === name || element.textContent?.trim() === name : name.test(label);
	});
	if (!found) throw new Error(`Missing button: ${name}`);
	return found;
}

function panel(title: string) {
	const heading = [...document.body.querySelectorAll('h2')].find((element) => element.textContent === title);
	const region = heading?.closest('section');
	if (!region) throw new Error(`Missing section: ${title}`);
	return region;
}

function field(label: string, scope: ParentNode = document.body) {
	const found = [...scope.querySelectorAll<HTMLLabelElement>('label')].find((element) => element.textContent?.trim().startsWith(label));
	const control = found && document.getElementById(found.htmlFor);
	if (!control) throw new Error(`Missing field: ${label}`);
	return control as HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement;
}

async function click(element: HTMLElement) {
	await act(async () => element.click());
}

async function type(label: string, value: string, scope?: ParentNode) {
	const control = field(label, scope);
	if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) throw new Error(`Field is not text: ${label}`);
	await act(async () => {
		const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
		Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(control, value);
		control.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function choose(label: string, option: string) {
	await click(field(label));
	const found = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find((element) => element.textContent?.trim() === option);
	if (!found) throw new Error(`Missing option: ${option}`);
	await act(async () => {
		found.focus();
		found.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	});
}

const room = { defaultView: 'room', defaultRoomId: 'room-atlas' } as const;
const text = () => container.textContent ?? '';

// Failure analysis precedes this suite in /tmp/blocks-test-audit/data-rooms-followup.txt.
// These public workflows protect rejected writes, analytics scope and selection/actor isolation.
describe('DataRooms public workflows', () => {
	it('keeps rejected settings drafts and applies saved protection, role and agreement changes to readers', async () => {
		const onCommand = vi.fn<(command: DataRoomsCommand) => Promise<void>>()
			.mockRejectedValueOnce(new Error('Room service is unavailable.'))
			.mockResolvedValue(undefined);
		await render({ ...room, defaultTab: 'settings', onCommand });
		await type('Name', 'Atlas final diligence', panel('Room'));
		await click(button('Save', panel('Room')));
		expect(panel('Room').querySelector('[role="alert"]')?.textContent).toBe('Room service is unavailable.');
		expect(field('Name', panel('Room'))).toHaveProperty('value', 'Atlas final diligence');
		expect(container.querySelector('h1')?.textContent).toBe('Project Atlas');
		await click(button('Save', panel('Room')));
		expect(onCommand).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'update-room', roomId: 'room-atlas', patch: expect.objectContaining({ name: 'Atlas final diligence' }) }));
		expect(container.querySelector('h1')?.textContent).toBe('Atlas final diligence');
		expect(button('Save', panel('Room')).disabled).toBe(true);

		onCommand.mockRejectedValueOnce(new Error('Protection could not be saved.'));
		await click(field('View only'));
		expect(field('View only')).toHaveProperty('checked', false);
		expect(panel('Protection').querySelector('[role="alert"]')?.textContent).toBe('Protection could not be saved.');
		await click(field('View only'));
		expect(onCommand).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'update-room', patch: { policies: { restricted: true, viewOnly: true, watermark: true, requireAgreement: true } } }));
		expect(field('View only')).toHaveProperty('checked', true);

		await click(button(/^Viewer/, panel('Roles')));
		await click(button('Advanced: permissions', panel('Roles')));
		await click(field('Upload', panel('Roles')));
		onCommand.mockRejectedValueOnce(new Error('Role could not be saved.'));
		await click(button('Save role', panel('Roles')));
		expect(panel('Roles').querySelector('[role="alert"]')?.textContent).toBe('Role could not be saved.');
		expect(field('Upload', panel('Roles'))).toHaveProperty('checked', true);
		expect(button(/^Viewer/, panel('Roles')).textContent).toMatch(/3\s*of\s*10/);
		await click(button('Save role', panel('Roles')));
		expect(onCommand).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'save-role', role: expect.objectContaining({ id: 'role-viewer', permissions: expect.arrayContaining(['view', 'download', 'upload', 'ask_assistant']) }) }));
		expect(button(/^Viewer/, panel('Roles')).textContent).toMatch(/4\s*of\s*10/);

		await update({ previewAs: 'person-dana' });
		expect(button('Upload').disabled).toBe(true);
		await click(button('02 Financials'));
		await click(button('Audited accounts FY2025.pdf'));
		expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Watermarked for Dana Chen');
		expect([...document.body.querySelector('[role="dialog"]')!.querySelectorAll('button')].some((element) => element.textContent?.trim() === 'Download')).toBe(false);
		await click(button('Close', document.body.querySelector('[role="dialog"]')!));
		await update({ previewAs: null });
		await click(button('Settings'));
		await type('Terms', 'Updated clean-team terms for final diligence.', panel('Agreement'));
		onCommand.mockRejectedValueOnce(new Error('Agreement could not be saved.'));
		await click(button('Save and ask everyone again'));
		expect(panel('Agreement').textContent).toContain('Version 2');
		expect(field('Terms', panel('Agreement'))).toHaveProperty('value', 'Updated clean-team terms for final diligence.');
		expect(panel('Agreement').querySelector('[role="alert"]')?.textContent).toBe('Agreement could not be saved.');
		await click(button('Save and ask everyone again'));
		expect(onCommand).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'update-room', roomId: 'room-atlas', patch: { agreement: expect.objectContaining({ version: 3, body: 'Updated clean-team terms for final diligence.' }) } }));
		expect(panel('Agreement').textContent).toContain('Version 3');
		await update({ previewAs: 'person-dana' });
		expect(text()).toContain('The agreement changed since you accepted version 2');
		expect(text()).toContain('Updated clean-team terms for final diligence.');
		expect(text()).not.toContain('Audited accounts FY2025.pdf');
	});

	it('aggregates only the selected room and reading window, then drills into the correct document and reader', async () => {
		const activity: DataRoomsData['activity'] = [
			{ id: 'current-1', roomId: 'room-atlas', actorId: 'person-dana', kind: 'view', documentId: 'doc-audited', at: '2026-09-24T10:00:00.000Z', seconds: 70 },
			{ id: 'current-2', roomId: 'room-atlas', actorId: 'person-dana', kind: 'view', documentId: 'doc-audited', at: '2026-09-23T10:00:00.000Z', seconds: 10 },
			{ id: 'previous', roomId: 'room-atlas', actorId: 'person-owen', kind: 'view', documentId: 'doc-management-accounts', at: '2026-09-16T10:00:00.000Z', seconds: 30 },
			{ id: 'download', roomId: 'room-atlas', actorId: 'person-dana', kind: 'download', documentId: 'doc-audited', at: '2026-09-24T11:00:00.000Z' },
			{ id: 'previous-download', roomId: 'room-atlas', actorId: 'person-owen', kind: 'download', documentId: 'doc-management-accounts', at: '2026-09-16T11:00:00.000Z' },
			{ id: 'other-room', roomId: 'room-board', actorId: 'person-james', kind: 'view', documentId: 'doc-board-agenda', at: '2026-09-24T10:00:00.000Z', seconds: 9000 },
			{ id: 'old', roomId: 'room-atlas', actorId: 'person-kai', kind: 'view', documentId: 'doc-valuation-model', at: '2026-09-01T10:00:00.000Z', seconds: 9000 },
			{ id: 'future', roomId: 'room-atlas', actorId: 'person-priya', kind: 'view', documentId: 'doc-spa', at: '2026-09-25T10:00:00.000Z', seconds: 9000 },
		];
		const onAction = vi.fn<(action: DataRoomsAction) => void>();
		await render({ ...room, defaultTab: 'insights', data: { ...DATA_ROOMS_DEMO, activity }, onAction });
		expect(panel('Last 14 days').textContent).toMatch(/Views\s*3\s*\+100% vs prior week/);
		expect(panel('Last 14 days').textContent).toMatch(/Downloads\s*2\s*Same as prior week/);
		expect(panel('Last 14 days').textContent).toMatch(/Active readers\s*2\s*Same as prior week/);
		expect(panel('Last 14 days').textContent).toMatch(/Reading time\s*1m 50s\s*\+167% vs prior week/);
		expect([...panel('Most read documents').querySelector('tbody tr')!.querySelectorAll('td')].slice(0, 4).map((cell) => cell.textContent?.trim())).toEqual(['Audited accounts FY2025.pdf', '2', '1', '1']);
		expect(panel('Most read documents').textContent).not.toContain('Valuation model');
		expect(panel('Most read documents').textContent).not.toContain('Board');
		await act(async () => button(/^Sep 24: 1 views?, 1 downloads?$/).focus());
		expect(panel('Reading over the last 14 days').textContent).toContain('Sep 24 · 1 view · 1 download');
		await click(button(/^Kestrel Partners/, panel('Engagement by company')));
		expect(panel('Engagement by company').textContent).toContain('Dana Chen');
		expect(panel('Engagement by company').textContent).toContain('Owen Hart');
		await click(button('Dana Chen', panel('Engagement by company')));
		expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Dana Chen');
		expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Project Atlas');
		await click(button('Close', document.body.querySelector('[role="dialog"]')!));
		await click(button('Audited accounts FY2025.pdf', panel('Most read documents')));
		expect(onAction).toHaveBeenLastCalledWith({ type: 'view-document', documentId: 'doc-audited' });
		expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Audited accounts FY2025.pdf');
	});

	it('keeps access-map selection separate from the owner and recomputes reach only after inheritance is saved', async () => {
		const onCommand = vi.fn<(command: DataRoomsCommand) => Promise<void>>()
			.mockRejectedValueOnce(new Error('Inheritance could not be saved.'))
			.mockResolvedValue(undefined);
		await render({ defaultView: 'access-map', data: { ...DATA_ROOMS_DEMO, viewerId: 'person-elliot' }, onCommand });
		await choose('Show access for', 'Hana Kim');
		expect(text().match(/Can enter [^.]+\./g)).toEqual(['Can enter 1 of 4 rooms.']);
		expect(button('Open Project Atlas').textContent).toContain('Not carried in: restricted room');
		expect(field('Members carry down')).toHaveProperty('disabled', false);
		await click(field('Members carry down'));
		expect(panel('Inheritance').querySelector('[role="alert"]')?.textContent).toBe('Inheritance could not be saved.');
		expect(field('Members carry down')).toHaveProperty('checked', true);
		expect(text()).toContain('Can enter 1 of 4 rooms.');
		await click(field('Members carry down'));
		expect(onCommand).toHaveBeenLastCalledWith({ type: 'update-inheritance', inheritance: { owners: true, admins: true, members: false, allowGuests: true } });
		expect(field('Members carry down')).toHaveProperty('checked', false);
		expect(text()).toContain('Can enter 0 of 4 rooms.');
		await choose('Show access for', 'Elliot Brandt');
		expect(text()).toContain('Can enter 4 of 4 rooms.');
		await choose('Show access for', 'Everyone');
		expect(text()).not.toContain('Can enter');
		await click(button('Open Project Atlas'));
		expect(container.querySelector('h1')?.textContent).toBe('Project Atlas');
		expect(button('Settings').disabled).toBe(false);
	});

	it('routes home attention into its room and keeps activity filtering, export and document navigation scoped', async () => {
		const onAction = vi.fn<(action: DataRoomsAction) => void>();
		const onRoomChange = vi.fn();
		const onTabChange = vi.fn();
		const activity: DataRoomsData['activity'] = [
			{ id: 'read-atlas', roomId: 'room-atlas', actorId: 'person-dana', kind: 'view', documentId: 'doc-audited', at: '2026-09-24T10:00:00.000Z', seconds: 70 },
			{ id: 'read-lumen', roomId: 'room-lumen', actorId: 'person-lena', kind: 'view', documentId: 'doc-lumen-deck', at: '2026-09-23T10:00:00.000Z', seconds: 90 },
			{ id: 'invite-atlas', roomId: 'room-atlas', actorId: 'person-maya', kind: 'invite', subjectId: 'person-hana', at: '2026-09-24T11:00:00.000Z' },
			{ id: 'private-board', roomId: 'room-board', actorId: 'person-james', kind: 'settings', at: '2026-09-24T12:00:00.000Z', detail: 'Private board change' },
		];
		await render({ data: { ...DATA_ROOMS_DEMO, activity }, onAction, onRoomChange, onTabChange });
		expect(text()).toContain('Welcome back, Maya');
		expect(text()).not.toContain('Private board change');
		await click(button(/Owen Hart’s access to .*Financials ends/, panel('Needs attention')));
		expect(onRoomChange).toHaveBeenLastCalledWith('room-atlas');
		expect(onTabChange).toHaveBeenLastCalledWith('people');
		expect(container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('People');
		await click(button('Activity'));
		expect(text()).toContain('Dana Chen viewed Audited accounts FY2025.pdf for 1m 10s');
		expect(text()).not.toContain('Private board change');
		await click(button(/^Reading/));
		expect(text()).not.toContain('Maya Okafor invited');
		await choose('Room', 'Project Atlas');
		expect(text()).not.toContain('Lena Fischer viewed');
		expect(text()).toContain('Dana Chen viewed');
		await click(button('Export'));
		expect(onAction).toHaveBeenLastCalledWith({ type: 'export-activity', roomId: 'room-atlas' });
		await click(button('Audited accounts FY2025.pdf'));
		expect(onAction).toHaveBeenLastCalledWith({ type: 'view-document', documentId: 'doc-audited' });
		expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Audited accounts FY2025.pdf');
	});
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
	applyDataRoomsCommand,
	canEnterRoom,
	createIdMaker,
	DATA_ROOMS_DEMO,
	describeGrant,
	describeIgnored,
	effectiveAccess,
	leadsUnit,
	managesAnything,
	needsAgreement,
	visibleActivity,
	visibleQuestions,
	visibleDocuments,
	type DataRoomsData,
} from '../src/components/data-rooms';

const demo = DATA_ROOMS_DEMO;
const room = (personId: string, roomId = 'room-atlas', data: DataRoomsData = demo) => effectiveAccess(data, personId, { kind: 'room', roomId });
const doc = (personId: string, documentId: string, data: DataRoomsData = demo) => effectiveAccess(data, personId, { kind: 'document', documentId });

describe('data rooms access', () => {
	it('carries owners and admins down through sub-organizations into rooms', () => {
		const elliot = room('person-elliot');
		expect(elliot.level).toBe('owner');
		expect(elliot.permissions).toContain('manage_room');
		expect(describeGrant(demo, elliot.grants[0]!)).toBe('Owner of Northwind Holdings, carried through Fund II');

		const maya = room('person-maya');
		expect(maya.level).toBe('admin');
		expect(maya.grants).toEqual([expect.objectContaining({ kind: 'membership', level: 'admin', scope: { kind: 'unit', id: 'unit-fund-2' } })]);
		expect(maya.ignored).toEqual([expect.objectContaining({ reason: 'restricted', scope: { kind: 'unit', id: 'unit-northwind' } })]);
	});

	it('keeps plain members out of restricted rooms but lets them into open ones', () => {
		const atlas = room('person-hana');
		expect(atlas.level).toBe('none');
		expect(atlas.ignored).toEqual([expect.objectContaining({ reason: 'restricted', level: 'member' })]);
		expect(describeIgnored(demo, atlas.ignored[0]!)).toBe('Member of Fund II, but this room only admits people added to it');

		const lumen = room('person-hana', 'room-lumen');
		expect(lumen.level).toBe('member');
		expect(lumen.permissions).toEqual(['view', 'download', 'ask_assistant']);
	});

	it('stops member inheritance when the organization turns it off', () => {
		const strict = { ...demo, inheritance: { ...demo.inheritance, members: false } };
		expect(room('person-hana', 'room-lumen', strict).ignored[0]?.reason).toBe('not-inherited');
		expect(room('person-maya', 'room-lumen', strict).level).toBe('admin');
	});

	it('limits folder shares to their subtree and ignores them once expired', () => {
		expect(doc('person-owen', 'doc-audited').permissions).toEqual(['view', 'download']);
		expect(doc('person-owen', 'doc-spa').permissions).toEqual([]);
		expect(canEnterRoom(demo, 'person-owen', 'room-atlas')).toBe(true);
		expect(room('person-owen').grants[0]).toMatchObject({ kind: 'share', partial: true });

		expect(visibleDocuments(demo, 'person-kai', 'room-atlas').map((document) => document.id)).toEqual(['doc-valuation-model', 'doc-model-assumptions']);

		expect(canEnterRoom(demo, 'person-marco', 'room-atlas')).toBe(false);
		expect(doc('person-marco', 'doc-audited').ignored).toEqual([expect.objectContaining({ reason: 'expired' })]);
	});

	it('drops downloads on view-only documents for everyone who does not manage the room', () => {
		const dana = doc('person-dana', 'doc-valuation-model');
		expect(dana.permissions).not.toContain('download');
		expect(dana.limits).toEqual([{ reason: 'view-only', removed: ['download'] }]);
		expect(doc('person-grace', 'doc-valuation-model').permissions).toContain('download');
	});

	it('removes every write permission from read-only members', () => {
		const lena = room('person-lena', 'room-lumen');
		expect(lena.permissions).toEqual(['view', 'download', 'ask_assistant']);
		const upgraded = applyDataRoomsCommand(
			demo,
			{ type: 'update-membership', membershipId: 'mem-lena-lumen', patch: { roleId: 'role-editor' } },
			{ actorId: 'person-dev', now: demo.clock, id: createIdMaker() },
		);
		expect(room('person-lena', 'room-lumen', upgraded).permissions).not.toContain('upload');
		expect(room('person-lena', 'room-lumen', upgraded).limits[0]?.reason).toBe('read-only');
	});

	it('asks for the agreement again when its version moves past what someone accepted', () => {
		expect(needsAgreement(demo, 'person-dana', 'room-atlas')).toBe(false);
		expect(needsAgreement(demo, 'person-owen', 'room-atlas')).toBe(true);
		expect(needsAgreement(demo, 'person-maya', 'room-atlas')).toBe(false);
	});

	it('grants new access as soon as a share or invite is applied', () => {
		const make = createIdMaker();
		const shared = applyDataRoomsCommand(
			demo,
			{ type: 'create-share', roomId: 'room-atlas', folder: '/03 Legal', personIds: ['person-kai'], can: { view: true, edit: false, delete: false } },
			{ actorId: 'person-maya', now: demo.clock, id: make },
		);
		expect(visibleDocuments(shared, 'person-kai', 'room-atlas').map((document) => document.folder)).toContain('/03 Legal/Contracts');

		const invited = applyDataRoomsCommand(
			demo,
			{ type: 'invite', roomId: 'room-atlas', invites: [{ email: 'hana@northwind.co' }], roleId: 'role-viewer' },
			{ actorId: 'person-maya', now: demo.clock, id: make },
		);
		expect(room('person-hana', 'room-atlas', invited).level).toBe('member');
	});

	it('lets guests read only their own company’s questions while managers read every thread', () => {
		const titles = (personId: string) => visibleQuestions(demo, personId, 'room-atlas').map((question) => question.id).sort();
		expect(titles('person-dana')).toEqual(['question-change-of-control', 'question-concentration', 'question-revenue-bridge']);
		expect(titles('person-priya')).toEqual(['question-depot-lease']);
		expect(titles('person-grace')).toHaveLength(4);
	});

	it('shows activity from managed rooms plus a person’s own actions', () => {
		expect(visibleActivity(demo, 'person-dana').every((event) => event.actorId === 'person-dana')).toBe(true);
		expect(visibleActivity(demo, 'person-maya').some((event) => event.actorId === 'person-dana' && event.roomId === 'room-atlas')).toBe(true);
		expect(visibleActivity(demo, 'person-maya').some((event) => event.roomId === 'room-board' && event.actorId !== 'person-maya')).toBe(false);
	});

	it('treats unit leadership as inherited, and room managers as managers too', () => {
		expect(leadsUnit(demo, 'person-maya', 'unit-fund-2')).toBe(true);
		expect(leadsUnit(demo, 'person-maya', 'unit-northwind')).toBe(false);
		expect(leadsUnit(demo, 'person-elliot', 'unit-fund-2')).toBe(true);
		expect(leadsUnit({ ...demo, inheritance: { ...demo.inheritance, owners: false } }, 'person-elliot', 'unit-fund-2')).toBe(false);
		expect(managesAnything(demo, 'person-grace')).toBe(true);
		expect(managesAnything(demo, 'person-dana')).toBe(false);
	});
});

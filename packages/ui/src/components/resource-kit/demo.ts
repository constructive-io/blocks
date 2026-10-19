import { Building2, HandCoins, type LucideIcon, Tag, Users } from 'lucide-react';

import { createMemoryJunction, createMemorySource } from './memory-source';
import { defineResource, type AnyResource } from './types';

/** The demo's clock, so relative dates read the same everywhere. */
export const CRM_DEMO_NOW = '2026-10-19T09:00:00.000Z';

export type CrmCompany = { id: string; name: string; domain: string | null; industry: string | null; employees: number | null; annualRevenue: number | null; createdAt: string };
export type CrmContact = {
	id: string;
	fullName: string;
	email: string;
	phone: string | null;
	companyId: string | null;
	stage: string;
	birthday: string | null;
	lastContactedAt: string | null;
	notes: string | null;
	ownerId: string;
	createdAt: string;
};
export type CrmDeal = { id: string; title: string; companyId: string; contactId: string | null; amount: number; status: string; closeDate: string | null; probability: number | null; createdAt: string };
export type CrmTag = { id: string; name: string; createdAt: string };

export type CrmDemoData = {
	companies: CrmCompany[];
	contacts: CrmContact[];
	deals: CrmDeal[];
	tags: CrmTag[];
	/** Contact and tag ids linked through the junction. */
	contactTags: [string, string][];
};

/** A small deterministic generator, so the demo is identical on the server and in the browser. */
function seeded(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const FIRST = ['Ava', 'Noah', 'Mia', 'Liam', 'Zoe', 'Ethan', 'Isla', 'Leo', 'Nora', 'Kai', 'Ruth', 'Omar', 'Lena', 'Theo', 'Ines'];
const LAST = ['Patel', 'Nguyen', 'Garcia', 'Okafor', 'Schmidt', 'Rossi', 'Kim', 'Haddad', 'Silva', 'Novak', 'Larsen', 'Moreau'];
const COMPANIES = ['Northwind', 'Bluebird Labs', 'Harbor & Pine', 'Quill Health', 'Atlas Freight', 'Cobalt Bank', 'Juniper Retail', 'Orbit Robotics', 'Fable Foods', 'Meridian Energy'];
const INDUSTRIES = ['saas', 'retail', 'healthcare', 'finance', 'manufacturing'];
const STAGES = ['lead', 'qualified', 'customer', 'churned'];
const STATUSES = ['open', 'open', 'won', 'lost'];
const TAGS = ['Decision maker', 'Champion', 'Technical', 'Budget holder', 'Event lead', 'Renewal'];

const day = (offsetDays: number) => new Date(Date.parse(CRM_DEMO_NOW) + offsetDays * 86_400_000).toISOString();
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** The demo's rows: ten companies, their contacts and deals, and tags on contacts. */
export function crmDemoData(): CrmDemoData {
	const random = seeded(7);
	const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
	const companies: CrmCompany[] = COMPANIES.map((name, index) => ({
		id: `co-${index + 1}`,
		name,
		domain: `https://${slug(name)}.example.com`,
		industry: INDUSTRIES[index % INDUSTRIES.length]!,
		employees: Math.round(20 + random() * 4000),
		annualRevenue: Math.round(500_000 + random() * 40_000_000),
		createdAt: day(-400 + index * 31),
	}));
	const contacts: CrmContact[] = Array.from({ length: 36 }, (_, index) => {
		const first = FIRST[index % FIRST.length]!;
		const last = LAST[(index * 7) % LAST.length]!;
		const company = companies[index % companies.length]!;
		return {
			id: `ct-${index + 1}`,
			fullName: `${first} ${last}`,
			email: `${first}.${last}@${slug(company.name)}.example.com`.toLowerCase(),
			phone: index % 3 === 0 ? null : `+1 415 555 ${String(1000 + index * 37).slice(-4)}`,
			companyId: index % 11 === 10 ? null : company.id,
			stage: pick(STAGES),
			birthday: index % 4 === 0 ? `19${70 + (index % 25)}-0${1 + (index % 9)}-1${index % 9}` : null,
			lastContactedAt: index % 5 === 4 ? null : day(-Math.round(random() * 60)),
			notes: index % 4 === 1 ? 'Prefers email. Asked for a security review before the pilot.\nFollow up after the quarterly planning cycle.' : null,
			ownerId: 'user-1',
			createdAt: day(-300 + index * 7),
		};
	});
	const deals: CrmDeal[] = Array.from({ length: 24 }, (_, index) => {
		const contact = contacts[(index * 5) % contacts.length]!;
		const companyId = contact.companyId ?? companies[0]!.id;
		const company = companies.find((candidate) => candidate.id === companyId)!;
		return {
			id: `dl-${index + 1}`,
			title: `${company.name} ${pick(['renewal', 'expansion', 'pilot', 'platform deal', 'add-on seats'])}`,
			companyId,
			contactId: index % 6 === 5 ? null : contact.id,
			amount: Math.round(2_000 + random() * 180_000),
			status: STATUSES[index % STATUSES.length]!,
			closeDate: index % 7 === 6 ? null : day(-30 + Math.round(random() * 120)).slice(0, 10),
			probability: Math.round(random() * 100) / 100,
			createdAt: day(-200 + index * 6),
		};
	});
	const tags: CrmTag[] = TAGS.map((name, index) => ({ id: `tg-${index + 1}`, name, createdAt: day(-500 + index) }));
	const contactTags = contacts.flatMap((contact, index): [string, string][] =>
		index % 3 === 2 ? [] : [[contact.id, tags[index % tags.length]!.id], ...(index % 4 === 0 ? [[contact.id, tags[(index + 2) % tags.length]!.id] as [string, string]] : [])],
	);
	return { companies, contacts, deals, tags, contactTags };
}

export const CRM_DEMO_ICONS: Record<string, LucideIcon> = { building: Building2, users: Users, 'hand-coins': HandCoins, tag: Tag };

const createdAt = { name: 'createdAt', label: 'Created', input: 'datetime', format: 'relative', readOnly: true } as const;

/**
 * Four related resources over in-memory sources: companies, contacts (belong
 * to a company, tagged many-to-many), deals (belong to a company and a
 * contact), and tags. Pass `data` to swap the rows, e.g. for worst cases.
 */
export function createCrmDemo({ data = crmDemoData(), latency = 0 }: { data?: CrmDemoData; latency?: number } = {}): AnyResource[] {
	const junction = createMemoryJunction(data.contactTags);
	const stamp = () => ({ createdAt: new Date().toISOString() });
	const companies = defineResource<CrmCompany>({
		name: 'companies',
		label: 'Companies',
		singular: 'Company',
		icon: 'building',
		primaryKey: 'id',
		titleField: 'name',
		columns: ['name', 'industry', 'employees', 'annualRevenue', 'createdAt'],
		formFields: ['name', 'domain', 'industry', 'employees', 'annualRevenue'],
		searchFields: ['name', 'domain'],
		defaultSort: { field: 'name', direction: 'asc' },
		fields: {
			id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
			name: { name: 'name', label: 'Name', input: 'text', required: true },
			domain: { name: 'domain', label: 'Website', input: 'url', placeholder: 'https://example.com' },
			industry: {
				name: 'industry',
				label: 'Industry',
				input: 'select',
				options: [
					{ value: 'saas', label: 'Software' },
					{ value: 'retail', label: 'Retail' },
					{ value: 'healthcare', label: 'Healthcare' },
					{ value: 'finance', label: 'Finance' },
					{ value: 'manufacturing', label: 'Manufacturing' },
				],
			},
			employees: { name: 'employees', label: 'Employees', input: 'integer' },
			annualRevenue: { name: 'annualRevenue', label: 'Annual revenue', input: 'currency' },
			createdAt,
		},
		source: createMemorySource(data.companies, { searchFields: ['name', 'domain'], latency, onCreate: stamp }),
	});
	const contacts = defineResource<CrmContact>({
		name: 'contacts',
		label: 'Contacts',
		singular: 'Contact',
		icon: 'users',
		primaryKey: 'id',
		titleField: 'fullName',
		columns: ['fullName', 'companyId', 'stage', 'email', 'tags', 'lastContactedAt'],
		formFields: ['fullName', 'email', 'phone', 'companyId', 'stage', 'tags', 'birthday', 'lastContactedAt', 'notes'],
		searchFields: ['fullName', 'email'],
		defaultSort: { field: 'fullName', direction: 'asc' },
		fields: {
			id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
			fullName: { name: 'fullName', label: 'Name', input: 'text', required: true },
			email: { name: 'email', label: 'Email', input: 'email', required: true },
			phone: { name: 'phone', label: 'Phone', input: 'text' },
			companyId: { name: 'companyId', label: 'Company', input: 'relation', relation: { resource: 'companies' } },
			stage: {
				name: 'stage',
				label: 'Stage',
				input: 'select',
				required: true,
				options: [
					{ value: 'lead', label: 'Lead', tone: 'info' },
					{ value: 'qualified', label: 'Qualified', tone: 'warning' },
					{ value: 'customer', label: 'Customer', tone: 'success' },
					{ value: 'churned', label: 'Churned', tone: 'danger' },
				],
			},
			tags: { name: 'tags', label: 'Tags', input: 'relation', relation: { resource: 'tags', many: true } },
			birthday: { name: 'birthday', label: 'Birthday', input: 'date' },
			lastContactedAt: { name: 'lastContactedAt', label: 'Last contacted', input: 'datetime' },
			notes: { name: 'notes', label: 'Notes', input: 'textarea', description: 'Only your team sees notes.' },
			ownerId: { name: 'ownerId', label: 'Owner', input: 'uuid', hidden: true },
			createdAt,
		},
		source: createMemorySource(data.contacts, { searchFields: ['fullName', 'email'], latency, links: { tags: junction.left }, onCreate: () => ({ ...stamp(), ownerId: 'user-1' }) }),
	});
	const deals = defineResource<CrmDeal>({
		name: 'deals',
		label: 'Deals',
		singular: 'Deal',
		icon: 'hand-coins',
		primaryKey: 'id',
		titleField: 'title',
		columns: ['title', 'status', 'amount', 'companyId', 'contactId', 'closeDate'],
		formFields: ['title', 'companyId', 'contactId', 'amount', 'status', 'closeDate', 'probability'],
		searchFields: ['title'],
		defaultSort: { field: 'closeDate', direction: 'asc' },
		fields: {
			id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
			title: { name: 'title', label: 'Title', input: 'text', required: true },
			companyId: { name: 'companyId', label: 'Company', input: 'relation', required: true, relation: { resource: 'companies' } },
			contactId: { name: 'contactId', label: 'Contact', input: 'relation', relation: { resource: 'contacts' } },
			amount: { name: 'amount', label: 'Amount', input: 'currency', required: true },
			status: {
				name: 'status',
				label: 'Status',
				input: 'select',
				required: true,
				options: [
					{ value: 'open', label: 'Open', tone: 'info' },
					{ value: 'won', label: 'Won', tone: 'success' },
					{ value: 'lost', label: 'Lost', tone: 'danger' },
				],
			},
			closeDate: { name: 'closeDate', label: 'Close date', input: 'date' },
			probability: { name: 'probability', label: 'Probability', input: 'number', format: 'percent', description: 'A fraction, e.g. 0.4 for 40%.' },
			createdAt,
		},
		source: createMemorySource(data.deals, { searchFields: ['title'], latency, onCreate: stamp }),
	});
	const tags = defineResource<CrmTag>({
		name: 'tags',
		label: 'Tags',
		singular: 'Tag',
		icon: 'tag',
		primaryKey: 'id',
		titleField: 'name',
		columns: ['name', 'contacts', 'createdAt'],
		formFields: ['name', 'contacts'],
		searchFields: ['name'],
		defaultSort: { field: 'name', direction: 'asc' },
		fields: {
			id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
			name: { name: 'name', label: 'Name', input: 'text', required: true },
			contacts: { name: 'contacts', label: 'Contacts', input: 'relation', relation: { resource: 'contacts', many: true } },
			createdAt,
		},
		source: createMemorySource(data.tags, { searchFields: ['name'], latency, links: { contacts: junction.right }, onCreate: stamp }),
	});
	return [companies, contacts, deals, tags];
}

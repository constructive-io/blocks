/**
 * Worst-case CRM rows for the resource kit, shaped exactly like
 * `crmDemoData()` in `components/resource-kit/demo.ts`. Every value is one a
 * real tenant could store: names in any script, emails with nothing to break
 * on, rows with every optional field missing, a company with a twelve-figure
 * revenue, a deal at 142%, and a table with ten thousand contacts.
 */
import { CRM_DEMO_NOW, type CrmCompany, type CrmContact, type CrmDeal, type CrmDemoData, type CrmTag, crmDemoData } from '../../components/resource-kit';
import { emails, identifiers, labels, manyRows, names, tags as tagNames } from './worst-case';

const day = (offsetDays: number) => new Date(Date.parse(CRM_DEMO_NOW) + offsetDays * 86_400_000).toISOString();

const companies: CrmCompany[] = [
	{ id: 'co-1', name: 'Northwind Industries Holdings International Group (EMEA & APAC Regional Operations)', domain: identifiers.url, industry: 'finance', employees: 1_000_000, annualRevenue: 123_456_789_012, createdAt: day(-3) },
	{ id: 'co-2', name: identifiers.snakeIdentifier, domain: null, industry: null, employees: null, annualRevenue: null, createdAt: day(-900) },
	{ id: 'co-3', name: '株式会社サンプル商事', domain: 'https://例え.jp', industry: 'retail', employees: 0, annualRevenue: -42.5, createdAt: day(-1) },
	{ id: 'co-4', name: 'شركة المثال للتجارة', domain: null, industry: 'healthcare', employees: 1, annualRevenue: 0, createdAt: day(-40) },
	{ id: 'co-5', name: '🦊 Fox & Co.', domain: 'https://fox.example', industry: 'saas', employees: 12, annualRevenue: 0.1 + 0.2, createdAt: day(-10) },
	{ id: 'co-6', name: 'J', domain: null, industry: 'unknown-industry-from-an-old-import', employees: 3, annualRevenue: 1284, createdAt: day(-2) },
];

const people = [names.longHyphenated, names.longSuffix, names.vietnamese, names.cjk, names.rtl, names.apostrophe, names.particles, names.oneLetter, names.emojiFirst, names.zwjEmoji, names.extraSpaces, names.lowercase];
const mailboxes = [emails.long, emails.plus, emails.subdomains, emails.short, 'ngoc.han@công-ty.vn', 'nour@example.ae'];

const contacts: CrmContact[] = people.map((fullName, index) => ({
	id: `ct-${index + 1}`,
	fullName,
	email: mailboxes[index % mailboxes.length]!,
	phone: index % 2 ? null : '+44 20 7946 0958 ext. 12345',
	companyId: index === 3 ? null : index === 5 ? 'co-missing' : companies[index % companies.length]!.id,
	stage: index === 7 ? 'archived-legacy-stage' : ['lead', 'qualified', 'customer', 'churned'][index % 4]!,
	birthday: index % 3 ? null : '1900-02-28',
	lastContactedAt: index % 2 ? null : day(-index * 400),
	notes: index === 0 ? labels.longDescription : index === 1 ? labels.markup : index === 2 ? labels.multiline : null,
	ownerId: 'user-1',
	createdAt: day(-index),
}));

const deals: CrmDeal[] = [
	{ id: 'dl-1', title: `${companies[0]!.name} — multi-year enterprise platform renewal with retroactive seat true-up`, companyId: 'co-1', contactId: 'ct-1', amount: 12_345_678.9, status: 'open', closeDate: '2026-12-31', probability: 1.42, createdAt: day(-5) },
	{ id: 'dl-2', title: labels.german, companyId: 'co-2', contactId: null, amount: 0, status: 'lost', closeDate: null, probability: null, createdAt: day(-6) },
	{ id: 'dl-3', title: 'x', companyId: 'co-missing', contactId: 'ct-missing', amount: -42.5, status: 'won', closeDate: '1999-01-01', probability: -0.03, createdAt: day(-7) },
	{ id: 'dl-4', title: names.cjk, companyId: 'co-3', contactId: 'ct-4', amount: 1, status: 'pending-legal-review-before-signature', closeDate: '2026-10-19', probability: 0.5, createdAt: day(-8) },
];

const tags: CrmTag[] = tagNames.map((name, index) => ({ id: `tg-${index + 1}`, name, createdAt: day(-index) }));

/** Every contact carries every tag, so linked-record cells overflow. */
const contactTags = contacts.flatMap((contact) => tags.map((tag): [string, string] => [contact.id, tag.id]));

export const worstCrm: CrmDemoData = { companies, contacts, deals, tags, contactTags };

export const emptyCrm: CrmDemoData = { companies: [], contacts: [], deals: [], tags: [], contactTags: [] };

const demo = crmDemoData();
export const oneCrm: CrmDemoData = {
	companies: demo.companies.slice(0, 1),
	contacts: demo.contacts.slice(0, 1).map((contact) => ({ ...contact, companyId: demo.companies[0]!.id })),
	deals: demo.deals.slice(0, 1).map((deal) => ({ ...deal, companyId: demo.companies[0]!.id, contactId: demo.contacts[0]!.id })),
	tags: demo.tags.slice(0, 1),
	contactTags: [[demo.contacts[0]!.id, demo.tags[0]!.id]],
};

/** Ten thousand contacts and deals: pagination, counts, and search over a real-sized table. */
export const hugeCrm: CrmDemoData = {
	...demo,
	contacts: manyRows(10_000, (index) => ({
		...demo.contacts[index % demo.contacts.length]!,
		id: `ct-${index + 1}`,
		fullName: `${demo.contacts[index % demo.contacts.length]!.fullName} ${index + 1}`,
	})),
	deals: manyRows(10_000, (index) => ({ ...demo.deals[index % demo.deals.length]!, id: `dl-${index + 1}`, title: `${demo.deals[index % demo.deals.length]!.title} #${index + 1}` })),
};

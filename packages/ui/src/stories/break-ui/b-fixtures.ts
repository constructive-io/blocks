import { emails, identifiers, labels, manyRows, names, tags } from './worst-case';

/**
 * Shared option fixtures for the group-B (inputs and pickers) break-ui stories.
 * Every label is a value a real catalog, directory, or file list could contain.
 */
export type Option = { value: string; label: string; description?: string };

export const demoOptions: Option[] = [
	{ value: 'viewer', label: 'Viewer', description: 'Can view' },
	{ value: 'editor', label: 'Editor', description: 'Can edit' },
	{ value: 'admin', label: 'Admin', description: 'Can manage' },
	{ value: 'owner', label: 'Owner', description: 'Full access' },
];

/** Spread across rows: long compound, unbreakable, CJK, RTL, emoji, blank, markup, duplicates. */
export const worstOptions: Option[] = [
	{ value: 'german', label: labels.german, description: labels.status },
	{ value: 'job', label: labels.jobTitle, description: emails.long },
	{ value: 'file', label: identifiers.fileName },
	{ value: 'camera', label: identifiers.cameraFile, description: identifiers.uuid },
	{ value: 'email', label: emails.long },
	{ value: 'url', label: identifiers.url },
	{ value: 'french', label: labels.french },
	{ value: 'snake', label: identifiers.snakeIdentifier },
	{ value: 'cjk', label: names.cjk },
	{ value: 'rtl', label: names.rtl },
	{ value: 'emoji', label: names.zwjEmoji },
	{ value: 'vietnamese', label: names.vietnamese },
	{ value: 'markup', label: labels.markup },
	{ value: 'one', label: 'J' },
	{ value: 'blank', label: labels.blank },
	{ value: 'acme-1', label: 'Acme' },
	{ value: 'acme-2', label: 'Acme' },
	{ value: 'untitled', label: '' },
	{ value: 'multiline', label: labels.multiline },
];

const companies = [
	'Northwind Industries Holdings',
	'Acme',
	'Globex Corporation (EMEA)',
	'Initech Software Solutions GmbH',
	'Umbrella Logistics & Freight',
	'Wiśniewska-Kowalczyk Sp. z o.o.',
];

/** The "unpaginated 1,000 rows" state. Labels are mixed length so row heights vary. */
export const manyOptions: Option[] = manyRows(1000, (index) => ({
	value: `ws_${String(index + 1).padStart(4, '0')}`,
	label: `Workspace ${index + 1} - ${companies[index % companies.length]}`,
	description: index % 7 === 0 ? `owner${index + 1}@${emails.long.split('@')[1]}` : undefined,
}));

export const caption = {
	fontSize: 11,
	lineHeight: 1.3,
	color: 'var(--muted-foreground, #666)',
	marginBottom: 4,
	fontFamily: 'system-ui, sans-serif',
} as const;

/** Tag-like options for chip inputs: 12 realistic tags including the long one. */
export const demoTags: Option[] = ['design', 'frontend', 'q3', 'urgent'].map((tag) => ({ value: tag, label: tag }));
export const worstTags: Option[] = tags.map((tag) => ({ value: tag, label: tag }));
export const manyTags: Option[] = manyRows(1000, (index) => ({
	value: `team-${index + 1}`,
	label: `team-${index + 1}-${['platform', 'growth', 'billing', 'enterprise-onboarding'][index % 4]}`,
}));

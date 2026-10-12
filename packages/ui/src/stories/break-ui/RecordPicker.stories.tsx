import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RecordPicker } from '../../components/record-picker';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';
import { emails, labels, manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/RecordPicker',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Customer = { id: string; name?: string; email?: string; title?: string };

const demo: Customer[] = [
	{ id: 'cus_01', name: 'Ada Lovelace', email: 'ada@analytical.dev' },
	{ id: 'cus_02', name: 'Grace Hopper', email: 'grace@compiler.io' },
	{ id: 'cus_03', name: 'Katherine Johnson', email: 'kj@orbital.dev' },
	{ id: 'cus_04', name: 'Margaret Hamilton', email: 'margaret@apollo.dev' },
];

// Optional fields are missing across rows, as they are in imported contact lists.
const worst: Customer[] = [
	{ id: 'w_01', name: names.longHyphenated, email: emails.long },
	{ id: 'w_02', name: names.longSuffix, email: emails.plus },
	{ id: 'w_03', email: emails.subdomains },
	{ id: 'w_04', name: names.cjk, email: emails.short },
	{ id: 'w_05', name: names.rtl },
	{ id: 'w_06', name: names.zwjEmoji, email: 'priya@example.com' },
	{ id: 'w_07', name: names.oneLetter, email: 'j@example.org' },
	{ id: 'w_08', name: names.extraSpaces, email: 'sam.lee@example.com' },
	{ id: 'w_09', name: labels.markup, email: 'markup@example.com' },
	{ id: 'w_10', name: 'Acme', email: 'billing@acme.example.com' },
	{ id: 'w_11', name: 'Acme', email: 'ops@acme.example.com' },
	{ id: 'w_12' },
	{ id: 'w_13', name: labels.jobTitle, title: labels.jobTitle },
];

const huge: Customer[] = manyRows(1000, (index) => ({
	id: `cus_${String(index + 1).padStart(4, '0')}`,
	name: `Customer ${index + 1} ${index % 5 === 0 ? names.longHyphenated : ''}`.trim(),
	email: `customer.${index + 1}@${emails.long.split('@')[1]}`,
}));

// A defensive consumer: never prints "undefined", falls back to the id.
const label = (record: Customer) => [record.name?.trim(), record.email].filter(Boolean).join(' - ') || '';

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

function Picker({ records, linked, searchFields }: { records: Customer[]; linked: string[]; searchFields?: string[] }) {
	const [linkedIds, setLinkedIds] = useState(() => new Set(linked));
	return (
		<div className="rounded-md border p-3">
			<RecordPicker
				records={records}
				linkedRecordIds={linkedIds}
				isLinking={false}
				getRecordId={(record: Customer) => record.id}
				getRecordLabel={label}
				searchFields={searchFields}
				placeholder="Search customers"
				onLink={(record: Customer) => setLinkedIds((current) => new Set(current).add(record.id))}
			/>
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: [] as Customer[],
			one: [demo[0]],
			huge,
		});
		const linked = data.slice(1, 3).map((record) => record.id);

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 56 }}>
				<Cell title="Dialog 480px, default searchFields, 2 linked" width={480}>
					<div data-testid="rp-480">
						<Picker records={data} linked={linked} />
					</div>
				</Cell>
				<Cell title="Sidebar 280px, searchFields name + email" width={280}>
					<div data-testid="rp-280">
						<Picker records={data} linked={linked} searchFields={['name', 'email']} />
					</div>
				</Cell>
				<Cell title="Every record already linked, 320px" width={320}>
					<div data-testid="rp-all-linked">
						<Picker records={data} linked={data.map((record) => record.id)} searchFields={['name', 'email']} />
					</div>
				</Cell>
			</div>
		);
	},
};

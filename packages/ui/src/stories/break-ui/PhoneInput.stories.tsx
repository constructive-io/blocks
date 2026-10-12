import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PhoneInput, type PhoneCountry, type PhoneInputLabels } from '../../components/phone-input';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';

const meta: Meta = {
	title: 'Break UI/PhoneInput',
	parameters: { breakUi: true },
};
export default meta;

// Real E.164 numbers; the worst case uses the countries whose names and calling codes are longest.
const demo = {
	value: '+12025550143',
	country: 'US' as PhoneCountry,
	labels: undefined as Partial<PhoneInputLabels> | undefined,
};
const worst = {
	// Saint Helena, Ascension and Tristan da Cunha (+290) - the longest English country name in the list.
	value: '+2907012',
	country: 'SH' as PhoneCountry,
	// Longer UI copy, as a translation of the picker would produce.
	labels: {
		country: 'Land der Telefonnummer: {{country}}',
		countryFallback: 'Land',
		search: 'Land oder Landesvorwahl suchen, zum Beispiel Vereinigtes Konigreich oder +44',
		empty: 'Kein Land gefunden. Pruefen Sie die Schreibweise oder suchen Sie nach der Vorwahl.',
	},
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

function Field({
	initial,
	country,
	labels,
	invalid,
	testId,
}: {
	initial: string;
	country: PhoneCountry;
	labels?: Partial<PhoneInputLabels>;
	invalid?: boolean;
	testId: string;
}) {
	const [value, setValue] = useState(initial);
	return (
		<div style={{ display: 'grid', gap: 4 }}>
			<PhoneInput
				value={value}
				onChange={setValue}
				defaultCountry={country}
				labels={labels}
				invalid={invalid}
				placeholder="Phone number"
				data-testid={testId}
				aria-label="Phone number"
			/>
			<code style={{ fontSize: 11 }}>{value || '(empty)'}</code>
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, { demo, worst });

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 56 }}>
				<Cell title="Form field 320px" width={320}>
					<Field initial={data.value} country={data.country} labels={data.labels} testId="ph-320" />
				</Cell>
				<Cell title="Sidebar 240px, invalid" width={240}>
					<Field initial={data.value} country={data.country} labels={data.labels} invalid testId="ph-240" />
				</Cell>
				<Cell title="Empty, 320px" width={320}>
					<Field initial="" country={data.country} labels={data.labels} testId="ph-empty" />
				</Cell>
			</div>
		);
	},
};

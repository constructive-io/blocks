import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type * as React from 'react';

import { Button } from '../components/button';
import { Label } from '../components/label';
import { CountryFlag, formatPhoneNumber, normalizePhoneNumber, PhoneInput } from '../components/phone-input';

const meta: Meta<typeof PhoneInput> = {
	title: 'UI/PhoneInput',
	component: PhoneInput,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

function Controlled({ initial = '', ...props }: { initial?: string } & Partial<React.ComponentProps<typeof PhoneInput>>) {
	const [value, setValue] = useState(initial);
	return (
		<div className="w-[320px] space-y-1.5">
			<Label htmlFor="phone">Phone number</Label>
			<PhoneInput id="phone" autoComplete="tel" placeholder="Phone number" value={value} onChange={setValue} {...props} />
			<p className="font-mono text-xs text-muted-foreground">{value ? value : 'E.164 value appears here'}</p>
		</div>
	);
}

/** The picker starts on the country from the browser's language preferences. */
export const Default: Story = {
	render: () => <Controlled />,
};

export const WithValue: Story = {
	render: () => <Controlled initial="+447400123456" />,
};

export const DefaultCountry: Story = {
	render: () => <Controlled defaultCountry="DE" />,
};

export const Invalid: Story = {
	render: () => (
		<div className="space-y-1.5">
			<Controlled initial="+1555" invalid aria-describedby="phone-error" />
			<p id="phone-error" className="text-xs text-destructive">
				Enter a complete number for the selected country.
			</p>
		</div>
	),
};

export const Disabled: Story = {
	render: () => <Controlled initial="+12025550143" disabled />,
};

export const Localized: Story = {
	render: () => (
		<Controlled
			defaultCountry="FR"
			placeholder="Numéro de téléphone"
			labels={{
				country: 'Pays : {{country}}',
				countryFallback: 'Pays',
				search: 'Rechercher un pays',
				empty: 'Aucun pays trouvé.',
			}}
		/>
	),
};

/** Field and button together, validated with `normalizePhoneNumber` before submit. */
export const WithSubmit: Story = {
	render: function WithSubmitStory() {
		const [value, setValue] = useState('');
		const [numbers, setNumbers] = useState<string[]>([]);
		const [error, setError] = useState<string>();
		return (
			<form
				className="w-[360px] space-y-3"
				onSubmit={(event) => {
					event.preventDefault();
					const number = normalizePhoneNumber(value);
					if (!number) return setError('Enter a complete number for the selected country.');
					setError(undefined);
					setNumbers((current) => [...current, number]);
					setValue('');
				}}
			>
				<div className="flex gap-2">
					<PhoneInput
						aria-label="Phone number"
						className="flex-1"
						value={value}
						onChange={setValue}
						invalid={Boolean(error)}
					/>
					<Button type="submit" size="sm" className="h-auto" disabled={!value}>
						Add
					</Button>
				</div>
				{error && <p className="text-xs text-destructive">{error}</p>}
				<ul className="space-y-1.5">
					{numbers.map((number) => (
						<li key={number} className="flex items-center gap-2 text-sm tabular-nums">
							<CountryFlag number={number} />
							{formatPhoneNumber(number)}
						</li>
					))}
				</ul>
			</form>
		);
	},
};

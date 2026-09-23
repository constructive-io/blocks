import type * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
	CountryFlag,
	detectCountry,
	formatPhoneNumber,
	normalizePhoneNumber,
	PhoneInput,
	phoneCallingCode,
} from '../src/components/phone-input';

function markup(node: React.ReactElement) {
	const container = document.createElement('div');
	container.innerHTML = renderToStaticMarkup(node);
	return container;
}

describe('detectCountry', () => {
	it('reads the region from the first supported language tag', () => {
		expect(detectCountry(['en-GB', 'en-US'])).toBe('GB');
		expect(detectCountry(['de'])).toBe('DE');
		expect(detectCountry(['ja'])).toBe('JP');
	});

	it('skips malformed tags and non-country regions', () => {
		expect(detectCountry(['not a tag', 'en-001', 'fr-CA'])).toBe('CA');
		expect(detectCountry([])).toBeUndefined();
	});
});

describe('phone number helpers', () => {
	it('normalizes possible numbers to E.164', () => {
		expect(normalizePhoneNumber('+1 (202) 555-0143')).toBe('+12025550143');
		expect(normalizePhoneNumber('0044 7400 123456')).toBe('+447400123456');
		expect(normalizePhoneNumber('+1555')).toBeNull();
		expect(normalizePhoneNumber('2025550143')).toBeNull();
	});

	it('formats for reading and reads the calling code', () => {
		expect(formatPhoneNumber('+12025550143')).toBe('+1 202 555 0143');
		expect(formatPhoneNumber('not a number')).toBe('not a number');
		expect(phoneCallingCode('+4915112345678')).toBe('+49');
		expect(phoneCallingCode('garbage')).toBe('');
	});
});

describe('CountryFlag', () => {
	it('server-renders the flag tile, then fills in the lazily loaded flag', async () => {
		const tile = markup(<CountryFlag number="+447400123456" />).querySelector('[data-slot="phone-flag"]');
		expect(tile).not.toBeNull();
		expect(tile?.querySelector('svg')).toBeNull();

		(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
		const container = document.createElement('div');
		const root = createRoot(container);
		await act(async () => root.render(<CountryFlag number="+447400123456" />));
		// Rendering started the flag import; awaiting the same module settles it, and its listener, inside act.
		await act(async () => {
			await import('react-phone-number-input/flags');
		});
		expect(container.querySelector('[data-slot="phone-flag"] title')?.textContent).toBe('GB');
		act(() => root.unmount());
	});

	it('renders a globe when the number cannot be placed', () => {
		const unknown = markup(<CountryFlag number="+15550400005" />);
		expect(unknown.querySelector('[data-slot="phone-flag"]')).toBeNull();
		expect(unknown.querySelector('svg')).not.toBeNull();
	});
});

describe('PhoneInput', () => {
	it('renders a stored E.164 value in national form beside its country', () => {
		const html = markup(<PhoneInput aria-label="Phone" value="+12025550143" onChange={() => {}} defaultCountry="US" />);
		expect(html.querySelector<HTMLInputElement>('input[aria-label="Phone"]')?.value).toBe('(202) 555-0143');
		expect(html.querySelector('[aria-label="Country: United States"]')).not.toBeNull();
	});

	it('renders the server fallback country when none is given', () => {
		const html = markup(<PhoneInput aria-label="Phone" value="" onChange={() => {}} />);
		expect(html.querySelector('[aria-label="Country: United States"]')).not.toBeNull();
	});

	it('accepts localized picker labels and marks the field invalid', () => {
		const html = markup(
			<PhoneInput
				aria-label="Téléphone"
				value=""
				onChange={() => {}}
				defaultCountry="FR"
				invalid
				labels={{ country: 'Pays : {{country}}' }}
			/>,
		);
		expect(html.querySelector('[aria-label="Pays : France"]')).not.toBeNull();
		expect(html.querySelector('input[aria-label="Téléphone"]')?.getAttribute('aria-invalid')).toBe('true');
	});
});

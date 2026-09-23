'use client';

// Adapted from ReUI Phone Input (MIT), https://reui.io/docs/components/phone-input, rebuilt on the Constructive
// Combobox and InputGroup so it shares their focus, invalid and popup styling.

import { useMemo, useSyncExternalStore } from 'react';
import type * as React from 'react';
import { ChevronDownIcon, GlobeIcon } from 'lucide-react';
import * as BasePhoneInput from 'react-phone-number-input';

import { cn } from '../lib/utils';
import {
	Combobox,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxTrigger,
} from './combobox';
import { InputGroup, InputGroupInput } from './input-group';

type PhoneCountry = BasePhoneInput.Country;

type PhoneInputLabels = {
	/** Accessible name of the country picker; `{{country}}` is replaced with the selected country's name. */
	country: string;
	countryFallback: string;
	search: string;
	empty: string;
};

type PhoneInputProps = Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'ref' | 'size' | 'defaultValue'> & {
	/** E.164, or '' when empty. */
	value: string;
	onChange: (value: string) => void;
	/** Overrides the country detected from the browser's language preferences. */
	defaultCountry?: PhoneCountry;
	invalid?: boolean;
	labels?: Partial<PhoneInputLabels>;
};

const FALLBACK_COUNTRY: PhoneCountry = 'US';
const E164 = /^\+[1-9]\d{6,14}$/;

const defaultLabels: PhoneInputLabels = {
	country: 'Country: {{country}}',
	countryFallback: 'Country',
	search: 'Search countries',
	empty: 'No country found.',
};

/**
 * The user's region from their browser's language preferences, e.g. `en-GB` → GB, or `de` → DE by likely
 * subtags. The first one the picker supports wins. There is no browser API from a timezone to a country, and a
 * locale's region is the signal the browser does carry.
 */
function detectCountry(
	languages: readonly string[] = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]),
): PhoneCountry | undefined {
	for (const tag of languages) {
		try {
			const region = new Intl.Locale(tag).maximize().region;
			if (region && BasePhoneInput.isSupportedCountry(region)) return region;
		} catch {
			// A malformed tag says nothing about the region; the next preference might.
		}
	}
	return undefined;
}

function subscribeToLanguage(onChange: () => void) {
	window.addEventListener('languagechange', onChange);
	return () => window.removeEventListener('languagechange', onChange);
}

// getSnapshot runs on every render, so the Intl work only reruns when the language list itself changes.
let detected: { languages: string; country: PhoneCountry } | undefined;
function detectedCountrySnapshot(): PhoneCountry {
	const languages = navigator.languages ?? [navigator.language];
	const key = languages.join();
	if (detected?.languages !== key) detected = { languages: key, country: detectCountry(languages) ?? FALLBACK_COUNTRY };
	return detected.country;
}

/**
 * The server renders the fallback so hydration matches; the client then reports the detected country, which the
 * phone field adopts only while the user has not typed a number or picked a country.
 */
function useDetectedCountry() {
	return useSyncExternalStore(subscribeToLanguage, detectedCountrySnapshot, () => FALLBACK_COUNTRY);
}

// The full flag set is about as large as the phone metadata itself (~50 kB gzipped), so it loads in its own chunk
// the first time a flag renders. Until then, flags show their muted 18×12 tile, so nothing shifts when they arrive.
let flagComponents: BasePhoneInput.Flags | undefined;
let flagsRequest: Promise<void> | undefined;
const flagListeners = new Set<() => void>();

function subscribeToFlags(onChange: () => void) {
	flagListeners.add(onChange);
	flagsRequest ??= import('react-phone-number-input/flags').then((module) => {
		flagComponents = module.default;
		for (const listener of flagListeners) listener();
	});
	return () => flagListeners.delete(onChange);
}

function useFlagComponents() {
	return useSyncExternalStore<BasePhoneInput.Flags | undefined>(
		subscribeToFlags,
		() => flagComponents,
		() => undefined,
	);
}

/** Returns the number in E.164 form, or null when it is not a possible number for its country. */
function normalizePhoneNumber(raw: string): string | null {
	const digits = raw.replace(/[\s().-]/g, '');
	const candidate = digits.startsWith('00') ? `+${digits.slice(2)}` : digits;
	return E164.test(candidate) && BasePhoneInput.isPossiblePhoneNumber(candidate) ? candidate : null;
}

/** International grouping for reading, e.g. +1 202 555 0143; unparseable input is returned as-is. */
function formatPhoneNumber(e164: string): string {
	return BasePhoneInput.formatPhoneNumberIntl(e164) || e164;
}

/** The country calling code a number carries, e.g. +1, +44, +353; '' when it cannot be parsed. */
function phoneCallingCode(e164: string): string {
	const code = BasePhoneInput.parsePhoneNumber(e164)?.countryCallingCode;
	return code ? `+${code}` : '';
}

/** Country picker + national-format number field; digits only, emits E.164. Defaults to the user's region. */
function PhoneInput({
	className,
	value,
	onChange,
	defaultCountry,
	invalid,
	disabled,
	labels: labelOverrides,
	...props
}: PhoneInputProps) {
	const detected = useDetectedCountry();
	const labels = { ...defaultLabels, ...labelOverrides };
	return (
		<BasePhoneInput.default
			className={className}
			value={value || undefined}
			onChange={(next) => onChange(next ?? '')}
			defaultCountry={defaultCountry ?? detected}
			// The picker already shows the calling code, so a stored E.164 value renders in national form.
			initialValueFormat="national"
			disabled={disabled}
			addInternationalOption={false}
			focusInputOnCountrySelection
			containerComponent={PhoneInputGroup}
			countrySelectComponent={CountrySelect}
			countrySelectProps={{ labels }}
			inputComponent={NumberInput}
			flagComponent={PhoneFlag}
			aria-invalid={invalid || undefined}
			data-slot="phone-input"
			{...props}
		/>
	);
}

function PhoneInputGroup({ className, children, ...props }: React.ComponentProps<'div'>) {
	return (
		<InputGroup className={cn('overflow-hidden', className)} {...props}>
			{children}
		</InputGroup>
	);
}

function NumberInput({ className, ...props }: React.ComponentProps<typeof InputGroupInput>) {
	return <InputGroupInput className={cn('tabular-nums', className)} {...props} />;
}

type CountryOption = { value?: PhoneCountry; label: string };
type CountryItem = { value: PhoneCountry; label: string; code: string };

function CountrySelect({
	value,
	onChange,
	options,
	disabled,
	labels,
}: {
	value?: PhoneCountry;
	onChange: (country?: PhoneCountry) => void;
	options: CountryOption[];
	disabled?: boolean;
	labels: PhoneInputLabels;
}) {
	const items = useMemo<CountryItem[]>(
		() =>
			options.flatMap((option) =>
				option.value
					? [{ value: option.value, label: option.label, code: `+${BasePhoneInput.getCountryCallingCode(option.value)}` }]
					: [],
			),
		[options],
	);
	const selected = items.find((item) => item.value === value) ?? null;

	return (
		<Combobox items={items} value={selected} onValueChange={(next) => next && onChange(next.value)} disabled={disabled}>
			<ComboboxTrigger
				aria-label={selected ? labels.country.replace('{{country}}', selected.label) : labels.countryFallback}
				data-slot="phone-input-country"
				className="flex shrink-0 cursor-pointer items-center gap-2 self-stretch border-e border-input ps-3 pe-2 text-sm tabular-nums text-foreground outline-none hover:bg-accent/60 focus-visible:bg-accent/60 disabled:cursor-not-allowed data-popup-open:bg-accent/60"
			>
				{selected && <PhoneFlag country={selected.value} countryName={selected.label} />}
				<span>{selected?.code}</span>
				<ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden />
			</ComboboxTrigger>
			<ComboboxPopup style={{ width: '17rem' }} align="start">
				<div className="border-b p-1">
					<ComboboxInput placeholder={labels.search} showTrigger={false} size="sm" />
				</div>
				<ComboboxEmpty>{labels.empty}</ComboboxEmpty>
				<ComboboxList>
					{(item: CountryItem) => (
						<ComboboxItem key={item.value} value={item}>
							<span className="flex items-center gap-2">
								<PhoneFlag country={item.value} countryName={item.label} />
								<span className="min-w-0 flex-1 truncate">{item.label}</span>
								<span className="text-xs tabular-nums text-muted-foreground">{item.code}</span>
							</span>
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxPopup>
		</Combobox>
	);
}

/** 3:2 flag with a faint inset edge so white-heavy flags keep their shape on any surface. */
function PhoneFlag({ country, countryName }: { country: PhoneCountry; countryName: string }) {
	const Svg = useFlagComponents()?.[country];
	return (
		<span
			data-slot="phone-flag"
			className="relative flex h-3 w-4.5 shrink-0 overflow-hidden rounded-[2px] bg-muted after:absolute after:inset-0 after:rounded-[inherit] after:outline after:-outline-offset-1 after:outline-black/10 dark:after:outline-white/10 [&_svg]:size-full"
		>
			{Svg && <Svg title={countryName} />}
		</span>
	);
}

/** The flag of the country an E.164 number belongs to; a neutral globe when the number cannot be placed. */
function CountryFlag({ number, className }: { number: string; className?: string }) {
	const country = BasePhoneInput.parsePhoneNumber(number)?.country;
	return (
		<span className={cn('flex h-3 w-4.5 shrink-0 items-center justify-center', className)}>
			{country ? (
				<PhoneFlag country={country} countryName={country} />
			) : (
				<GlobeIcon className="size-3.5 text-muted-foreground" aria-hidden />
			)}
		</span>
	);
}

export { CountryFlag, detectCountry, formatPhoneNumber, normalizePhoneNumber, PhoneInput, phoneCallingCode };
export type { PhoneCountry, PhoneInputLabels, PhoneInputProps };

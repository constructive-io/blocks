import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../src/components/empty';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from '../src/components/field';
import { Input } from '../src/components/input';

function parse(markup: string) {
	const container = document.createElement('div');
	container.innerHTML = markup;
	return container;
}

describe('field and empty composition', () => {
	it('preserves the legacy Field contract', () => {
		const container = parse(
			renderToString(
				<Field label='Email' htmlFor='email' description='Used for notifications.' error='Email is required.' required>
					<Input id='email' aria-invalid />
				</Field>,
			),
		);

		expect(container.querySelector('[data-slot="field-label"]')?.getAttribute('for')).toBe('email');
		expect(container.querySelector('[data-slot="field-description"]')?.textContent).toBe('Used for notifications.');
		expect(container.querySelector('[data-slot="field-error"]')?.textContent).toBe('Email is required.');
		expect(container.querySelector('[data-slot="field"]')?.getAttribute('data-invalid')).toBe('true');
	});

	it('exposes the upstream composable field surface', () => {
		const container = parse(
			renderToString(
				<FieldSet>
					<FieldLegend>Profile</FieldLegend>
					<FieldGroup>
						<Field data-invalid>
							<FieldLabel htmlFor='name'>Name</FieldLabel>
							<Input id='name' aria-invalid />
							<FieldDescription>Public display name.</FieldDescription>
							<FieldError errors={[{ message: 'Required' }, { message: 'Required' }]} />
						</Field>
					</FieldGroup>
				</FieldSet>,
			),
		);

		expect(container.querySelector('[data-slot="field-set"]')).not.toBeNull();
		expect(container.querySelector('[data-slot="field-group"]')).not.toBeNull();
		expect(container.querySelector('[data-slot="field-error"]')?.textContent).toBe('Required');
	});

	it('renders the standard empty-state slots', () => {
		const container = parse(
			renderToString(
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>Icon</EmptyMedia>
						<EmptyTitle>No rows</EmptyTitle>
						<EmptyDescription>Create the first row.</EmptyDescription>
					</EmptyHeader>
				</Empty>,
			),
		);

		expect(container.querySelector('[data-slot="empty"]')).not.toBeNull();
		expect(container.querySelector('[data-slot="empty-icon"]')?.getAttribute('data-variant')).toBe('icon');
		expect(container.querySelector('[data-slot="empty-description"]')?.tagName).toBe('P');
	});
});

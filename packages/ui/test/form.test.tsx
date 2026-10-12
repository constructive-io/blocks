import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it } from 'vitest';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../src/components/form';
import { Input } from '../src/components/input';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
});

type Values = { name: string };

function Harness({ error, fallback }: { error?: { type: string; message?: string }; fallback?: string }) {
	const form = useForm<Values>({ defaultValues: { name: '' } });
	React.useEffect(() => {
		if (error) form.setError('name', error);
	}, [error, form]);

	return (
		<Form {...form}>
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Name</FormLabel>
						<FormControl>
							<Input {...field} />
						</FormControl>
						<FormMessage>{fallback}</FormMessage>
					</FormItem>
				)}
			/>
		</Form>
	);
}

async function render(element: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(element));
}

const message = () => container!.querySelector('[data-slot="form-message"]');
const input = () => container!.querySelector('input')!;

describe('FormMessage', () => {
	it('shows the error message when there is one', async () => {
		await render(<Harness error={{ type: 'manual', message: 'Name is required' }} fallback="Invalid value" />);

		expect(message()?.textContent).toBe('Name is required');
	});

	it('falls back to its children when the field is invalid without a message', async () => {
		await render(<Harness error={{ type: 'server' }} fallback="Invalid value" />);

		expect(input().getAttribute('aria-invalid')).toBe('true');
		expect(message()?.textContent).toBe('Invalid value');
	});

	it('renders nothing for an invalid field with neither a message nor a fallback', async () => {
		await render(<Harness error={{ type: 'server' }} />);

		expect(input().getAttribute('aria-invalid')).toBe('true');
		expect(message()).toBeNull();
	});
});

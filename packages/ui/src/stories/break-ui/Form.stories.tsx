import { useEffect, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';

import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../../components/form';
import { Input } from '../../components/input';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';
import { emails, identifiers, labels } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Form',
	parameters: { breakUi: true },
};
export default meta;

type Values = { workspace: string; email: string; token: string; notes: string };

const demo = {
	workspaceLabel: 'Workspace name',
	description: 'Shown to everyone in the organization.',
	errors: {
		workspace: 'Name is required',
		email: 'Enter a valid email address',
		token: 'Token is invalid',
		notes: '',
	},
	values: { workspace: 'acme', email: 'jane@acme.com', token: 'tok_123', notes: '' },
};
const worst = {
	workspaceLabel: `${labels.french} pour les comptes d'entreprise et les espaces de travail partages`,
	description: labels.longDescription,
	errors: {
		workspace: `${emails.long} is already registered to a different workspace, ask its owner to invite you or choose another address.`,
		email: emails.long + '!' + emails.long,
		token: `Expected ${identifiers.snakeIdentifier}_${identifiers.snakeIdentifier} to match /^[a-z0-9_]{1,64}$/`,
		// A field in error with no message at all (validator returned only a type).
		notes: '',
	},
	values: {
		workspace: identifiers.url,
		email: emails.long,
		token: identifiers.uuid,
		notes: '',
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

function FormDemo({ data }: { data: typeof demo }) {
	const form = useForm<Values>({ defaultValues: data.values });

	useEffect(() => {
		(Object.keys(data.errors) as (keyof Values)[]).forEach((name) => {
			form.setError(name, { type: 'manual', message: data.errors[name] });
		});
	}, [data, form]);

	return (
		<Form {...form}>
			<form style={{ display: 'grid', gap: 16 }} onSubmit={form.handleSubmit(() => {})}>
				<FormField
					control={form.control}
					name="workspace"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{data.workspaceLabel}</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormDescription>{data.description}</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Billing contact</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="token"
					render={({ field }) => (
						<FormItem>
							<FormLabel>API token</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="notes"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Notes (invalid, empty message)</FormLabel>
							<FormControl>
								<Input {...field} data-testid="form-empty-message" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, { demo, worst });
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 56 }}>
				<Cell title="react-hook-form: 320px" width={320}>
					<div data-testid="form-320">
						<FormDemo key={data === worst ? 'worst' : 'demo'} data={data} />
					</div>
				</Cell>
				<Cell title="react-hook-form: 480px (dialog)" width={480}>
					<div data-testid="form-480">
						<FormDemo key={data === worst ? 'worst-480' : 'demo-480'} data={data} />
					</div>
				</Cell>
			</div>
		);
	},
};

import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormControl } from '../../components/form-control';
import { Input } from '../../components/input';
import { Textarea } from '../../components/textarea';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';
import { emails, identifiers, labels } from './worst-case';

const meta: Meta = {
	title: 'Break UI/FormControl',
	parameters: { breakUi: true },
};
export default meta;

const demo = {
	label: 'Project name',
	value: 'production-db',
	error: 'Slug is already taken',
	emptyLabel: 'Email',
};
const worst = {
	label: `${labels.german} fur Unternehmenskonten und Arbeitsbereiche`,
	value: emails.long,
	error: `${emails.long} is already registered to a different workspace, ask its owner to invite you or choose another address.`,
	emptyLabel: labels.blank,
};
const worstUnbreakableError = identifiers.snakeIdentifier + '_must_be_unique_within_the_organization_namespace';

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, { demo, worst });
		const unbreakable = data === worst ? worstUnbreakableError : demo.error;

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 56 }}>
				<Cell title="Stacked 320px, label + value + error" width={320}>
					<FormControl label={data.label} id="fc-stacked" error={data.error}>
						<Input defaultValue={data.value} />
					</FormControl>
				</Cell>

				<Cell title="Stacked 320px, unbreakable error text" width={320}>
					<FormControl label={data.label} id="fc-stacked-unbreakable" error={unbreakable}>
						<Input defaultValue={data.value} />
					</FormControl>
				</Cell>

				<Cell title="Floating 320px, long label + long value" width={320}>
					<FormControl label={data.label} id="fc-floating" layout="floating">
						<Input defaultValue={data.value} data-testid="fc-floating-input" />
					</FormControl>
				</Cell>

				<Cell title="Floating 240px, long label, empty (label resting over placeholder)" width={240}>
					<FormControl label={data.label} id="fc-floating-empty" layout="floating">
						<Input data-testid="fc-floating-empty-input" />
					</FormControl>
				</Cell>

				<Cell title="Floating 320px, long error" width={320}>
					<FormControl label={data.label} id="fc-floating-error" layout="floating" error={data.error}>
						<Input defaultValue={data.value} />
					</FormControl>
				</Cell>

				<Cell title="Floating, blank (whitespace) label 320px" width={320}>
					<FormControl label={data.emptyLabel} id="fc-floating-blank" layout="floating">
						<Input defaultValue="x" />
					</FormControl>
				</Cell>

				<Cell title="Floating wrapping a Textarea 320px" width={320}>
					<FormControl label={data.label} id="fc-floating-textarea" layout="floating">
						<Textarea defaultValue={data.value} />
					</FormControl>
				</Cell>
			</div>
		);
	},
};

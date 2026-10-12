import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from '../../components/checkbox';
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldRow,
	FieldSeparator,
	FieldSet,
	FieldTitle,
} from '../../components/field';
import { Input } from '../../components/input';
import { Label } from '../../components/label';
import { Switch } from '../../components/switch';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { identifiers, labels } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Field',
	parameters: { breakUi: true },
};
export default meta;

type FieldData = {
	label: string;
	description: string;
	error: string;
	identifierLabel: string;
	switchLabel: string;
	checkLabel: string;
	errors: Array<{ message?: string } | undefined>;
	separator: string;
	legend: string;
	horizontalDescription: string;
};

const demo: FieldData = {
	label: 'Email',
	description: 'We only use this for receipts.',
	error: 'Please enter a valid email address.',
	identifierLabel: 'Workspace name',
	switchLabel: 'Email notifications',
	checkLabel: 'Accept the terms',
	errors: [{ message: 'Required' }],
	separator: 'Or',
	legend: 'Notifications',
	horizontalDescription: 'Send me product updates.',
};

const worst: FieldData = {
	label: 'Benachrichtigungseinstellungen für externe Teammitglieder und Gäste',
	description: labels.longDescription,
	error: `Could not save: a record named "${identifiers.snakeIdentifier}_primary_reference" already exists.`,
	identifierLabel: identifiers.snakeIdentifier,
	switchLabel: identifiers.snakeIdentifier,
	checkLabel: labels.french + ' und die Nutzungsbedingungen akzeptieren',
	errors: [
		{ message: 'Must be at least 8 characters.' },
		{ message: 'Must include a number.' },
		{ message: 'Must be at least 8 characters.' },
		undefined,
		{ message: `Value "${identifiers.uuid}" is already used by another workspace.` },
		{ message: '' },
	],
	separator: 'Ou continuer avec le fournisseur d’authentification unique de votre organisation',
	legend: 'Paramètres de confidentialité et de sécurité pour les membres invités',
	horizontalDescription: labels.longDescription.slice(0, 220),
};

export const Stress: StoryObj = {
	render: (_args, context) => {
		const d = pickDataset(context, { demo, worst });

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={320} label="Legacy Field: label + required + description + error (320px)">
					<Field label={d.label} description={d.description} error={d.error} required>
						<Input aria-invalid placeholder="name@example.com" />
					</Field>
				</Frame>

				<Frame width={320} label="Label that is a snake_case field name (no break opportunities), required (320px)">
					<Field label={d.identifierLabel} required>
						<Input />
					</Field>
				</Frame>

				<Frame width={320} label="Structural vertical Field: label, input, description (320px)">
					<Field>
						<FieldLabel htmlFor="vertical">{d.identifierLabel}</FieldLabel>
						<Input id="vertical" />
						<FieldDescription>{d.description}</FieldDescription>
						<FieldError>{d.error}</FieldError>
					</Field>
				</Frame>

				<Frame width={420} label="Horizontal Field with switch and long label (420px)">
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel htmlFor="h-switch">{d.switchLabel}</FieldLabel>
							<FieldDescription>{d.horizontalDescription}</FieldDescription>
						</FieldContent>
						<Switch id="h-switch" />
					</Field>
				</Frame>

				<Frame width={288} label="Horizontal Field at 320px viewport (288px): unbroken label vs the switch">
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel htmlFor="h-switch-narrow">{d.switchLabel}</FieldLabel>
						</FieldContent>
						<Switch id="h-switch-narrow" data-case="narrow-switch" />
					</Field>
				</Frame>

				<Frame width={320} label="FieldRow with checkbox and long label (320px)">
					<FieldRow label={d.checkLabel} description={d.horizontalDescription} error={d.error}>
						<Checkbox />
					</FieldRow>
				</Frame>

				<Frame width={320} label="FieldError with several, duplicate and empty errors (320px)">
					<Field data-invalid>
						<FieldLabel htmlFor="errs">Password</FieldLabel>
						<Input id="errs" aria-invalid />
						<FieldError errors={d.errors} />
					</Field>
				</Frame>

				<Frame width={288} label="FieldSeparator with text (320px viewport = 288px)">
					<FieldGroup>
						<Field>
							<Input placeholder="Email" />
						</Field>
						<FieldSeparator>{d.separator}</FieldSeparator>
						<Field>
							<Input placeholder="SSO domain" />
						</Field>
					</FieldGroup>
				</Frame>

				<Frame width={320} label="FieldSet legend + FieldTitle (320px)">
					<FieldSet>
						<FieldLegend>{d.legend}</FieldLegend>
						<FieldDescription>{d.description.slice(0, 120)}</FieldDescription>
						<Field>
							<FieldTitle>{d.identifierLabel}</FieldTitle>
							<Input />
						</Field>
					</FieldSet>
				</Frame>

				<Frame width={320} label="Bare Label with a long unbroken value (320px)">
					<Label htmlFor="bare">{d.identifierLabel}</Label>
					<Input id="bare" />
				</Frame>
			</div>
		);
	},
};

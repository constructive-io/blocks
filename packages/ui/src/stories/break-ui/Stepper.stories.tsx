import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	Stepper,
	StepperDescription,
	StepperIndicator,
	StepperItem,
	StepperSeparator,
	StepperTitle,
	StepperTrigger,
} from '../../components/stepper';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { identifiers, labels, manyRows } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Stepper',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type StepData = { title: string; description?: string; loading?: boolean };

const demo: StepData[] = [
	{ title: 'Account', description: 'Create your login' },
	{ title: 'Profile', description: 'Tell us about you' },
	{ title: 'Done' },
];

const worst: StepData[] = [
	{ title: 'Workspace details', description: 'Name, slug and region' },
	{ title: 'Invite teammates and assign roles', description: labels.longDescription.slice(0, 90) },
	{ title: 'Benachrichtigungseinstellungen', description: 'Konfiguration der Benachrichtigungseinstellungen' },
	{ title: labels.french, description: 'Aperçu', loading: true },
	{ title: 'Connect data sources' },
	{ title: identifiers.snakeIdentifier, description: identifiers.uuid },
	{ title: 'Review & launch' },
];

const shortSteps: StepData[] = ['Account', 'Profile', 'Team', 'Billing', 'Review'].map((title) => ({ title }));

function Wizard({ steps, orientation, startAt }: { steps: StepData[]; orientation: 'horizontal' | 'vertical'; startAt: number }) {
	const [active, setActive] = useState(startAt);
	return (
		<Stepper value={active} onValueChange={setActive} orientation={orientation}>
			{steps.map((step, i) => {
				const number = i + 1;
				return (
					<StepperItem key={number} step={number} loading={step.loading} className={orientation === 'horizontal' ? 'not-last:flex-1' : undefined}>
						<StepperTrigger>
							<StepperIndicator />
							<div className="text-left">
								<StepperTitle>{step.title}</StepperTitle>
								{step.description ? <StepperDescription>{step.description}</StepperDescription> : null}
							</div>
						</StepperTrigger>
						{number < steps.length ? <StepperSeparator className="mx-2" /> : null}
					</StepperItem>
				);
			})}
		</Stepper>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const mode = context.globals.dataset as string | undefined;
		const steps = pickDataset<StepData[]>(context, {
			demo,
			worst,
			empty: [],
			one: [demo[0]],
			huge: manyRows(15, (i) => ({ title: `Step ${i + 1}`, description: i % 3 === 0 ? 'Optional' : undefined })),
		});
		const startAt = mode === 'huge' ? 8 : mode === 'worst' ? 4 : 2;

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={720} label={`${steps.length} steps, horizontal, 720px page`}>
					<Wizard steps={steps} orientation="horizontal" startAt={startAt} />
				</Frame>

				<Frame width={480} label={`${steps.length} steps, horizontal, 480px dialog`}>
					<Wizard steps={steps} orientation="horizontal" startAt={startAt} />
				</Frame>

				<Frame width={288} label={`${steps.length} steps, horizontal, 320px viewport (288px)`}>
					<Wizard steps={steps} orientation="horizontal" startAt={startAt} />
				</Frame>

				<Frame width={280} label={`${steps.length} steps, vertical, 280px sidebar`}>
					<Wizard steps={steps} orientation="vertical" startAt={startAt} />
				</Frame>

				{mode === 'worst' ? (
					<>
						<Frame width={480} label="Calibration: five short English titles, no descriptions, 480px dialog">
							<Wizard steps={shortSteps} orientation="horizontal" startAt={3} />
						</Frame>
						<Frame width={288} label="Calibration: the same five short titles at 320px viewport (288px)">
							<Wizard steps={shortSteps} orientation="horizontal" startAt={3} />
						</Frame>
					</>
				) : null}
			</div>
		);
	},
};

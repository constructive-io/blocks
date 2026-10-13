import type { Meta, StoryObj } from '@storybook/react-vite';

import { DEMO_NOW } from '../../components/billing-kit';
import { BILLING_CONSOLE_DEMO, BillingConsole, type BillingConsoleData, type BillingConsoleView } from '../../components/billing-console';
import { pickDataset } from './dataset';
import { emptyConsole, hugeConsole, oneConsole, worstConsoleWithCodes } from './billing-worst-case';

const meta: Meta = {
	title: 'Break UI/Billing Console',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] },
	},
};
export default meta;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function Frame({ data, view }: { data: BillingConsoleData; view: BillingConsoleView }) {
	return (
		<div className="h-dvh min-h-[680px] p-2">
			<div className="h-full overflow-hidden rounded-xl border border-border shadow-sm">
				<BillingConsole
					data={data}
					defaultView={view}
					now={DEMO_NOW}
					onSaveEntitlements={async () => {
						await wait(300);
					}}
					onConnectProvider={async () => {
						await wait(300);
					}}
					onRunReadinessCheck={async () => {
						await wait(300);
					}}
					onToggleBilling={async () => {
						await wait(300);
					}}
					onCreditRateChange={async () => {
						await wait(300);
					}}
					onGrantCredits={async () => {
						await wait(300);
					}}
					onSaveCode={async () => {
						await wait(300);
					}}
					onCreateCodes={async () => {
						await wait(300);
					}}
					onHoldDatabase={async () => {
						await wait(300);
					}}
					onReleaseDatabase={async () => {
						await wait(300);
					}}
				/>
			</div>
		</div>
	);
}

const story =
	(view: BillingConsoleView): StoryObj =>
	({
		render: (_args, context) => {
			const data = pickDataset(context, { demo: BILLING_CONSOLE_DEMO, worst: worstConsoleWithCodes, empty: emptyConsole, one: oneConsole, huge: hugeConsole });
			return <Frame data={data} view={view} />;
		},
	});

export const Overview: StoryObj = story('overview');
export const Catalog: StoryObj = story('catalog');
export const Customers: StoryObj = story('customers');
export const Provider: StoryObj = story('provider');
export const Standing: StoryObj = story('standing');

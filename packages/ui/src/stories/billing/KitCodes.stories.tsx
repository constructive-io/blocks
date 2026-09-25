import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../../components/button';
import { BILLING_ACCOUNT_DEMO } from '../../components/billing-account';
import { BILLING_CONSOLE_DEMO } from '../../components/billing-console';
import {
	BulkCodeDialog,
	type CodeTargetOption,
	CreditCodeDialog,
	CreditCodeSheet,
	CreditCodeTable,
	DEMO_NOW,
	demoCodeRedeemer,
	Panel,
	PLATFORM_CODE_REDEMPTIONS,
	PLATFORM_CODES,
	RedeemCodeDialog,
	RedeemCodeField,
	type RedeemRefusal,
	RedemptionList,
	targetDescriber,
} from '../../components/billing-kit';
import { billingFrame, Stack, Variant, wait } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Gift codes',
	decorators: [billingFrame('max-w-6xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Gift codes gift credits, usually compute, to the billing account that redeems them, once per account. A code item credits a billing meter (the compute pool, tokens) or a counted limit (seats). Customers redeem through `RedeemCodeDialog` or `RedeemCodeField` and see exactly what was added; operators create single codes, bulk batches, and inspect redemptions.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

const limits = [...BILLING_ACCOUNT_DEMO.limits];
const describe = targetDescriber(BILLING_ACCOUNT_DEMO.meters, limits);
const targets: CodeTargetOption[] = [
	...BILLING_CONSOLE_DEMO.meters.filter((meter) => meter.meterType !== 'boolean').map((meter) => ({ target: { kind: 'meter' as const, key: meter.slug }, label: meter.displayName })),
	...limits.map((limit) => ({ target: { kind: 'limit' as const, key: limit.name }, label: limit.label })),
];
const redeemer = () =>
	demoCodeRedeemer({ codes: PLATFORM_CODES, accountId: 'acct-northwind', accountName: 'Northwind Labs', redeemed: ['LAUNCH-2026'], now: DEMO_NOW });

const TRY = 'Try HACKWEEK-2026 (compute + tokens), TEAM-SEATS (a limit), LAUNCH-2026 (already redeemed), HACKWEEK (expired), PARTNER-BETA (paused), SUMMIT-7KQM-X3TP (used up), or anything else (not found).';

function DialogStory({ initialCode, delay = 700 }: { initialCode?: string; delay?: number }) {
	const [open, setOpen] = useState(true);
	const [redeem] = useState(redeemer);
	return (
		<div className="flex flex-col items-start gap-2">
			<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
				Redeem a code
			</Button>
			<p className="max-w-xl text-xs text-muted-foreground">{TRY}</p>
			<RedeemCodeDialog
				open={open}
				onOpenChange={setOpen}
				initialCode={initialCode}
				accountName="Northwind Labs"
				describe={describe}
				onRedeem={async (code) => {
					await wait(delay);
					return redeem(code);
				}}
			/>
		</div>
	);
}

export const Redeem: Story = { name: 'RedeemCodeDialog: enter a code', render: () => <DialogStory /> };
export const RedeemPrefilled: Story = { name: 'RedeemCodeDialog: prefilled from a link', render: () => <DialogStory initialCode="HACKWEEK-2026" /> };

const REFUSALS: { reason: RedeemRefusal; code: string }[] = [
	{ reason: 'not_found', code: 'NOPE-1234' },
	{ reason: 'inactive', code: 'PARTNER-BETA' },
	{ reason: 'expired', code: 'HACKWEEK' },
	{ reason: 'exhausted', code: 'SUMMIT-7KQM-X3TP' },
	{ reason: 'already_redeemed', code: 'LAUNCH-2026' },
];

export const Refusals: Story = {
	name: 'RedeemCodeField: every refusal',
	render: function RefusalsStory() {
		const [redeem] = useState(redeemer);
		return (
			<div className="grid gap-4 @3xl/view:grid-cols-2">
				{REFUSALS.map(({ reason, code }) => (
					<Panel key={reason} title={reason.replace('_', ' ')} description={`Redeem ${code}`}>
						<RedeemCodeField onRedeem={redeem} describe={describe} />
					</Panel>
				))}
				<Panel title="Host message" description="A refusal can carry its own copy.">
					<RedeemCodeField onRedeem={async () => ({ status: 'refused', reason: 'not_eligible', message: 'Student codes need a verified .edu email.' })} describe={describe} />
				</Panel>
			</div>
		);
	},
};

export const InlineField: Story = {
	name: 'RedeemCodeField: success summary',
	render: function InlineStory() {
		const [redeem] = useState(redeemer);
		return (
			<div className="max-w-sm">
				<RedeemCodeField onRedeem={redeem} describe={describe} />
				<p className="mt-3 text-xs text-muted-foreground">{TRY}</p>
			</div>
		);
	},
};

export const History: Story = {
	name: 'RedemptionList: customer and operator views',
	render: () => (
		<div className="grid gap-4 @3xl/view:grid-cols-2">
			<Panel title="Codes you redeemed">
				<RedemptionList redemptions={PLATFORM_CODE_REDEMPTIONS.slice(2, 3)} describe={describe} />
			</Panel>
			<Panel title="Who redeemed HACKWEEK-2026">
				<RedemptionList redemptions={PLATFORM_CODE_REDEMPTIONS.slice(0, 2)} describe={describe} showAccount />
			</Panel>
			<Panel title="Empty">
				<RedemptionList redemptions={[]} describe={describe} />
			</Panel>
		</div>
	),
};

export const Table: Story = {
	name: 'CreditCodeTable: live, paused, expired, used up, batch',
	render: function TableStory() {
		const [codes, setCodes] = useState(PLATFORM_CODES);
		const [open, setOpen] = useState(false);
		const [selected, setSelected] = useState(PLATFORM_CODES[0]);
		const toggle = (code: (typeof PLATFORM_CODES)[number], active: boolean) =>
			setCodes((current) => current.map((candidate) => (candidate.id === code.id ? { ...candidate, active } : candidate)));
		return (
			<>
				<CreditCodeTable
					codes={codes}
					describe={describe}
					onToggle={toggle}
					onOpen={(code) => {
						setSelected(code);
						setOpen(true);
					}}
				/>
				<CreditCodeSheet
					code={codes.find((code) => code.id === selected?.id)}
					open={open}
					onOpenChange={setOpen}
					redemptions={PLATFORM_CODE_REDEMPTIONS}
					describe={describe}
					onToggle={toggle}
					onEdit={() => {}}
				/>
			</>
		);
	},
};

export const TableEmpty: Story = { name: 'CreditCodeTable: empty', render: () => <CreditCodeTable codes={[]} describe={describe} /> };

function EditorStory({ edit }: { edit?: boolean }) {
	const [open, setOpen] = useState(true);
	const [saved, setSaved] = useState('');
	return (
		<Stack>
			<Button size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)}>
				{edit ? 'Edit HACKWEEK-2026' : 'New code'}
			</Button>
			<Variant label="onSave">
				<pre className="max-w-3xl overflow-x-auto font-mono text-[11px] text-muted-foreground">{saved || '(not yet)'}</pre>
			</Variant>
			<CreditCodeDialog
				open={open}
				onOpenChange={setOpen}
				code={edit ? PLATFORM_CODES[0] : undefined}
				targets={targets}
				existingCodes={PLATFORM_CODES.map((code) => code.code)}
				onSave={async (draft) => {
					await wait(700);
					setSaved(JSON.stringify(draft, null, 2));
				}}
			/>
		</Stack>
	);
}

export const Create: Story = { name: 'CreditCodeDialog: create', render: () => <EditorStory /> };
export const Edit: Story = { name: 'CreditCodeDialog: edit a redeemed code', render: () => <EditorStory edit /> };

export const Bulk: Story = {
	name: 'BulkCodeDialog: single-use batch',
	render: function BulkStory() {
		const [open, setOpen] = useState(true);
		const [count, setCount] = useState(0);
		return (
			<Stack>
				<Button size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)}>
					Bulk create
				</Button>
				<p className="text-xs text-muted-foreground">onCreate → {count ? `${count} drafts` : '(not yet)'}</p>
				<BulkCodeDialog
					open={open}
					onOpenChange={setOpen}
					targets={targets}
					existingCodes={PLATFORM_CODES.map((code) => code.code)}
					onCreate={async (drafts) => {
						await wait(900);
						setCount(drafts.length);
					}}
				/>
			</Stack>
		);
	},
};

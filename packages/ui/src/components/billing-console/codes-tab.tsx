'use client';

import { Layers, Plus } from 'lucide-react';
import * as React from 'react';

import { Button } from '../button';
import { BulkCodeDialog, type CodeTargetOption, CreditCodeDialog, CreditCodeSheet, CreditCodeTable } from '../billing-kit/code-admin';
import { codeStatus, targetDescriber } from '../billing-kit/codes';
import { useBillingFormat } from '../billing-kit/context';
import { SectionHeading } from '../billing-kit/surface';
import type { CreditCode } from '../billing-kit/types';
import { FilterGroup } from '../workspace-kit/primitives';
import { useBillingConsole } from './billing-console-context';

type Filter = 'all' | 'live' | 'ended';

/**
 * Gift codes: create one, bulk-create single-use batches, pause or resume,
 * and open a code to see who redeemed it. Codes credit billing meters (such
 * as the compute pool) or counted limits.
 */
export function ConsoleCodesTab() {
	const { data, meters, codes, setCodes, saveCode, createCodes, emit } = useBillingConsole();
	const f = useBillingFormat();
	const [filter, setFilter] = React.useState<Filter>('all');
	const [editor, setEditor] = React.useState<{ open: boolean; code?: CreditCode }>({ open: false });
	const [bulkOpen, setBulkOpen] = React.useState(false);
	// The sheet keeps its last code while closing so the exit animation has content.
	const [detailId, setDetailId] = React.useState<string | null>(null);
	const [detailOpen, setDetailOpen] = React.useState(false);

	const limitRows = React.useMemo(
		() => data.entitlementGroups.flatMap((group) => group.rows).filter((row) => row.kind === 'limit').map((row) => ({ name: row.key, label: row.label })),
		[data.entitlementGroups],
	);
	const describe = React.useMemo(() => targetDescriber(meters, limitRows), [limitRows, meters]);
	const targets = React.useMemo<CodeTargetOption[]>(
		() => [
			...meters.filter((meter) => meter.active && meter.meterType !== 'boolean').map((meter) => ({ target: { kind: 'meter' as const, key: meter.slug }, label: meter.displayName })),
			...limitRows.map((row) => ({ target: { kind: 'limit' as const, key: row.name }, label: row.label })),
		],
		[limitRows, meters],
	);
	const existingCodes = React.useMemo(() => codes.map((code) => code.code), [codes]);

	const live = (code: CreditCode) => {
		const status = codeStatus(code, f.now);
		return status === 'active' || status === 'paused';
	};
	const shown = filter === 'all' ? codes : codes.filter((code) => (filter === 'live' ? live(code) : !live(code)));
	const detail = codes.find((code) => code.id === detailId);

	const toggle = (code: CreditCode, active: boolean) => {
		setCodes((current) => current.map((candidate) => (candidate.id === code.id ? { ...candidate, active } : candidate)));
		emit({ type: 'toggle-code', codeId: code.id, active });
	};

	return (
		<div className="flex flex-col gap-3">
			<SectionHeading
				title="Gift codes"
				description="Each billing account can redeem a code once. Credits land on the account right away, e.g. compute for a hackathon."
				actions={
					<>
						{createCodes ? (
							<Button size="xs" variant="ghost" onClick={() => setBulkOpen(true)}>
								<Layers aria-hidden="true" />
								Bulk create
							</Button>
						) : null}
						{saveCode ? (
							<Button size="xs" variant="outline" onClick={() => setEditor({ open: true })}>
								<Plus aria-hidden="true" />
								New code
							</Button>
						) : null}
					</>
				}
			/>
			<FilterGroup
				label="Code status"
				value={filter}
				onChange={setFilter}
				options={[
					{ value: 'all', label: 'All', count: codes.length },
					{ value: 'live', label: 'Live', count: codes.filter(live).length },
					{ value: 'ended', label: 'Expired or used up', count: codes.filter((code) => !live(code)).length },
				]}
			/>
			<CreditCodeTable
				codes={shown}
				describe={describe}
				onToggle={toggle}
				onOpen={(code) => {
					setDetailId(code.id);
					setDetailOpen(true);
				}}
			/>
			{saveCode ? (
				<CreditCodeDialog
					open={editor.open}
					onOpenChange={(open) => setEditor((current) => ({ ...current, open }))}
					code={editor.code}
					targets={targets}
					existingCodes={existingCodes}
					onSave={(draft) => saveCode(draft, editor.code)}
				/>
			) : null}
			{createCodes ? <BulkCodeDialog open={bulkOpen} onOpenChange={setBulkOpen} targets={targets} existingCodes={existingCodes} onCreate={createCodes} /> : null}
			<CreditCodeSheet
				code={detail}
				open={detailOpen}
				onOpenChange={setDetailOpen}
				redemptions={data.codeRedemptions ?? []}
				describe={describe}
				onToggle={toggle}
				onEdit={
					saveCode
						? (code) => {
								setDetailOpen(false);
								setEditor({ open: true, code });
							}
						: undefined
				}
			/>
		</div>
	);
}

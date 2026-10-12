import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import {
	BILLING_ACCOUNT_DEMO,
	BillingAccount,
	type BillingAccountData,
	type BillingAccountView,
	DEMO_NOW,
	demoRedeemCode,
} from '../../components/billing-account';
import { pickDataset } from './dataset';
import { emptyAccount, hugeAccount, oneAccount, worstAccount } from './billing-worst-case';

const meta: Meta = {
	title: 'Break UI/Billing Account',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] },
	},
};
export default meta;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function Frame({ data, view, framedWidth, locale, timeZone }: { data: BillingAccountData; view: BillingAccountView; framedWidth?: number; locale?: string; timeZone?: string }) {
	const redeem = React.useMemo(() => demoRedeemCode(data), [data]);
	return (
		<div className="h-dvh min-h-[680px] p-2">
			<div className="mx-auto h-full overflow-hidden rounded-xl border border-border shadow-sm" style={{ maxWidth: framedWidth }}>
				<BillingAccount
					data={data}
					defaultView={view}
					now={DEMO_NOW}
					locale={locale}
					timeZone={timeZone}
					onChangePlan={async () => {
						await wait(300);
					}}
					onBuyCredits={async () => {
						await wait(300);
					}}
					onRedeemCode={async (code) => {
						await wait(200);
						return redeem(code);
					}}
				/>
			</div>
		</div>
	);
}

const story =
	(view: BillingAccountView): StoryObj =>
	({
		render: (_args, context) => {
			const data = pickDataset(context, { demo: BILLING_ACCOUNT_DEMO, worst: worstAccount, empty: emptyAccount, one: oneAccount, huge: hugeAccount });
			return <Frame data={data} view={view} />;
		},
	});

export const Overview: StoryObj = story('overview');
export const Usage: StoryObj = story('usage');
export const Plans: StoryObj = story('plans');
export const Credits: StoryObj = story('credits');
export const Invoices: StoryObj = story('invoices');
export const Activity: StoryObj = story('activity');

/** The same worst-case account formatted for other locales and time zones (money, dates, percentages, quantities). */
const localized = (view: BillingAccountView, locale: string, timeZone: string): StoryObj => ({
	render: (_args, context) => {
		const data = pickDataset(context, { demo: BILLING_ACCOUNT_DEMO, worst: worstAccount, empty: emptyAccount, one: oneAccount, huge: hugeAccount });
		return <Frame data={data} view={view} locale={locale} timeZone={timeZone} />;
	},
});
export const InvoicesGerman: StoryObj = localized('invoices', 'de-DE', 'Europe/Berlin');
export const OverviewJapanese: StoryObj = localized('overview', 'ja-JP', 'Asia/Tokyo');
export const CreditsArabic: StoryObj = localized('credits', 'ar-EG', 'Africa/Cairo');

// @vitest-environment node
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BILLING_ACCOUNT_DEMO, BillingAccount, type BillingAccountView } from '../src/components/billing-account';
import { BILLING_CONSOLE_DEMO, BillingConsole, type BillingConsoleView } from '../src/components/billing-console';
import { DEMO_NOW } from '../src/components/billing-kit';

describe('billing templates server rendering', () => {
	it.each<BillingAccountView>(['overview', 'usage', 'plans', 'credits', 'invoices', 'activity'])('renders the account %s view without browser globals', (view) => {
		expect(typeof window).toBe('undefined');
		const html = renderToString(<BillingAccount data={BILLING_ACCOUNT_DEMO} defaultView={view} now={DEMO_NOW} />);
		expect(html).toContain('data-slot="billing-account"');
	});

	it.each<BillingConsoleView>(['overview', 'catalog', 'customers', 'provider', 'standing'])('renders the console %s view without browser globals', (view) => {
		const html = renderToString(<BillingConsole data={BILLING_CONSOLE_DEMO} defaultView={view} now={DEMO_NOW} />);
		expect(html).toContain('data-slot="billing-console"');
	});
});

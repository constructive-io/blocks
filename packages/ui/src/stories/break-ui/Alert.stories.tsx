import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '../../components/alert';
import { Button } from '../../components/button';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { emails, identifiers, labels } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Alert',
	parameters: { breakUi: true },
};
export default meta;

type Variant = 'default' | 'info' | 'success' | 'warning' | 'destructive';

type AlertData = {
	note: string;
	width: number;
	variant: Variant;
	icon?: boolean;
	title?: React.ReactNode;
	description?: React.ReactNode;
	action?: string;
};

const demo: AlertData[] = [
	{
		note: 'Backup completed (420px)',
		width: 420,
		variant: 'success',
		icon: true,
		title: 'Backup completed',
		description: 'Snapshot snap_9f2c1 was verified and stored in two regions.',
	},
];

const worst: AlertData[] = [
	{
		note: 'Long title + 700-char description (320px viewport = 288px)',
		width: 288,
		variant: 'warning',
		icon: true,
		title: 'Quarterly reconciliation of enterprise seat licenses is waiting for sign-off from regional leads',
		description: labels.longDescription,
	},
	{
		note: 'Inline <code> with an unbroken identifier and an unbroken UUID (420px)',
		width: 420,
		variant: 'destructive',
		icon: true,
		title: 'Import failed',
		description: (
			<>
				A record with the reference{' '}
				<code>customer_subscription_billing_adjustment_line_items_external_reference</code> already exists for account{' '}
				{identifiers.uuid}.
			</>
		),
	},
	{
		note: 'Unbreakable URL and email in the description (320px)',
		width: 288,
		variant: 'info',
		icon: true,
		title: 'Invitation sent',
		description: `${emails.long} ${identifiers.url}`,
	},
	{
		note: 'Title only, no description (420px)',
		width: 420,
		variant: 'default',
		icon: true,
		title: 'Heads up',
	},
	{
		note: 'Description only, no icon, no title (420px)',
		width: 420,
		variant: 'warning',
		description: 'Your trial ends in 1 days.',
	},
	{
		note: 'Icon + empty title + description (420px)',
		width: 420,
		variant: 'info',
		icon: true,
		title: '',
		description: 'Title came back empty from the API.',
	},
	{
		note: 'Alert with a trailing action button (420px)',
		width: 420,
		variant: 'destructive',
		icon: true,
		title: 'Payment failed',
		description: 'The card ending in 4242 was declined.',
		action: 'Update card',
	},
	{
		note: 'Markup-like text (420px)',
		width: 420,
		variant: 'default',
		icon: true,
		title: labels.markup,
		description: labels.markup,
	},
];

const variantIcon: Record<Variant, React.ReactNode> = {
	default: <InfoIcon />,
	info: <InfoIcon />,
	success: <InfoIcon />,
	warning: <TriangleAlertIcon />,
	destructive: <CircleAlertIcon />,
};

export const Stress: StoryObj = {
	render: (_args, context) => {
		const alerts = pickDataset(context, { demo, worst });
		const variants: Variant[] = ['default', 'info', 'success', 'warning', 'destructive'];

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				{alerts.map((a) => (
					<Frame key={a.note} width={a.width} label={a.note}>
						<Alert variant={a.variant}>
							{a.icon ? variantIcon[a.variant] : null}
							{a.title !== undefined ? <AlertTitle>{a.title}</AlertTitle> : null}
							{a.description ? <AlertDescription>{a.description}</AlertDescription> : null}
							{a.action ? (
								<Button size="sm" variant="outline">
									{a.action}
								</Button>
							) : null}
						</Alert>
					</Frame>
				))}

				{alerts === worst ? (
					<Frame width={420} label="All variants (contrast in light and dark)">
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{variants.map((variant) => (
								<Alert key={variant} variant={variant} data-contrast={variant}>
									{variantIcon[variant]}
									<AlertTitle>{variant}</AlertTitle>
									<AlertDescription>Something worth reading carefully, in the {variant} variant.</AlertDescription>
								</Alert>
							))}
						</div>
					</Frame>
				) : null}
			</div>
		);
	},
};

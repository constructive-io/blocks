import type { Meta, StoryObj } from '@storybook/react-vite';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names, numbers } from './worst-case';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/tabs';

const meta: Meta = {
	title: 'Break UI/Tabs',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Tab = { value: string; label: string; content: string };

const demo: Tab[] = [
	{ value: 'account', label: 'Account', content: 'Make changes to your account here.' },
	{ value: 'password', label: 'Password', content: 'Change your password here.' },
	{ value: 'billing', label: 'Billing', content: 'Manage your plan and invoices.' },
];

// Tab labels come from translation files and from user data (project, workspace and file names).
const worst: Tab[] = [
	{ value: 't1', label: labels.german, content: identifiers.url },
	{ value: 't2', label: labels.french, content: labels.longDescription },
	{ value: 't3', label: names.longHyphenated, content: emails.long },
	{ value: 't4', label: labels.status, content: identifiers.cameraFile },
	{ value: 't5', label: identifiers.fileName, content: identifiers.uuid },
	{ value: 't6', label: names.cjk, content: '' },
	{ value: 't7', label: 'Jo', content: '' },
	{ value: 't8', label: `Comments (${numbers.million.toLocaleString('en-US')})`, content: '' },
	{ value: 't9', label: names.rtl, content: '' },
	{ value: 't10', label: names.emojiFirst, content: '' },
];

const huge: Tab[] = manyRows(100, (index) => ({ value: `t${index}`, label: `Workspace ${index + 1}`, content: `Panel ${index + 1}` }));

/** The same tab set in a 280px column and at page width; the tab strip cannot wrap. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const tabs = pickDataset<Tab[]>(context, { demo, worst, empty: [], one: [demo[0]], huge });
		const renderTabs = (testId: string) => (
			<Tabs defaultValue={tabs[0]?.value} data-testid={testId}>
				<TabsList>
					{tabs.map((tab) => (
						<TabsTrigger key={tab.value} value={tab.value}>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
				{tabs.map((tab) => (
					<TabsContent key={tab.value} value={tab.value} className="rounded-md border p-4 text-sm">
						{tab.content}
					</TabsContent>
				))}
			</Tabs>
		);
		return (
			<div className="flex w-full flex-col gap-8">
				<div style={{ width: 280, maxWidth: '100%' }} className="outline outline-1 outline-dashed outline-border" data-testid="narrow">
					{renderTabs('tabs-narrow')}
				</div>
				<div className="w-full outline outline-1 outline-dashed outline-border" data-testid="wide">
					{renderTabs('tabs-wide')}
				</div>
			</div>
		);
	},
};

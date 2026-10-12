import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import { PageHeader } from '../../components/page-header';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { identifiers, labels, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/PageHeader',
	parameters: { breakUi: true },
};
export default meta;

type HeaderData = {
	note: string;
	width: number;
	title: string;
	description?: string;
	actions?: 'two' | 'many' | 'badge' | 'none';
};

const demo: HeaderData[] = [
	{
		note: 'Production workspace (720px)',
		width: 720,
		title: 'Production workspace',
		description: 'Created in us-east-1.',
		actions: 'two',
	},
];

const worst: HeaderData[] = [
	{
		note: 'Camera file name as title, 2 actions (720px page)',
		width: 720,
		title: identifiers.cameraFile,
		description: 'Uploaded by ' + names.longHyphenated,
		actions: 'two',
	},
	{
		note: 'snake_case field name as title, 2 actions (480px)',
		width: 480,
		title: identifiers.snakeIdentifier,
		description: 'Field on Invoices · ' + labels.longDescription.slice(0, 160),
		actions: 'two',
	},
	{
		note: 'Sentence title with spaces + many actions (320px viewport)',
		width: 320,
		title: identifiers.fileName,
		description: labels.longDescription.slice(0, 140),
		actions: 'many',
	},
	{
		note: 'Title only + status badge (320px)',
		width: 320,
		title: 'Einstellungen für Benachrichtigungen',
		actions: 'badge',
	},
	{
		note: 'Empty title, description only (720px)',
		width: 720,
		title: '',
		description: 'The workspace name came back empty.',
		actions: 'two',
	},
	{
		note: 'RTL title + CJK description (480px)',
		width: 480,
		title: names.rtl,
		description: names.cjk + ' ' + names.vietnamese,
		actions: 'two',
	},
];

function actions(kind: HeaderData['actions']) {
	if (kind === 'two') {
		return (
			<>
				<Button size="sm" variant="outline">
					Logs
				</Button>
				<Button size="sm">Connect</Button>
			</>
		);
	}
	if (kind === 'many') {
		return (
			<>
				<Button size="sm" variant="outline">
					Share
				</Button>
				<Button size="sm" variant="outline">
					Download
				</Button>
				<Button size="sm">Publish changes</Button>
			</>
		);
	}
	if (kind === 'badge') {
		return <Badge variant="warning">{labels.status}</Badge>;
	}
	return undefined;
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const headers = pickDataset(context, { demo, worst });

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				{headers.map((h) => (
					<Frame key={h.note} width={h.width} label={h.note}>
						<PageHeader title={h.title} description={h.description} actions={actions(h.actions)} />
					</Frame>
				))}
			</div>
		);
	},
};

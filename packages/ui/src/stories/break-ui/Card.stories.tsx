import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoreHorizontalIcon } from 'lucide-react';

import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/card';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { identifiers, labels, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Card',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty'] } },
};
export default meta;

type CardData = {
	note: string;
	width: number;
	title: string;
	description?: string;
	action?: 'button' | 'icon' | 'badge';
	body?: string;
	footer?: string[];
	size?: 'default' | 'sm';
};

const demo: CardData[] = [
	{
		note: 'Team members card (350px)',
		width: 350,
		title: 'Team members',
		description: 'Manage who has access to this workspace.',
		action: 'button',
		body: 'You have 12 members.',
		footer: ['Cancel', 'Save'],
	},
];

const worst: CardData[] = [
	{
		note: 'File name title + 700-char description + long URL body + 3 footer buttons (320px viewport = 288px card)',
		width: 288,
		title: identifiers.fileName,
		description: labels.longDescription,
		action: 'button',
		body: identifiers.url,
		footer: ['Abbrechen', 'Als Entwurf speichern', 'Änderungen veröffentlichen'],
	},
	{
		note: 'Unbreakable snake_case title with a trailing action (350px)',
		width: 350,
		title: identifiers.snakeIdentifier,
		description: 'Field on Invoices',
		action: 'icon',
		body: 'Last edited by ' + names.longHyphenated,
	},
	{
		note: 'Wrapped title (leading-none) with stacked diacritics + badge action (350px)',
		width: 350,
		title: 'Đặng Thị Ngọc Hân và Christopher Alexander Montgomery III — hợp đồng gia hạn năm 2026',
		description: 'Đặng Thị Ngọc Hân',
		action: 'badge',
		body: 'Ẩn Ệ Ỗ Ợ Ử Ữ Ự Ỳ',
		size: 'sm',
	},
	{
		note: 'Title missing, description missing, nothing else (350px)',
		width: 350,
		title: '',
	},
];

const empty: CardData[] = [
	{ note: 'Header and nothing else (350px)', width: 350, title: 'Team members', description: 'Manage who has access to this workspace.' },
];

function action(kind: CardData['action']) {
	if (kind === 'button') {
		return (
			<CardAction>
				<Button size="sm" variant="outline">
					Download
				</Button>
			</CardAction>
		);
	}
	if (kind === 'icon') {
		return (
			<CardAction>
				<Button size="icon-sm" variant="ghost" aria-label="More">
					<MoreHorizontalIcon />
				</Button>
			</CardAction>
		);
	}
	if (kind === 'badge') {
		return (
			<CardAction>
				<Badge variant="warning">{labels.status}</Badge>
			</CardAction>
		);
	}
	return null;
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const cards = pickDataset(context, { demo, worst, empty });

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				{cards.map((card) => (
					<Frame key={card.note} width={card.width} label={card.note}>
						<Card size={card.size}>
							<CardHeader>
								<CardTitle>{card.title}</CardTitle>
								{card.description ? <CardDescription>{card.description}</CardDescription> : null}
								{action(card.action)}
							</CardHeader>
							{card.body ? (
								<CardContent>
									<p className="text-sm">{card.body}</p>
								</CardContent>
							) : null}
							{card.footer ? (
								<CardFooter>
									{card.footer.map((label, i) => (
										<Button key={label} variant={i === card.footer!.length - 1 ? 'default' : 'outline'}>
											{label}
										</Button>
									))}
								</CardFooter>
							) : null}
						</Card>
					</Frame>
				))}
			</div>
		);
	},
};

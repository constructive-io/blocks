import type { Meta, StoryObj } from '@storybook/react-vite';
import { InboxIcon, SearchIcon } from 'lucide-react';

import { Button } from '../../components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/empty';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { identifiers, labels } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Empty',
	parameters: { breakUi: true },
};
export default meta;

type EmptyData = {
	note: string;
	width: number;
	icon?: boolean;
	title?: string;
	description?: React.ReactNode;
	actions?: string[];
	minH?: boolean;
};

const demo: EmptyData[] = [
	{
		note: 'No records yet (420px)',
		width: 420,
		icon: true,
		title: 'No records yet',
		description: 'Create the first record to start exploring this list.',
		actions: ['Create record'],
		minH: true,
	},
];

const worst: EmptyData[] = [
	{
		note: 'Search echo with an unbroken identifier, 3 actions (320px viewport = 288px)',
		width: 288,
		icon: true,
		title: `No results for “${identifiers.snakeIdentifier}”`,
		description: (
			<>
				We searched names, descriptions and tags for <b>{identifiers.snakeIdentifier}</b> and found nothing. Try a shorter term.
			</>
		),
		actions: ['Clear search', 'Create item', 'Import from CSV'],
		minH: true,
	},
	{
		note: 'Translated copy, 700-char description (420px)',
		width: 420,
		icon: true,
		title: labels.french + ' — aucun résultat pour cette recherche',
		description: labels.longDescription,
		actions: ['Réinitialiser les filtres et la recherche enregistrée'],
	},
	{
		note: 'Title only (280px sidebar)',
		width: 280,
		title: 'Nothing here',
	},
	{
		note: 'Empty strings (420px)',
		width: 420,
		icon: true,
		title: '',
		description: '',
		actions: [],
		minH: true,
	},
	{
		note: 'Unbroken URL as description (320px)',
		width: 288,
		icon: true,
		title: 'Webhook endpoint unreachable',
		description: identifiers.url,
		actions: ['Retry'],
	},
];

export const Stress: StoryObj = {
	render: (_args, context) => {
		const states = pickDataset(context, { demo, worst });

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				{states.map((s) => (
					<Frame key={s.note} width={s.width} label={s.note}>
						<Empty className={s.minH ? 'min-h-72 border' : 'border'}>
							<EmptyHeader>
								{s.icon ? (
									<EmptyMedia variant="icon">{s.title?.startsWith('No results') ? <SearchIcon /> : <InboxIcon />}</EmptyMedia>
								) : null}
								{s.title !== undefined ? <EmptyTitle>{s.title}</EmptyTitle> : null}
								{s.description !== undefined ? <EmptyDescription>{s.description}</EmptyDescription> : null}
							</EmptyHeader>
							{s.actions && s.actions.length > 0 ? (
								<EmptyContent>
									{s.actions.map((label, i) => (
										<Button key={label} variant={i === 0 ? 'default' : 'outline'}>
											{label}
										</Button>
									))}
								</EmptyContent>
							) : null}
						</Empty>
					</Frame>
				))}
			</div>
		);
	},
};

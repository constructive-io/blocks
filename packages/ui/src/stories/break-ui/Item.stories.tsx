import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTextIcon, MoreHorizontalIcon } from 'lucide-react';

import { Avatar, AvatarFallback } from '../../components/avatar';
import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from '../../components/item';
import { pickDataset } from './dataset';
import { faceImage, Frame } from './group-a-frame';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Item',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Status = 'active' | 'invited' | 'expired' | 'suspended';
type Member = {
	name: string;
	email?: string;
	initials: string;
	status?: string;
	statusVariant?: 'success' | 'info' | 'warning' | 'error' | 'secondary';
	actions?: 'none' | 'badge' | 'full';
	media?: 'avatar' | 'icon' | 'image';
	title?: React.ReactNode;
};

const jane: Member = { name: 'Jane Doe', email: 'jane@acme.com', initials: 'JD', status: 'Active', statusVariant: 'success', actions: 'full' };

const worst: Member[] = [
	{ name: names.longHyphenated, email: emails.long, initials: 'AW', status: labels.status, statusVariant: 'warning', actions: 'full' },
	{ name: names.twoLetters, email: emails.short, initials: 'J', status: 'Active', statusVariant: 'success', actions: 'full' },
	{ name: names.emojiFirst, email: emails.plus, initials: '🦊', actions: 'none' },
	{ name: names.cjk, initials: '王', status: 'Suspended', statusVariant: 'error', actions: 'badge' },
	{ name: identifiers.fileName, email: labels.longDescription, initials: 'Q3', media: 'icon', actions: 'badge', status: 'v12', statusVariant: 'secondary' },
	{ name: identifiers.cameraFile, email: identifiers.uuid, initials: 'IM', media: 'image', actions: 'full', status: 'HEIC', statusVariant: 'info' },
	{ name: names.vietnamese, email: emails.subdomains, initials: 'ĐH', status: 'Expired', statusVariant: 'error', actions: 'full' },
	{ name: names.rtl, email: 'نور@example.test', initials: 'نه', status: 'مدعو', statusVariant: 'info', actions: 'full' },
	{
		name: names.longSuffix,
		email: emails.plus,
		initials: 'CM',
		title: (
			<>
				{names.longSuffix}
				<Badge variant="secondary">Owner</Badge>
				<Badge variant="info">You</Badge>
			</>
		),
		actions: 'full',
		status: 'Active',
		statusVariant: 'success',
	},
];

function Media({ member }: { member: Member }) {
	if (member.media === 'icon') {
		return (
			<ItemMedia variant="icon">
				<FileTextIcon />
			</ItemMedia>
		);
	}
	if (member.media === 'image') {
		return (
			<ItemMedia variant="image">
				<img src={faceImage(4000, 200)} alt="" />
			</ItemMedia>
		);
	}
	return (
		<ItemMedia>
			<Avatar>
				<AvatarFallback>{member.initials}</AvatarFallback>
			</Avatar>
		</ItemMedia>
	);
}

function MemberItem({ member, size }: { member: Member; size?: 'default' | 'sm' | 'xs' }) {
	return (
		<Item variant="outline" size={size}>
			<Media member={member} />
			<ItemContent>
				<ItemTitle>{member.title ?? member.name}</ItemTitle>
				{member.email ? <ItemDescription>{member.email}</ItemDescription> : null}
			</ItemContent>
			{member.actions && member.actions !== 'none' ? (
				<ItemActions>
					{member.status ? <Badge variant={member.statusVariant}>{member.status}</Badge> : null}
					{member.actions === 'full' ? (
						<>
							<Button size="sm" variant="outline">
								Resend
							</Button>
							<Button size="icon-sm" variant="ghost" aria-label="More">
								<MoreHorizontalIcon />
							</Button>
						</>
					) : null}
				</ItemActions>
			) : null}
		</Item>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const mode = context.globals.dataset as string | undefined;
		const members = pickDataset(context, {
			demo: [jane],
			worst,
			empty: [] as Member[],
			one: [worst[0]],
			huge: manyRows(1000, (i): Member => ({
				name: `${worst[i % worst.length].name}`,
				email: `member-${i + 1}@example.test`,
				initials: 'MB',
				status: 'Active',
				statusVariant: 'success',
				actions: 'full',
			})),
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={280} label={`Member rows in a 280px sidebar (${members.length} rows)`}>
					<ItemGroup>
						{members.map((member, i) => (
							<MemberItem key={i} member={member} size="sm" />
						))}
					</ItemGroup>
				</Frame>

				{mode === 'worst' ? (
					<>
						<Frame width={480} label="Same rows in a 480px dialog (default size)">
							<ItemGroup>
								{worst.slice(0, 6).map((member, i) => (
									<MemberItem key={i} member={member} />
								))}
							</ItemGroup>
						</Frame>

						<Frame width={360} label="Rows with header and footer, separators, two content columns (360px)">
							<ItemGroup className="gap-0">
								<Item size="sm">
									<ItemHeader>
										<span className="truncate text-xs">{identifiers.fileName}</span>
										<Badge variant="info">{labels.status}</Badge>
									</ItemHeader>
									<ItemMedia variant="icon">
										<FileTextIcon />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>{names.longHyphenated}</ItemTitle>
										<ItemDescription>{emails.long}</ItemDescription>
									</ItemContent>
									<ItemContent>
										<ItemTitle>{labels.german}</ItemTitle>
									</ItemContent>
									<ItemFooter>
										<span className="text-xs text-muted-foreground">{identifiers.uuid}</span>
										<Button size="xs">Open</Button>
									</ItemFooter>
								</Item>
								<ItemSeparator />
								<Item size="xs">
									<ItemContent>
										<ItemTitle>{labels.french}</ItemTitle>
									</ItemContent>
									<ItemActions>
										<Badge>{labels.status}</Badge>
									</ItemActions>
								</Item>
							</ItemGroup>
						</Frame>
					</>
				) : null}
			</div>
		);
	},
};

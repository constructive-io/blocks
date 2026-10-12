import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar, AvatarFallback, AvatarImage } from '../../components/avatar';
import { pickDataset } from './dataset';
import { Caption, faceImage, Frame, transparentLogo } from './group-a-frame';
import { emails, manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Avatar',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Tile = { note: string; fallback: string; src?: string; className?: string; fallbackClassName?: string };

const demoTiles: Tile[] = [
	{ note: 'JD', fallback: 'JD' },
	{ note: 'AB', fallback: 'AB' },
	{ note: 'image', fallback: 'CN', src: faceImage(200, 200) },
];

// Fallback text the way apps really derive it: every word initial, full first names, counts, emoji.
const worstFallbacks: Tile[] = [
	{ note: 'two letters', fallback: 'AW' },
	{ note: 'all word initials (Christopher Alexander Montgomery III)', fallback: 'CAMI' },
	{ note: 'one letter', fallback: 'J' },
	{ note: 'CJK full name', fallback: names.cjk },
	{ note: 'accented capitals', fallback: 'ÓÓ' },
	{ note: 'emoji', fallback: '🦊' },
	{ note: 'ZWJ emoji', fallback: '👩🏽‍💻' },
	{ note: 'overflow count', fallback: '+1,284' },
	{ note: 'empty string', fallback: '' },
	{ note: 'Vietnamese stack', fallback: 'Đặng' },
	{ note: 'RTL initials', fallback: 'نه' },
	{ note: 'first name only', fallback: 'Konstantin' },
];

const worstImages: Tile[] = [
	{ note: 'image 404', fallback: 'AW', src: 'https://example.com/avatars/does-not-exist.png' },
	{ note: 'src empty string', fallback: 'AW', src: '' },
	{ note: 'src missing', fallback: 'AW' },
	{ note: '4000×200 panorama', fallback: 'AW', src: faceImage(4000, 200) },
	{ note: '200×4000 tall', fallback: 'AW', src: faceImage(200, 4000) },
	{ note: 'square control', fallback: 'AW', src: faceImage(200, 200) },
	{ note: 'transparent dark logo', fallback: 'AW', src: transparentLogo('#111827') },
	{ note: 'transparent white logo', fallback: 'AW', src: transparentLogo('#ffffff') },
];

// Same fallback at the three sizes apps use; the fallback font size is fixed at text-xs.
const sizes: Array<{ note: string; className: string; fallback: string }> = [
	{ note: 'size-6 + 2 letters', className: 'size-6', fallback: 'AW' },
	{ note: 'size-6 + 3 letters', className: 'size-6', fallback: 'CAM' },
	{ note: 'size-8 + 2 letters', className: '', fallback: 'AW' },
	{ note: 'size-12 + 2 letters', className: 'size-12', fallback: 'AW' },
	{ note: 'size-16 + 2 letters', className: 'size-16', fallback: 'AW' },
];

function AvatarTile({ tile }: { tile: Tile }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
			<Avatar className={tile.className}>
				{tile.src !== undefined ? <AvatarImage src={tile.src} alt="" /> : null}
				<AvatarFallback className={tile.fallbackClassName}>{tile.fallback}</AvatarFallback>
			</Avatar>
			<Caption>{tile.note}</Caption>
		</div>
	);
}

function TileGrid({ tiles }: { tiles: Tile[] }) {
	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px' }}>
			{tiles.map((tile) => (
				<AvatarTile key={tile.note} tile={tile} />
			))}
		</div>
	);
}

/** The row every member list renders: avatar, name, email, and a trailing count. */
function MemberRow({ name, email, fallback, src }: { name: string; email: string; fallback: string; src?: string }) {
	return (
		<div className="flex items-center gap-3 px-2 py-2">
			<Avatar>
				{src !== undefined ? <AvatarImage src={src} alt="" /> : null}
				<AvatarFallback>{fallback}</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{name}</p>
				<p className="truncate text-xs text-muted-foreground">{email}</p>
			</div>
			<span className="text-xs tabular-nums text-muted-foreground">12</span>
		</div>
	);
}

type GroupProps = { count: number; overflow?: string };

function AvatarGroup({ count, overflow }: GroupProps) {
	return (
		<div className="flex -space-x-2">
			{Array.from({ length: count }, (_, i) => (
				<Avatar key={i} className="border-2 border-background">
					<AvatarFallback>{`U${i + 1}`}</AvatarFallback>
				</Avatar>
			))}
			{overflow ? (
				<Avatar className="border-2 border-background">
					<AvatarFallback>{overflow}</AvatarFallback>
				</Avatar>
			) : null}
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const mode = context.globals.dataset as string | undefined;
		const fallbacks = pickDataset(context, { demo: demoTiles, worst: worstFallbacks, empty: [], one: [demoTiles[0]] });
		const images = pickDataset(context, { demo: [] as Tile[], worst: worstImages, empty: [], one: [] });

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={420} label="Fallback content (size-8 default)">
					<div style={{ padding: 8 }}>
						<TileGrid tiles={fallbacks} />
					</div>
				</Frame>

				{images.length > 0 ? (
					<Frame width={420} label="Image shapes and failures (size-8 default)">
						<div style={{ padding: 8 }}>
							<TileGrid tiles={images} />
						</div>
					</Frame>
				) : null}

				{mode === 'worst' ? (
					<Frame width={420} label="Fixed fallback font size across avatar sizes">
						<div style={{ padding: 8, display: 'flex', flexWrap: 'wrap', gap: '12px 16px', alignItems: 'flex-end' }}>
							{sizes.map((size) => (
								<div key={size.note} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
									<Avatar className={size.className}>
										<AvatarFallback>{size.fallback}</AvatarFallback>
									</Avatar>
									<Caption>{size.note}</Caption>
								</div>
							))}
						</div>
					</Frame>
				) : null}

				<Frame width={280} label="Member rows in a 280px sidebar">
					{mode === 'worst' ? (
						<>
							<MemberRow name={names.longHyphenated} email={emails.long} fallback="AW" />
							<MemberRow name={names.twoLetters} email={emails.short} fallback="J" />
							<MemberRow name={names.emojiFirst} email={emails.plus} fallback="🦊" src="https://example.com/x.png" />
							<MemberRow name={names.cjk} email={emails.subdomains} fallback={names.cjk} src={faceImage(4000, 200)} />
						</>
					) : (
						<MemberRow name="Jane Doe" email="jane@acme.com" fallback="JD" />
					)}
				</Frame>

				<Frame width={280} label="Stacked group">
					{mode === 'empty' ? null : mode === 'one' ? (
						<AvatarGroup count={1} />
					) : mode === 'huge' ? (
						<AvatarGroup count={manyRows(40, (i) => i).length} overflow="+1,284" />
					) : mode === 'worst' ? (
						<AvatarGroup count={6} overflow="+1,284" />
					) : (
						<AvatarGroup count={3} overflow="+5" />
					)}
				</Frame>
			</div>
		);
	},
};

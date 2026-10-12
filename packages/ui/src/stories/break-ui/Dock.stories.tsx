import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Dock, DockIcon } from '../../components/dock';
import { pickDataset } from './dataset';
import { faceImage, Frame } from './group-a-frame';
import { manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Dock',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type App = { key: string; glyph: React.ReactNode; tone: string; label: string };

const tones = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500'];

const demo: App[] = [
	{ key: 'mail', glyph: '📧', tone: tones[0], label: 'Mail' },
	{ key: 'chat', glyph: '💬', tone: tones[1], label: 'Chat' },
	{ key: 'photos', glyph: '📷', tone: tones[2], label: 'Photos' },
	{ key: 'music', glyph: '🎵', tone: tones[3], label: 'Music' },
	{ key: 'games', glyph: '🎮', tone: tones[4], label: 'Games' },
];

const worst: App[] = [
	{ key: 'mail', glyph: '📧', tone: tones[0], label: names.longHyphenated },
	{ key: 'count', glyph: '1,284', tone: tones[1], label: 'Unread count as the icon content' },
	{ key: 'initials', glyph: 'AW', tone: tones[2], label: names.longHyphenated },
	{ key: 'zwj', glyph: '👩🏽‍💻', tone: tones[3], label: names.zwjEmoji },
	{ key: 'text', glyph: 'Benachrichtigungen', tone: tones[4], label: 'German label as the icon content' },
	{ key: 'cjk', glyph: names.cjk, tone: tones[5], label: names.cjk },
	{ key: 'image', glyph: <img src={faceImage(4000, 200)} alt="" className="size-full rounded-full object-cover" />, tone: 'bg-transparent', label: 'Panorama image' },
	...manyRows(7, (i): App => ({ key: `extra-${i}`, glyph: '🎵', tone: tones[i % tones.length], label: `Extra ${i + 1}` })),
];

function Glyph({ app }: { app: App }) {
	return (
		<div className={`flex size-full items-center justify-center rounded-full font-semibold text-white ${app.tone}`} title={app.label}>
			{app.glyph}
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const mode = context.globals.dataset as string | undefined;
		const apps = pickDataset(context, {
			demo,
			worst,
			empty: [] as App[],
			one: [demo[0]],
			huge: manyRows(30, (i): App => ({ key: `app-${i}`, glyph: '🎵', tone: tones[i % tones.length], label: `App ${i + 1}` })),
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={320} label={`${apps.length} icons, flat children, 320px viewport`}>
					<div data-case="flat" style={{ paddingBottom: 40 }}>
						<Dock iconSize={32} iconMagnification={56}>
							{apps.map((app) => (
								<DockIcon key={app.key} data-icon={app.key}>
									<Glyph app={app} />
								</DockIcon>
							))}
						</Dock>
					</div>
				</Frame>

				<Frame width={720} label={`${apps.length} icons, flat children, 720px (icons have onClick: keyboard operable)`}>
					<div data-case="clickable" style={{ paddingBottom: 40 }}>
						<Dock iconSize={32} iconMagnification={56}>
							{apps.map((app) => (
								<DockIcon
									key={app.key}
									aria-label={app.label}
									onClick={() => {
										(window as unknown as { __dockClicks?: number }).__dockClicks =
											((window as unknown as { __dockClicks?: number }).__dockClicks ?? 0) + 1;
									}}
								>
									<Glyph app={app} />
								</DockIcon>
							))}
						</Dock>
					</div>
				</Frame>

				{mode === 'worst' || mode === 'demo' ? (
					<Frame width={720} label="Same icons inside a fragment (iconSize / magnification reach them through context)">
						<div data-case="fragment" style={{ paddingBottom: 40 }}>
							<Dock iconSize={32} iconMagnification={56}>
								<>
									{apps.slice(0, 5).map((app) => (
										<DockIcon key={app.key} data-icon={app.key}>
											<Glyph app={app} />
										</DockIcon>
									))}
								</>
							</Dock>
						</div>
					</Frame>
				) : null}
			</div>
		);
	},
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoIcon } from 'lucide-react';

import { Button } from '../../components/button';
import { Kbd, KbdGroup } from '../../components/kbd';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/tooltip';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Tooltip',
	parameters: { breakUi: true },
};
export default meta;

type Case = {
	note: string;
	trigger: React.ReactNode;
	content: React.ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
	align?: 'start' | 'center' | 'end';
	/** Keep the tooltip open so it can be measured without hovering. */
	open?: boolean;
};

const demo: Case[] = [
	{
		note: 'Short label on an icon button',
		trigger: (
			<Button size="icon" variant="outline" aria-label="Info">
				<InfoIcon />
			</Button>
		),
		content: 'More information',
		open: true,
	},
];

/** A row truncated with an ellipsis, revealing the full value in a tooltip. */
function Truncated({ value }: { value: string }) {
	return <span className="block w-[200px] truncate text-sm">{value}</span>;
}

const worst: Case[] = [
	{ note: 'Full email behind a truncated row (64 unbroken chars)', trigger: <Truncated value={emails.long} />, content: emails.long, open: true },
	{ note: 'Camera file name (unbroken, uppercase extension)', trigger: <Truncated value={identifiers.cameraFile} />, content: identifiers.cameraFile, open: true },
	{ note: 'snake_case field name', trigger: <Truncated value={identifiers.snakeIdentifier} />, content: identifiers.snakeIdentifier, open: true },
	{ note: 'File name with brackets and dashes (breakable)', trigger: <Truncated value={identifiers.fileName} />, content: identifiers.fileName, open: true },
	{ note: '700-char description as tooltip', trigger: <Truncated value={names.longHyphenated} />, content: labels.longDescription, open: true },
	{ note: 'Markup-like text', trigger: <Truncated value="markup" />, content: labels.markup, open: true },
	{
		note: 'Shortcut hints (Kbd inside)',
		trigger: (
			<Button size="sm" variant="outline">
				Save
			</Button>
		),
		content: (
			<span className="flex items-center gap-2">
				Save changes
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<Kbd>Shift</Kbd>
					<Kbd>S</Kbd>
				</KbdGroup>
			</span>
		),
		open: true,
	},
	{ note: 'Empty content', trigger: <Truncated value="empty" />, content: '', open: true },
	{ note: 'RTL + CJK text', trigger: <Truncated value="rtl" />, content: `${names.rtl} · ${names.cjk} · ${names.vietnamese}`, open: true },
];

export const Stress: StoryObj = {
	render: (_args, context) => {
		const cases = pickDataset(context, { demo, worst });
		const isWorst = cases === worst;

		return (
			<>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '90px 24px', paddingTop: 60 }}>
					{cases.map((c) => (
						<div key={c.note}>
							<div style={{ font: '11px/1.4 system-ui, sans-serif', color: '#737373', marginBottom: 6 }}>{c.note}</div>
							{/* One provider per case: a shared provider keeps a single tooltip open at a time. */}
							<TooltipProvider>
								<Tooltip defaultOpen={c.open}>
									<TooltipTrigger render={<span data-tooltip-trigger={c.note} className="inline-block" />}>{c.trigger}</TooltipTrigger>
									<TooltipContent side={c.side ?? 'top'} align={c.align}>
										{c.content}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					))}
				</div>

				{isWorst ? (
					<div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
						<div style={{ font: '11px/1.4 system-ui, sans-serif', color: '#737373' }}>
							Real hover (delay 600ms): a disabled button with an explanation, then an enabled control as a baseline
						</div>
						<TooltipProvider>
						<div style={{ display: 'flex', gap: 16 }}>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button disabled data-case="disabled-trigger">
										Delete workspace
									</Button>
								</TooltipTrigger>
								<TooltipContent>You need to be an owner to delete this workspace.</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="outline" data-case="enabled-trigger">
										Rename
									</Button>
								</TooltipTrigger>
								<TooltipContent>Rename this workspace</TooltipContent>
							</Tooltip>
						</div>
						</TooltipProvider>

						<div style={{ font: '11px/1.4 system-ui, sans-serif', color: '#737373' }}>Trigger flush against the right edge, tooltip anchored to it</div>
						<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
							<TooltipProvider>
							<Tooltip defaultOpen>
								<TooltipTrigger asChild>
									<Button variant="outline" size="icon" aria-label="Edge" data-case="edge-trigger">
										<InfoIcon />
									</Button>
								</TooltipTrigger>
								<TooltipContent>{identifiers.fileName}</TooltipContent>
							</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				) : null}
			</>
		);
	},
};

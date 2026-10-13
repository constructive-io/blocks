import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyIcon, FolderIcon, Trash2Icon } from 'lucide-react';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';
import { Button } from '../../components/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '../../components/dropdown-menu';

const meta: Meta = {
	title: 'Break UI/DropdownMenu',
	// Fullscreen so the triggers can sit at the left and right edges of the viewport.
	parameters: { layout: 'fullscreen', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Item = { label: string; shortcut?: string };

const demoItems: Item[] = [
	{ label: 'New tab', shortcut: '⌘T' },
	{ label: 'New window', shortcut: '⌘N' },
	{ label: 'Print…', shortcut: '⌘P' },
];

// Labels are a mix of translated UI copy and data (file names, emails, workspaces).
const worstItems: Item[] = [
	{ label: identifiers.fileName, shortcut: '⇧⌘⌥N' },
	{ label: labels.german, shortcut: 'Ctrl+Alt+Shift+Delete' },
	{ label: labels.french },
	{ label: emails.long, shortcut: '⌘K' },
	{ label: 'Jo', shortcut: '⌘J' },
	{ label: names.vietnamese },
	{ label: names.cjk },
	{ label: names.rtl, shortcut: '⌘R' },
	{ label: identifiers.cameraFile },
];

const workspaces = (count: number): Item[] =>
	manyRows(count, (index) => ({ label: `${[names.longHyphenated, names.compound, 'Acme', identifiers.snakeIdentifier][index % 4]} ${index + 1}` }));

/** Menus at the left edge, center, and right edge; ids are stable so a test can click them. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const items = pickDataset<Item[]>(context, {
			demo: demoItems,
			worst: worstItems,
			empty: [],
			one: [worstItems[0]],
			huge: workspaces(1000),
		});
		return (
			<div className="flex min-h-[420px] w-full items-start justify-between gap-2 p-2">
				{/* 1. Plain actions with shortcuts, aligned to the left edge. */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button data-testid="open-actions" variant="outline" size="sm">Actions</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuLabel>{labels.french}</DropdownMenuLabel>
						{items.map((item, index) => (
							<DropdownMenuItem key={index}>
								<FolderIcon />
								{item.label}
								{item.shortcut ? <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut> : null}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive">
							<Trash2Icon />
							{items[0]?.label ?? 'Delete'}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* 2. Checkbox and radio items with long labels. */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button data-testid="open-checks" variant="outline" size="sm">Checks</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="center">
						<DropdownMenuGroup>
							<DropdownMenuLabel>{labels.german}</DropdownMenuLabel>
							{items.slice(0, 4).map((item, index) => (
								<DropdownMenuCheckboxItem key={index} checked={index % 2 === 0}>
									{item.label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuRadioGroup value="1">
							{items.slice(0, 3).map((item, index) => (
								<DropdownMenuRadioItem key={index} value={String(index)}>
									{item.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* 3. A submenu whose trigger label and items are long, at the right edge. */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button data-testid="open-sub" variant="outline" size="sm">Submenu</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>
							<CopyIcon />
							Copy link
						</DropdownMenuItem>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>{items[0]?.label ?? 'Move to workspace'}</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{items.map((item, index) => (
									<DropdownMenuItem key={index}>
										{item.label}
										{item.shortcut ? <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut> : null}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	},
};

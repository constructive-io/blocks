import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileIcon, UserIcon } from 'lucide-react';

import {
	Command,
	CommandDialog,
	CommandDialogPopup,
	CommandEmpty,
	CommandFooter,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
	CommandPanel,
	CommandShortcut,
} from '../../components/command';
import { caption, demoOptions, manyOptions, worstOptions, type Option } from './b-fixtures';
import { pickDataset } from './dataset';

const meta: Meta = {
	title: 'Break UI/Command',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const shortcuts = ['⌘K', '⌘⇧P', '⌥⌘⇧N', '⌃⌥⌘Delete'];

const demo = { options: demoOptions, group: 'Suggestions' };
const worst = {
	options: worstOptions,
	group: 'Workspaces inherited from the Northwind Industries Holdings organization',
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

function Rows({ options, withDescription = false }: { options: Option[]; withDescription?: boolean }) {
	return (
		<>
			{options.map((option, index) => (
				<CommandItem key={option.value} value={option.label}>
					{index % 2 === 0 ? <FileIcon className="size-4" /> : <UserIcon className="size-4" />}
					{withDescription ? (
						<div className="flex flex-col">
							<span>{option.label}</span>
							{option.description && <span className="text-muted-foreground text-xs">{option.description}</span>}
						</div>
					) : (
						<span>{option.label}</span>
					)}
					<CommandShortcut>{shortcuts[index % shortcuts.length]}</CommandShortcut>
				</CommandItem>
			))}
		</>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: { options: [], group: 'Suggestions' },
			one: { options: [demoOptions[0]], group: 'Suggestions' },
			huge: { options: manyOptions, group: 'Workspaces' },
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 56 }}>
				<Cell title="Inline command 350px, icon + label + shortcut" width={350}>
					<Command className="rounded-lg border shadow-md" data-testid="cmd-350">
						<CommandInput placeholder="Type a command or search..." />
						<CommandList>
							<CommandGroup>
								<CommandGroupLabel>{data.group}</CommandGroupLabel>
								<Rows options={data.options} />
							</CommandGroup>
						</CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
					</Command>
				</Cell>

				<Cell title="Sidebar 240px, label + description rows" width={240}>
					<Command className="rounded-lg border shadow-md" data-testid="cmd-240">
						<CommandInput placeholder="Search" />
						<CommandList>
							<CommandGroup heading={data.group}>
								<Rows options={data.options} withDescription />
							</CommandGroup>
						</CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
					</Command>
				</Cell>
			</div>
		);
	},
};

/** The palette form: always open so the dialog can be inspected at any width. */
export const Palette: StoryObj = {
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] }, layout: 'fullscreen' },
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: { options: [], group: 'Suggestions' },
			one: { options: [demoOptions[0]], group: 'Suggestions' },
			huge: { options: manyOptions, group: 'Workspaces' },
		});

		return (
			<CommandDialog open onOpenChange={() => {}}>
				<CommandDialogPopup>
					<Command>
						<CommandInput placeholder="Type a command or search..." />
						<CommandPanel>
							<CommandList>
								<CommandGroup>
									<CommandGroupLabel>{data.group}</CommandGroupLabel>
									<Rows options={data.options} />
								</CommandGroup>
							</CommandList>
							<CommandEmpty>No results found.</CommandEmpty>
						</CommandPanel>
						<CommandFooter>
							<span>Press Enter to open {data.options[0]?.label ?? 'an item'}</span>
							<span>ESC to close</span>
						</CommandFooter>
					</Command>
				</CommandDialogPopup>
			</CommandDialog>
		);
	},
};

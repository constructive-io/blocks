'use client';

import { FileCode2 } from 'lucide-react';

import { Command, CommandDialog, CommandDialogPopup, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandPanel } from '../command';
import { MiddleTruncate } from '../workspace-kit/middle-truncate';

/** Open file (⌘P): a search over the checkout's paths that opens the one you pick in a pinned tab. */
export function FilePickerDialog({
	open,
	onOpenChange,
	paths,
	onPick
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	paths: string[];
	onPick: (path: string) => void;
}) {
	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandDialogPopup>
				<Command>
					<CommandInput placeholder="Open a file…" />
					<CommandPanel>
						<CommandList>
							<CommandEmpty>No matching files.</CommandEmpty>
							<CommandGroup>
								{paths.map((path) => (
									<CommandItem
										key={path}
										value={path}
										onSelect={() => {
											onPick(path);
											onOpenChange(false);
										}}
									>
										<FileCode2 aria-hidden="true" className="size-3.5 text-muted-foreground" />
										{/* Paths share long folders and differ at the end, so the file name stays visible. */}
										<MiddleTruncate text={path} tail={Math.min((path.split('/').pop() ?? '').length, 28)} className="min-w-0 flex-1 font-mono text-[0.8125rem]" />
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</CommandPanel>
				</Command>
			</CommandDialogPopup>
		</CommandDialog>
	);
}

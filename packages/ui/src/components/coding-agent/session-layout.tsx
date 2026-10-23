'use client';

import type * as React from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../resizable';
import { splitHandleClass } from './session-surface';

/** Chat, panel and terminal are columns of one surface; each fills its slot and the hairlines between them do the rest. */
export const columnClass = 'flex h-full min-h-0 flex-col bg-background';

/** The chat keeps at least this much height, so dragging the terminal up never pushes the composer out of view. */
const CHAT_MIN_HEIGHT = 360;

/**
 * Where a session's chat, side panel and terminal sit. Wide, they're resizable columns with the terminal docked
 * along the bottom; narrow, the panel takes the chat's place while it's open and the terminal keeps its own slot.
 */
export function SessionLayout({
	narrow,
	height,
	chat,
	panel,
	terminal,
	panelOpen,
	terminalOpen
}: {
	narrow: boolean;
	/** The session's height, which caps how tall the terminal may get. */
	height: number;
	chat: React.ReactNode;
	panel: React.ReactNode;
	terminal: React.ReactNode;
	panelOpen: boolean;
	terminalOpen: boolean;
}) {
	if (narrow) {
		return (
			<div className="flex h-full min-h-0 flex-col">
				<div className="relative min-h-0 flex-1">
					{chat}
					{panelOpen ? <div className="absolute inset-0 z-10">{panel}</div> : null}
				</div>
				{terminalOpen ? <div className="h-[min(14rem,30%)] shrink-0 border-t border-border">{terminal}</div> : null}
			</div>
		);
	}

	const terminalMax = Number.isFinite(height) ? Math.max(15, Math.min(70, 100 - (CHAT_MIN_HEIGHT / height) * 100)) : 70;
	return (
		<ResizablePanelGroup direction="vertical" autoSaveId={undefined}>
			<ResizablePanel id="main" order={1} minSize={30} defaultSize={terminalOpen ? 70 : 100}>
				<ResizablePanelGroup direction="horizontal">
					<ResizablePanel id="chat" order={1} minSize={30} defaultSize={panelOpen ? 50 : 100}>
						{chat}
					</ResizablePanel>
					{panelOpen ? (
						<>
							<ResizableHandle className={splitHandleClass} />
							<ResizablePanel id="panel" order={2} minSize={28} defaultSize={50}>
								{panel}
							</ResizablePanel>
						</>
					) : null}
				</ResizablePanelGroup>
			</ResizablePanel>
			{terminalOpen ? (
				<>
					<ResizableHandle className={splitHandleClass} />
					<ResizablePanel id="terminal" order={2} minSize={15} maxSize={terminalMax} defaultSize={Math.min(30, terminalMax)}>
						{terminal}
					</ResizablePanel>
				</>
			) : null}
		</ResizablePanelGroup>
	);
}

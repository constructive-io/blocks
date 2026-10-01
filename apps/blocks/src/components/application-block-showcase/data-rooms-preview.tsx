'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';

import {
  DATA_ROOMS_DEMO,
  DataRooms,
  type DataRoomsAction,
  type DataRoomsCommand,
  type DataRoomsTheme,
} from '@/components/ui/data-rooms';

function describeAction(action: DataRoomsAction) {
  switch (action.type) {
    case 'download':
      return 'The host would serve a watermarked download and log it.';
    case 'view-document':
      return 'The host would record this view in the access log.';
    case 'export-activity':
      return 'The host would export the activity log as CSV.';
    case 'search':
      return `The host would search for “${action.query}”.`;
    case 'contact':
      return 'The host would open a message to this person.';
    case 'org-menu':
      return `The host would open ${action.item.replace('-', ' ')}.`;
  }
}

function describeCommand(command: DataRoomsCommand) {
  switch (command.type) {
    case 'invite':
      return `Invited ${command.invites.length} ${command.invites.length === 1 ? 'person' : 'people'}.`;
    case 'create-share':
      return `Shared ${command.folder} with ${command.personIds.length} ${command.personIds.length === 1 ? 'person' : 'people'}.`;
    case 'upload':
      return `Uploaded ${command.files.length} ${command.files.length === 1 ? 'file' : 'files'}; they index for a moment.`;
    case 'accept-agreement':
      return 'Agreement accepted.';
    case 'answer-question':
      return 'Answer sent to the asker.';
    default:
      return `Saved: ${command.type.replace(/-/g, ' ')}.`;
  }
}

export function DataRoomsPreview() {
  const { theme, setTheme } = useTheme();
  const [message, setMessage] = useState(
    'Open Project Atlas, preview it as a bidder, check why someone has access, or share a folder until a date.',
  );

  return (
    <div
      className="flex h-dvh min-h-[640px] w-full flex-col"
      data-slot="application-block-showcase-canvas"
    >
      <DataRooms
        className="min-h-0 flex-1"
        data={DATA_ROOMS_DEMO}
        defaultView="room"
        defaultRoomId="room-atlas"
        theme={(theme as DataRoomsTheme | undefined) ?? 'system'}
        onThemeChange={setTheme}
        onAction={(action) => setMessage(describeAction(action))}
        onCommand={(command) => setMessage(describeCommand(command))}
      />
      <p
        aria-live="polite"
        className="shrink-0 truncate border-t border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
        role="status"
      >
        {message}
      </p>
    </div>
  );
}

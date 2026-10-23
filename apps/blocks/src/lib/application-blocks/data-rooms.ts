import type { ApplicationBlockDoc } from './types';

export const dataRoomsBlock: ApplicationBlockDoc = {
  name: 'data-rooms',
  title: 'Data Rooms',
  description:
    'Secure document rooms for an organization and its sub-organizations: access that carries down the hierarchy, folder shares that expire, agreements before entry, view-only and watermarked documents, Q&A, reading insights, and a room assistant that only cites what the reader can open.',
  previewDescription:
    'Open Project Atlas, ask why someone can see a folder, preview the room as a bidder or a share-only advisor, share a folder until a date, accept the agreement as a guest, answer a question from a drafted reply, and follow who read what in Insights.',
  previewHeight: 820,
  whenToUse: [
    'Use Data Rooms when documents must be shared with people inside and outside an organization under rules people can see and explain: deal rooms, board packs, fundraising, audits, client portals.',
    'Use the Storage Browser block for plain file management without rooms, roles, agreements, or guests.',
  ],
  usage: {
    description:
      'Pass the workspace as one data object and handle every change through onCommand. The template owns navigation, dialogs, previews, and optimistic updates; the host owns storage, delivery, authorization, and the activity log.',
    example: `'use client';

import { useRouter } from 'next/navigation';

import {
  DataRooms,
  type DataRoomsAction,
  type DataRoomsCommand,
  type DataRoomsData
} from '@/components/ui/data-rooms';

type DealRoomsProps = Readonly<{
  data: DataRoomsData;
  save: (command: DataRoomsCommand) => Promise<void>;
  download: (documentId: string) => void;
}>;

export function DealRooms({ data, save, download }: DealRoomsProps) {
  const router = useRouter();

  const handleAction = (action: DataRoomsAction) => {
    if (action.type === 'download') download(action.documentId);
    if (action.type === 'org-menu' && action.item === 'log-out') router.push('/logout');
  };

  return (
    <div className="h-dvh">
      <DataRooms
        data={data}
        onCommand={async (command) => {
          await save(command);
          router.refresh();
        }}
        onAction={handleAction}
      />
    </div>
  );
}`,
  },
  state: {
    title: 'Access, previews, and changes',
    description:
      'Access is worked out from data by the exported effectiveAccess helper: owners and admins carry down through sub-units into rooms, members only when inheritance allows and the room is not restricted, folder shares cover their subtree until they expire, read-only members lose every write, and view-only documents lose downloads. It drives which controls appear, the “Why can they?” trace, and Preview as, and your server still decides every request. Commands apply locally after onCommand resolves, and new data from the host replaces them.',
  },
  composition: [
    'Built on the workspace kit (shell, sidebar, panels, tables, canvas) and the AI kit (prompt input, chat container, suggestions), so it matches Agents Builder and Billing.',
    'Every view, tab, sheet, and dialog is exported, along with effectiveAccess, describeGrant, applyDataRoomsCommand, and answerFromScript for hosts that build their own shell or run the same rules on the server.',
    'Pass renderPreview to draw real pages in the viewer and onAskAssistant to answer from your own runtime; without them the template draws placeholder pages and answers from data.assistant.',
  ],
  accessibility: [
    'Room sections are a tab list with arrow-key navigation, and every icon-only control has a label and a tooltip.',
    'The access map is a focusable canvas: arrow keys pan, plus and minus zoom, and zero resets to 100%.',
    'Permissions are written out as labelled chips, never conveyed by colour alone, and watermarks are announced as text.',
    'Assistant answers appear instantly when reduced motion is requested.',
  ],
  api: [
    {
      name: 'data',
      type: 'DataRoomsData',
      behavior:
        'The organization and its units, people, roles, memberships, inheritance rules, rooms with their protections and agreement, documents and folders, folder shares, invites, acceptances, activity, questions, and assistant script. DATA_ROOMS_DEMO is a complete example.',
    },
    {
      name: 'onCommand',
      type: '(command: DataRoomsCommand) => Promise<void> | void',
      behavior:
        'Every change: create and update rooms, invite, change roles, share and revoke folders, upload, move, accept the agreement, ask and answer questions, edit roles and inheritance. Reject with an Error to keep the dialog open with its message.',
    },
    {
      name: 'onAction',
      type: '(action: DataRoomsAction) => void',
      behavior: 'Downloads, document views for your access log, activity export, search, contact, and organization menu items.',
    },
    {
      name: 'view / roomId / tab',
      type: "'home' | 'access-map' | 'activity' | 'room'",
      behavior: 'Each has a default and an onChange, so a router can control where the workspace is.',
    },
    {
      name: 'previewAs / defaultPreviewAs',
      type: 'string | null',
      behavior: 'Shows the workspace as another person sees it. Changes are disabled while previewing.',
    },
    {
      name: 'onAskAssistant',
      type: '(request) => Promise<AssistantAnswer>',
      behavior: 'Answers the room assistant from your runtime. Return only citations the asker may open.',
    },
    {
      name: 'renderPreview',
      type: '(document, context) => ReactNode',
      behavior: 'Draws document pages in the viewer, given the reader and whether to watermark and block downloads.',
    },
    {
      name: 'views / locale / timeZone',
      type: 'DataRoomsView[] / string',
      behavior: 'Limits the views to what your data can back, and sets date and number formatting (en-US in UTC by default).',
    },
  ],
};

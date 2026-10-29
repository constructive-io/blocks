import type { ApplicationBlockDoc } from '../application-blocks';

export const RESOURCE_KIT_DOC: ApplicationBlockDoc = {
  name: 'resource-kit',
  title: 'Resource Kit',
  description:
    'List, detail, and form screens generated from resource definitions: search, sort, and pagination over a source, a table that formats every field and links related records, a create and edit sheet with relation pickers and many-to-many links, record pages with their has-many lists, and delete confirmation.',
  previewDescription:
    'Browse a small CRM: search and sort contacts, open a company to see its contacts and deals, create a deal from a company, edit a contact’s tags, delete a record, and narrow the frame to watch columns fold into the first cell.',
  previewHeight: 780,
  whenToUse: [
    'Use Resource Kit for the data screens of an application: one list, detail, and form per table, described once and rendered the same way everywhere.',
    'Use Sheets when people need spreadsheet-style editing of arbitrary tables discovered from _meta, and a purpose-built block when a screen is a workflow rather than records.',
  ],
  usage: {
    description:
      'Describe each table with defineResource: its fields, how they read and edit, and a source with list, get, create, update, and remove (plus link and linked for many-to-many fields). Wrap the app once in ResourceKitProvider with your router, then render ResourcePage and RecordDetail on your routes.',
    example: `'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Users } from 'lucide-react';

import {
  type AnyResource,
  defineResource,
  RecordDetail,
  ResourceKitProvider,
  ResourcePage,
  type ResourceRouter,
  type ResourceSource
} from '@/components/ui/resource-kit';

type Contact = {
  id: string;
  fullName: string;
  email: string;
  companyId: string | null;
  stage: string;
};

export function contactsResource(source: ResourceSource<Contact>) {
  return defineResource<Contact>({
    name: 'contacts',
    label: 'Contacts',
    singular: 'Contact',
    icon: 'users',
    primaryKey: 'id',
    titleField: 'fullName',
    columns: ['fullName', 'companyId', 'stage', 'email'],
    formFields: ['fullName', 'email', 'companyId', 'stage'],
    searchFields: ['fullName', 'email'],
    defaultSort: { field: 'fullName', direction: 'asc' },
    fields: {
      id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
      fullName: { name: 'fullName', label: 'Name', input: 'text', required: true },
      email: { name: 'email', label: 'Email', input: 'email', required: true },
      companyId: {
        name: 'companyId',
        label: 'Company',
        input: 'relation',
        relation: { resource: 'companies' }
      },
      stage: {
        name: 'stage',
        label: 'Stage',
        input: 'select',
        options: [
          { value: 'lead', label: 'Lead', tone: 'info' },
          { value: 'customer', label: 'Customer', tone: 'success' }
        ]
      }
    },
    source
  });
}

export function AppResources({
  resources,
  children
}: {
  resources: AnyResource[];
  children: ReactNode;
}) {
  const router = useRouter();
  const resourceRouter: ResourceRouter = {
    Link,
    navigate: (href) => router.push(href),
    listHref: (resource) => \`/\${resource}\`,
    detailHref: (resource, id) => \`/\${resource}/\${id}\`
  };

  return (
    <ResourceKitProvider
      router={resourceRouter}
      resources={resources}
      icons={{ users: Users, building: Building2 }}
    >
      {children}
    </ResourceKitProvider>
  );
}

// app/contacts/page.tsx
export function ContactsPage() {
  return <ResourcePage resource="contacts" />;
}

// app/contacts/[id]/page.tsx
export function ContactPage({ id }: { id: string }) {
  return <RecordDetail resource="contacts" id={id} />;
}`,
  },
  state: {
    title: 'Sources, caching, and writes',
    description:
      'Every read goes through the resource’s source and a shared query cache: the provider reuses the host’s QueryClient when one encloses it and makes its own otherwise. Creating, editing, linking, or deleting a record invalidates that resource and every resource related to it, so lists, record pages, related lists, labels, and dashboard counts refresh together. A rejected write keeps the sheet or dialog open with the source’s message, and an error carrying fields shows those messages under the matching inputs.',
  },
  composition: [
    'Built on the workspace kit (view frames, table surfaces, panels, empty states, search fields) with the form kit’s fields, select, switch, and combobox, so generated screens match the templates beside them.',
    'Relation fields read a label from a row the source embedded (companyId reads company), or else from one cached get per related record; many-to-many fields read source.linked and write the whole set with source.link only when it changed.',
    'Columns fold away as a table narrows and their values move under the first cell, so a list stays readable in a 700-pixel pane or on a phone.',
    'DataTable, EntityFormSheet, RelationPicker, RecordDetail, DeleteDialog, ResourceNav, and createMemorySource are exported for hosts that compose their own screens or prototype before a backend exists.',
  ],
  accessibility: [
    'Record titles are links, and every row has an actions menu named for its record, so nothing depends on clicking a row.',
    'Sortable headers are buttons that announce their sort direction, and loading tables mark their body busy.',
    'Form errors are tied to their inputs with aria-describedby, the first invalid field takes focus, and rejected saves are announced as alerts.',
    'Relation pickers are comboboxes that search as you type; Escape closes the list without clearing a choice.',
  ],
  api: [
    {
      name: 'defineResource(definition)',
      type: 'ResourceDefinition<Row>',
      behavior:
        'Names a table (name, label, singular, icon, primaryKey, titleField), its list columns, form and detail fields, search fields, default sort, field definitions, and source.',
    },
    {
      name: 'ResourceSource',
      type: 'list / get / create / update / remove / link? / linked?',
      behavior:
        'The only data boundary. list receives search, sort, offset, limit, and equality filters and answers rows with a totalCount; link replaces the linked ids of one many-to-many field.',
    },
    {
      name: 'ResourceKitProvider',
      type: '{ router, resources, queryClient?, locale?, currency?, now?, icons? }',
      behavior:
        'Resolves resources and relation targets by name, owns the query cache, and maps icon names to icon components. The router supplies Link, navigate, listHref, and detailHref.',
    },
    {
      name: 'ResourcePage',
      type: '{ resource, pageSize?, filters?, readOnly? }',
      behavior: 'The list screen: header with count and create button, search, sort, table, pagination, and empty, no-match, and error states.',
    },
    {
      name: 'RecordDetail',
      type: '{ resource, id, relatedLimit?, readOnly? }',
      behavior: 'One record with its fields, a list for every resource that belongs to it, and edit and delete. Deleting navigates back to the list.',
    },
    {
      name: 'EntityFormSheet',
      type: '{ resource, record?, open, onOpenChange, onSaved?, defaultValues? }',
      behavior: 'Creates or edits a record in a sheet, validating required and typed fields and sending only changed fields on edit.',
    },
    {
      name: 'DataTable / RelationPicker / DeleteDialog',
      type: 'Components',
      behavior: 'The table, the async relation search (single or many), and the delete confirmation, for screens the host composes itself.',
    },
  ],
};

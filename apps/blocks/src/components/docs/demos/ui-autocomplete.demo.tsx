'use client';

import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
} from '@constructive-io/ui/autocomplete';

import { Demo } from '@/components/docs/showcase-kit';

type Table = { value: string; label: string };

const TABLES: Table[] = [
  { value: 'users', label: 'users' },
  { value: 'organizations', label: 'organizations' },
  { value: 'org_memberships', label: 'org_memberships' },
  { value: 'databases', label: 'databases' },
  { value: 'sessions', label: 'sessions' },
  { value: 'api_keys', label: 'api_keys' },
  { value: 'invitations', label: 'invitations' },
];

export function BlockDemo() {
  return (
    <Demo>
      <div className="w-full max-w-md">
        <Autocomplete items={TABLES}>
          <AutocompleteInput placeholder="Search tables..." showClear />
          <AutocompletePopup>
            <AutocompleteEmpty>No tables found.</AutocompleteEmpty>
            <AutocompleteList>
              {(item: Table) => (
                <AutocompleteItem key={item.value} value={item}>
                  {item.label}
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompletePopup>
        </Autocomplete>
      </div>
    </Demo>
  );
}

/**
 * ui-content — Pickers & input family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'autocomplete': {
    tier: 'showcase',
    intro: `An input that suggests matching options as you type, filtering a list against the current query.`,
    usage: `import {
  Autocomplete,
  AutocompleteInput,
  AutocompletePopup,
  AutocompleteList,
  AutocompleteItem,
  AutocompleteEmpty,
} from '@constructive-io/ui/autocomplete';

const tables = [
  { value: 'users', label: 'users' },
  { value: 'orders', label: 'orders' },
];

export function Example() {
  return (
    <Autocomplete items={tables}>
      <AutocompleteInput placeholder="Search tables..." />
      <AutocompletePopup>
        <AutocompleteEmpty>No tables found.</AutocompleteEmpty>
        <AutocompleteList>
          {(item) => (
            <AutocompleteItem key={item.value} value={item}>
              {item.label}
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompletePopup>
    </Autocomplete>
  );
}`,
    props: [
      { name: 'items', type: `T[]`, default: `—`, description: 'The collection the list filters and renders from.' },
      { name: 'value', type: `string`, default: `—`, description: 'Controlled text value of the input; pair with onValueChange.' },
      { name: 'onValueChange', type: `(value: string) => void`, default: `—`, description: 'Fires as the typed query changes.' },
    ],
    parts: [
      { name: 'AutocompleteInput', description: 'The text field. Accepts size plus showTrigger and showClear to add a chevron or clear button.' },
      { name: 'AutocompletePopup', description: 'The floating surface that anchors to the input and holds the results.' },
      { name: 'AutocompleteList', description: 'Renders one AutocompleteItem per filtered entry via a render function.' },
      { name: 'AutocompleteItem', description: 'A single selectable suggestion.' },
      { name: 'AutocompleteEmpty', description: 'Shown when the query matches nothing.' },
      { name: 'AutocompleteGroup / AutocompleteGroupLabel', description: 'Group related suggestions under a heading.' },
      { name: 'AutocompleteSeparator', description: 'A divider between groups.' },
    ],
  },
  'combobox': {
    tier: 'showcase',
    intro: `A select you can type to filter, combining a text input with a popup list of choices.`,
    usage: `import {
  Combobox,
  ComboboxInput,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@constructive-io/ui/combobox';

const regions = [
  { value: 'us-east-1', label: 'US East' },
  { value: 'eu-west-1', label: 'EU West' },
];

export function Example() {
  return (
    <Combobox items={regions}>
      <ComboboxInput placeholder="Select a region..." />
      <ComboboxPopup>
        <ComboboxEmpty>No region found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}`,
    props: [
      { name: 'items', type: `T[]`, default: `—`, description: 'The choices to filter and render.' },
      { name: 'multiple', type: `boolean`, default: `false`, description: 'Switch to multi-select; selections render as removable chips inside ComboboxChips.' },
      { name: 'value', type: `T | T[] | null`, default: `—`, description: 'Controlled selection; pair with onValueChange.' },
      { name: 'onValueChange', type: `(value) => void`, default: `—`, description: 'Fires when the selection changes.' },
    ],
    parts: [
      { name: 'ComboboxInput', description: 'The text field. showTrigger (on by default) adds the open chevron; showClear adds a clear button; startAddon slots an icon.' },
      { name: 'ComboboxPopup', description: 'The floating results surface anchored to the input.' },
      { name: 'ComboboxList / ComboboxItem', description: 'Render and select entries; a checkmark marks the chosen item.' },
      { name: 'ComboboxEmpty', description: 'Shown when nothing matches the query.' },
      { name: 'ComboboxGroup / ComboboxGroupLabel', description: 'Group entries under a heading; ComboboxCollection maps a group\'s items.' },
      { name: 'ComboboxChips / ComboboxChip', description: 'In multiple mode, the chip rail that holds the current selections.' },
    ],
  },
  'multi-select': {
    tier: 'showcase',
    intro: `One control for choosing several values at once, with searchable options and selections shown as removable badges.`,
    usage: `import { MultiSelect } from '@constructive-io/ui/multi-select';

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

export function Example() {
  return (
    <MultiSelect
      options={roles}
      defaultValue={['editor']}
      onValueChange={(values) => console.log(values)}
      placeholder="Assign roles"
    />
  );
}`,
    props: [
      { name: 'options', type: `MultiSelectOption[] | MultiSelectGroup[]`, default: `—`, description: 'Flat options or grouped sections; each option has a label and value.' },
      { name: 'onValueChange', type: `(value: string[]) => void`, default: `—`, description: 'Fires with the full array of selected values on every change.' },
      { name: 'defaultValue', type: `string[]`, default: `[]`, description: 'Values selected when the component first mounts.' },
      { name: 'maxCount', type: `number`, default: `3`, description: 'How many badges to show before collapsing the rest into a "+N" summary.' },
      { name: 'searchable', type: `boolean`, default: `true`, description: 'Show the search input inside the popover.' },
      { name: 'placeholder', type: `string`, default: `'Select options'`, description: 'Text shown when nothing is selected.' },
    ],
  },
  'tags': {
    tier: 'showcase',
    intro: `A tag editor: a trigger that lists the current tags and a searchable popover for adding or removing them.`,
    usage: `import {
  Tags,
  TagsTrigger,
  TagsValue,
  TagsContent,
  TagsInput,
  TagsList,
  TagsEmpty,
  TagsGroup,
  TagsItem,
} from '@constructive-io/ui/tags';

export function Example() {
  return (
    <Tags>
      <TagsTrigger>
        <TagsValue>billing</TagsValue>
      </TagsTrigger>
      <TagsContent>
        <TagsInput placeholder="Search tags..." />
        <TagsList>
          <TagsEmpty />
          <TagsGroup>
            <TagsItem value="billing">billing</TagsItem>
            <TagsItem value="urgent">urgent</TagsItem>
          </TagsGroup>
        </TagsList>
      </TagsContent>
    </Tags>
  );
}`,
    parts: [
      { name: 'TagsTrigger', description: 'The button that opens the popover and wraps the current TagsValue badges.' },
      { name: 'TagsValue', description: 'A single selected tag, rendered as a badge; pass onRemove to show its remove affordance.' },
      { name: 'TagsContent', description: 'The popover panel; it hosts a command palette sized to the trigger.' },
      { name: 'TagsInput', description: 'The search field that filters the option list.' },
      { name: 'TagsList / TagsItem', description: 'The scrollable list and its selectable rows.' },
      { name: 'TagsEmpty', description: 'Shown when the search matches no tags ("No tags found." by default).' },
      { name: 'TagsGroup', description: 'Groups related tags under one section.' },
    ],
  },
  'record-picker': {
    tier: 'lean',
    intro: `A searchable, scrollable list for linking records to the one you are editing — for example attaching related rows across a relationship. It separates the records you can still link from those already linked, and filters as you type. It is lean here because its fuzzy-search engine pulls in heavier dependencies than the inline previews bundle.`,
    usage: `import { RecordPicker } from '@constructive-io/ui/record-picker';

export function Example({ rows, linkedIds, onLink, linking }) {
  return (
    <RecordPicker
      records={rows}
      linkedRecordIds={linkedIds}
      isLinking={linking}
      onLink={(record) => onLink(record)}
      getRecordId={(r) => r.id}
      getRecordLabel={(r) => r.name}
      searchFields={['name']}
      placeholder="Search records..."
    />
  );
}`,
    props: [
      { name: 'records', type: `T[]`, default: `—`, description: 'The candidate records to search and list.' },
      { name: 'linkedRecordIds', type: `Set<string>`, default: `—`, description: 'IDs already linked; these render in a separate "Already Linked" section.' },
      { name: 'onLink', type: `(record: T) => void`, default: `—`, description: 'Called when the user links a record.' },
      { name: 'isLinking', type: `boolean`, default: `—`, description: 'Shows a spinner and disables rows while a link is in flight.' },
      { name: 'getRecordId', type: `(record: T) => string`, default: `—`, description: 'Derives a stable id for each record.' },
      { name: 'getRecordLabel', type: `(record: T) => string`, default: `—`, description: 'Derives the label to display for each record.' },
      { name: 'searchFields', type: `string[]`, default: `['name','title','label']`, description: 'Which fields the fuzzy search ranks against.' },
    ],
  },
  'calendar-rac': {
    tier: 'lean',
    intro: `A date and date-range calendar built on React Aria, with full keyboard navigation, locale awareness, and a today marker. Reach for it inside date-picker popovers or anywhere a user picks a single day or a span of days. It is lean here because React Aria Components is heavier than the inline previews bundle carries.`,
    usage: `import { Calendar, RangeCalendar } from '@constructive-io/ui/calendar-rac';

export function Example() {
  return (
    <div className="flex gap-8">
      <Calendar aria-label="Date" />
      <RangeCalendar aria-label="Date range" />
    </div>
  );
}`,
    parts: [
      { name: 'Calendar', description: 'Single-date calendar. Accepts the React Aria Calendar props (value, onChange, minValue, and so on).' },
      { name: 'RangeCalendar', description: 'Start-to-end range calendar with the same prop surface as the React Aria RangeCalendar.' },
    ],
  },
  'json-input': {
    tier: 'lean',
    intro: `A code editor tuned for JSON, with syntax highlighting, live validity feedback, and a one-click format button. Reach for it when a user edits raw JSON — settings blobs, request bodies, seed data — and you want guardrails without a full form. It is lean here because the underlying Ace editor is far too large for the inline previews bundle.`,
    usage: `import { JsonInput } from '@constructive-io/ui/json-input';
import { useState } from 'react';

export function Example() {
  const [value, setValue] = useState('{\\n  "enabled": true\\n}');
  return <JsonInput value={value} setValue={setValue} theme="dark" />;
}`,
    props: [
      { name: 'value', type: `string`, default: `''`, description: 'The current JSON text (controlled).' },
      { name: 'setValue', type: `(value: string) => void`, default: `—`, description: 'Called on every edit and when the format button rewrites the text.' },
      { name: 'minLines', type: `number`, default: `16`, description: 'Minimum editor height in lines; it grows with content.' },
      { name: 'theme', type: `'light' | 'dark'`, default: `'light'`, description: 'Editor color theme.' },
    ],
  },
};

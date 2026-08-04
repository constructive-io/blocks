# Surface selection and ownership

Use this reference before choosing an application block, source package,
feature pack, Console module, or preset. Always confirm the suggested root with
live `shadcn@latest search` and `view`.

## Select the smallest useful root

| Need | Search or inspect | Ownership boundary |
| --- | --- | --- |
| Button, form, overlay, navigation, or layout | A primitive name, `form-kit`, `overlay-kit`, `layout-kit`, `app-shell` | Installed source owns presentation; the host owns application behavior. |
| AI chat or agent traces | `ai` | Presentational only. The host owns the model runtime, streaming reducer, tools, IPC, and persistence. |
| Searchable application commands | `command-palette` | The npm package owns the headless engine; installed source owns the dialog and task presentation; the host owns routing and actions. |
| Arbitrary application-table CRUD | `sheets` | Installed source owns the grid; the data runtime interprets current `_meta`; the host owns endpoint and session discovery. |
| Database schema editing | `schema-builder` | Installed source owns the workspace; a host adapter performs control-plane operations and confirmation workflows. |
| Reporting relationships | `org-chart` | The controlled block owns hierarchy presentation; the host loads and persists reporting lines. |
| Object storage management | `storage-browser` or a storage leaf | Blocks are controlled and transport-neutral; the host filters, authorizes, fetches, uploads, and mutates objects. |
| Customer billing | `billing-settings-page` or a billing leaf | Blocks render provider-neutral resources and callbacks; the host owns billing providers, mutations, routing, and account policy. |
| One provider-neutral domain screen | `feature-pack-<id>` | The host supplies resources, policy, callbacks, and navigation. No Console Kit is required. |
| One domain inside Console Kit | `console-module-<id>` with `console-kit-core` | The module adds Console discovery and Constructive integration for its feature pack. |
| A reviewed multi-module Console | Search `preset` | Inspect the current preset before installing; do not infer its module set from memory. |
| A full Next.js tenant console | `console-kit-nextjs` | The installed umbrella composes the current Console modules; the host still owns provisioning and secure tenant descriptors. |

Feature-pack ids currently include data, authentication, users, organizations,
storage, billing, and notifications. Treat the registry as authoritative for
the exact current item names and preset composition.

## Keep package and installed-source imports separate

Resolve all source targets from `shadcn view` and the consumer aliases. Common
default targets illustrate the boundary but are not a substitute for project
inspection:

```tsx
import { Message, PromptInput } from '@/components/ui/ai';
import { Sheets, SheetsProvider } from '@/components/ui/sheets';
import { SchemaBuilder } from '@/components/schema-builder';
import { OrgChart } from '@/components/ui/org-chart';
import { StorageBrowser } from '@/components/ui/storage';
```

Command Palette deliberately spans both distributions:

```tsx
import {
  createCommandRegistry,
  kbd,
  useBackgroundTasks
} from '@constructive-io/command-palette';

import { CommandPalette } from '@/blocks/command-palette/command-palette';
import { BackgroundTaskStack } from '@/blocks/command-palette/background/background-task-stack';
```

Do not import `CommandPalette` or `BackgroundTaskStack` from the headless npm
package. Do not add the packaged Sheets or Schema Builder presentation surface
when the registry item already installed editable source.

## Prefer live item docs over copied API catalogs

The registry's `view` response carries current usage docs and the complete file
and dependency closure. The public documentation provides richer examples:

- AI: `https://constructive-io.github.io/blocks/blocks/ai/`
- Command Palette: `https://constructive-io.github.io/blocks/blocks/command-palette/`
- Sheets: `https://constructive-io.github.io/blocks/blocks/sheets/`
- Schema Builder: `https://constructive-io.github.io/blocks/blocks/schema-builder/`
- Org Chart: `https://constructive-io.github.io/blocks/blocks/org-chart/`
- Storage Browser: `https://constructive-io.github.io/blocks/blocks/storage-browser/`
- Billing: `https://constructive-io.github.io/blocks/blocks/billing/`
- Feature packs: `https://constructive-io.github.io/blocks/blocks/features/`
- Console Kit: `https://constructive-io.github.io/blocks/blocks/console-kit/`

Load only the documentation for the selected surface. Do not copy its entire
API into application instructions when `view` can provide the current contract.

import { AI_DOC } from '@/lib/ai-docs';
import { APPLICATION_BLOCKS } from '@/lib/application-blocks';
import { COMMAND_PALETTE_DOC } from '@/lib/command-palette-docs';
import { SOURCE_BLOCKS } from '@/lib/source-blocks';

export const dynamic = 'force-static';

const PUBLIC_ROOT = 'https://constructive-io.github.io/blocks';

type SurfaceLink = Readonly<{
  description: string;
  path: string;
  title: string;
}>;

const surfaceLinks: readonly SurfaceLink[] = [
  {
    title: AI_DOC.title,
    path: '/blocks/ai/',
    description: AI_DOC.description,
  },
  {
    title: COMMAND_PALETTE_DOC.title,
    path: '/blocks/command-palette/',
    description: COMMAND_PALETTE_DOC.description,
  },
  ...SOURCE_BLOCKS.map(({ description, name, title }) => ({
    title,
    path: `/blocks/${name}/`,
    description,
  })),
  ...APPLICATION_BLOCKS.map(({ description, name, title }) => ({
    title,
    path: `/blocks/${name}/`,
    description,
  })),
  {
    title: 'Billing',
    path: '/blocks/billing/',
    description:
      'Provider-neutral customer billing blocks for plans, subscriptions, usage, credits, entitlements, history, and activity.',
  },
  {
    title: 'Feature packs',
    path: '/blocks/features/',
    description:
      'Provider-neutral domain screens plus Console Kit modules for data, authentication, users, organizations, storage, billing, and notifications.',
  },
  {
    title: 'Console Kit',
    path: '/blocks/console-kit/',
    description:
      'Composable tenant-console roots, modules, presets, endpoint contracts, and integration diagnostics.',
  },
  {
    title: 'Primitives and bundles',
    path: '/blocks/',
    description:
      'Constructive UI primitives, application shell, theme, form, overlay, and layout source installs.',
  },
];

export function buildLlmsText(): string {
  const surfaces = surfaceLinks
    .map(
      ({ description, path, title }) =>
        `- [${title}](${PUBLIC_ROOT}${path}): ${description}`,
    )
    .join('\n');

  return `# Constructive Blocks

> Editable React source from the @constructive shadcn registry plus packaged @constructive-io APIs for application UI, data workflows, and tenant consoles.

Use live registry metadata as the source of truth. Do not rely on a Blocks commit, branch, fixed package version, or copied catalog snapshot.

## Agent Skill

Install the canonical skill from the latest default branch:

\`\`\`bash
npx skills add constructive-io/blocks
\`\`\`

- [Skill source](https://github.com/constructive-io/blocks/tree/main/.agents/skills/constructive-blocks)
- [Agent Skills specification](https://agentskills.io/specification)

## Live registry workflow

- [Registry index](${PUBLIC_ROOT}/r/registry.json)
- Item URL template: \`${PUBLIC_ROOT}/r/{name}.json\`

\`\`\`bash
pnpm dlx shadcn@latest info --json
pnpm dlx shadcn@latest search @constructive -q "describe the workflow"
pnpm dlx shadcn@latest view @constructive/item-name
pnpm dlx shadcn@latest add @constructive/item-name --dry-run
pnpm dlx shadcn@latest add @constructive/item-name
\`\`\`

Configure the namespace in \`components.json\`:

\`\`\`json
{
  "registries": {
    "@constructive": "${PUBLIC_ROOT}/r/{name}.json"
  }
}
\`\`\`

The official shadcn MCP can use the same namespace. Initialize it with
\`shadcn@latest mcp init --client <client>\`, or use the CLI directly.

## Documentation surfaces

${surfaces}

## Package APIs

- \`@constructive-io/ui\`: packaged UI primitives and theme exports.
- \`@constructive-io/data\`: current metadata normalization and GraphQL operation generation.
- \`@constructive-io/sheets\`: packaged Sheets API.
- \`@constructive-io/command-palette\`: headless command registry, execution, workflows, and background tasks.
- \`@constructive-io/schema-builder\`: packaged Schema Builder API.

Registry and npm distributions are independent. Inspect each live registry item before deciding whether editable source, a packaged API, or a package-backed source block owns the requested workflow.

## Security and host ownership

Blocks accept explicit endpoints, sessions, adapters, resources, and callbacks. The host owns credentials, model runtimes, GraphQL clients, generated SDKs, routing, persistence, authorization decisions, and destructive confirmations. Registry metadata, schema metadata, introspection, and hidden controls do not grant authority; PostgreSQL privileges and RLS remain authoritative.
`;
}

export function GET() {
  return new Response(buildLlmsText(), {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

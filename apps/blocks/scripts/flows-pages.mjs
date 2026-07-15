// flows-pages — the flows generators' contribution to the generated data module.
//
// `buildFlowDocPages()` turns each flow in flows-content.mjs into a reference
// `DocPageData` (slug `flows/<group>/<id>`) that generate-manifest.mjs folds into
// `src/lib/docs/registry-data.ts` alongside the block + ui pages. This is the
// "shared aggregator" seam: one generator (generate-manifest) writes the file;
// the flow pages it appends come from here, fed by flows-content.mjs.
//
// The preset / module / install helpers below MIRROR generate-flows.mjs (which
// owns flows.json + the downstream skill/harness artifacts). Both derive from
// flows-content.mjs + node-type-registry, so their outputs can never drift; they
// are kept separate so the registry-data build never couples to the validated
// flows.json emitter. Like generate-flows.mjs, this NEVER serializes internal
// `knownBackendLimitations` — only public author-facing copy ships to the docs.
//
// Plain node (no TS): mirrors flows-content.mjs / showcase-content.mjs.

import { createRequire } from 'node:module';

import { FLOWS } from './flows-content.mjs';

const require = createRequire(import.meta.url);
const { getModulePreset } = require('node-type-registry');

// Sidebar group order/labels — mirror generate-flows.mjs + src/flows/types.
const GROUP_ORDER = ['authentication', 'account-session', 'authorization'];

// Public per-status label shown on the page (statusLabel in the data contract).
const STATUS_LABEL = { ga: 'GA', limited: 'Limited', blocked: 'Preview' };

// Short, top-of-page status sentence for non-GA flows. Generic by design — the
// internal reason (PLATFORM-GAPS) never ships on the public docs site.
const STATUS_NOTE = {
  limited: 'Status: Limited — usable today; honor the constraints listed on this page.',
  blocked:
    'Status: Preview — some backend operations for this flow are not yet available end-to-end. The blocks install and render, but parts of the flow cannot complete yet.',
};

const INSTALL_NAMESPACE = '@constructive';

/** Display string for a native module entry. tuple -> "name:<scopeOrFirstOptValue>". */
function displayModule(entry) {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) {
    const [name, opts] = entry;
    if (opts && typeof opts === 'object') {
      if (typeof opts.scope === 'string') return `${name}:${opts.scope}`;
      const keys = Object.keys(opts).sort();
      if (keys.length) return `${name}:${keys.map((k) => `${k}=${String(opts[k])}`).join(',')}`;
    }
    return name;
  }
  throw new Error(`[flows-pages] unrecognized module entry shape: ${JSON.stringify(entry)}`);
}

/** Native (provisioning-ready) form of a preset module entry. */
function nativeModule(entry) {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) {
    const [name, opts] = entry;
    if (opts && typeof opts === 'object' && Object.keys(opts).length) return [name, opts];
    return name;
  }
  throw new Error(`[flows-pages] unrecognized module entry shape: ${JSON.stringify(entry)}`);
}

// Resolve each distinct preset once (package-local node-type-registry).
const presetModules = new Map();
function modulesFor(preset) {
  if (!presetModules.has(preset)) {
    const resolved = getModulePreset?.(preset);
    if (!resolved || !Array.isArray(resolved.modules) || resolved.modules.length === 0) {
      throw new Error(`[flows-pages] node-type-registry has no preset '${preset}'`);
    }
    presetModules.set(preset, resolved.modules.map(nativeModule));
  }
  return presetModules.get(preset);
}

/** Install id for a flow block slug — slugs are slash-free registry names. */
function installName(slug) {
  return `${INSTALL_NAMESPACE}/${slug}`;
}

/** Strip MD inline-code backticks for plain-text prose (intros render as <p>). */
function stripInlineCode(s) {
  return String(s).replace(/`([^`]+)`/g, '$1');
}

/** Public author-facing constraints only — never internal limitations. */
function publicConstraints(contract) {
  if (!contract || typeof contract !== 'object') return [];
  return (contract.constraints ?? []).filter((c) => typeof c === 'string' && c.trim());
}

/**
 * Markdown reference block rendered (via <Markdown>) below the how-to: the
 * resolved backend module list + exposed ops, public constraints, and links to
 * related flows. Returns undefined when there is nothing reference-worthy.
 */
function buildFlowSpec(flow) {
  const modules = modulesFor(flow.backend.preset);
  const constraints = publicConstraints(flow.contract);
  const related = (flow.relatedFlows ?? []).map((id) => FLOWS.find((f) => f.id === id)).filter(Boolean);

  const lines = [
    '## Backend',
    '',
    `Provision the \`${flow.backend.preset}\` preset — it installs these database modules ` +
      '(scoped modules shown as `name:scope`):',
    '',
    ...modules.map((m) => `- \`${displayModule(m)}\``),
    '',
    `**GraphQL operations this flow makes live:** ${flow.backend.exposedOps.map((o) => `\`${o}\``).join(', ')}`,
    '',
  ];
  if (constraints.length) {
    lines.push('## Contract', '', 'Constraints an author must honor:', '');
    for (const c of constraints) lines.push(`- ${c}`);
    lines.push('');
  }
  if (related.length) {
    lines.push('## Related flows', '');
    for (const r of related) lines.push(`- [${r.name}](/blocks/flows/${r.group}/${r.id})`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Every flow as a DocPageData, in sidebar order (group, then authored order).
 * Sections are the copy-paste how-to: provision → install → wire → usage. The
 * install command is DERIVED from `flow.blocks` (each `@constructive/<slug>`),
 * never trusting the hand-authored literal, so the namespace can't drift.
 */
export function buildFlowDocPages() {
  const pages = [];
  for (const group of GROUP_ORDER) {
    for (const flow of FLOWS.filter((f) => f.group === group)) {
      const installCmd = `npx shadcn@latest add ${flow.blocks.map(installName).join(' ')}`;
      const statusNote = flow.status === 'ga' ? '' : `${STATUS_NOTE[flow.status]} `;
      pages.push({
        slug: `flows/${group}/${flow.id}`,
        title: flow.name,
        description: stripInlineCode(flow.summary),
        kind: 'flow',
        category: 'flows',
        status: flow.status,
        statusLabel: STATUS_LABEL[flow.status],
        usageCode: flow.howto.usage,
        usageCodeLang: 'tsx',
        sections: [
          {
            id: 'provision-the-backend',
            title: 'Provision the backend',
            intro:
              `${statusNote}Provision the ${flow.backend.preset} preset onto your database — ` +
              'it installs the database modules this flow needs (listed under Backend below).',
            code: flow.howto.provision,
            codeLang: 'bash',
          },
          {
            id: 'install-the-blocks',
            title: 'Install the blocks',
            intro:
              'Requires the one-time host setup — the @constructive registry namespace mapped in your components.json.',
            code: installCmd,
            codeLang: 'bash',
          },
          {
            id: 'wire-them-up',
            title: 'Wire them up',
            intro: 'Mount the runtime once at the app root so every block resolves its hook.',
            code: flow.howto.wire,
            codeLang: 'tsx',
          },
          {
            id: 'usage',
            title: 'Usage',
            intro: 'A representative usage of this flow.',
            code: flow.howto.usage,
            codeLang: 'tsx',
          },
        ],
        builtWith: [...flow.blocks],
        spec: buildFlowSpec(flow),
      });
    }
  }
  return pages;
}

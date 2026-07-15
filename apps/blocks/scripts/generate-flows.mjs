// generate-flows — single manifest -> resolved artifacts, drift-proof by construction.
//
// Reads scripts/flows-content.mjs (the SoT) + registry.json + the node-type-
// registry module presets, then emits:
//   1. IN-REPO SoT  src/flows/flows.json (resolved, provisioning-ready native
//      modules[] — strings + ["name",{scope}] tuples). nav.ts reads it; the drift
//      guard (`pnpm check:flows`) validates it.
//   2. DOWNSTREAM COMMITTED ARTIFACTS  references/flows.json (BYTE-IDENTICAL to
//      the in-repo copy) + references/flow-catalog.md (DO-NOT-EDIT) into the
//      constructive-blocks skill (FLOWS_OUT_SKILL) and the agentic-flow harness
//      (FLOWS_OUT_HARNESS).
//
// The DOCS flow PAGES (slug `flows/<group>/<id>`) are no longer emitted here as
// MDX — they are built by scripts/flows-pages.mjs (`buildFlowDocPages`) and folded
// into src/lib/docs/registry-data.ts by generate-manifest.mjs. This script owns
// only the resolved data + downstream artifacts; the page shape lives next to the
// other generated pages.
//
// HARD-FAIL (throws -> fails `next build` in prebuild = the build gate) if any
// block slug is missing from registry.json, a status is invalid, or any preset
// is unknown / fails to resolve.
//
// Deterministic output (stable key order; committed JSON carries generatedAt:null
// so it never churns).

import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLOWS } from './flows-content.mjs';

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, '..');
const outputAppDir = process.env.BLOCKS_GEN_OUT ? path.resolve(process.env.BLOCKS_GEN_OUT) : appDir;

function fail(msg) {
  throw new Error(`[gen:flows] ${msg}`);
}

// ---------------------------------------------------------------------------
// 1. Load registry + validate every block slug exists.
// ---------------------------------------------------------------------------
const registryPath = path.join(appDir, 'registry.json');
if (!fs.existsSync(registryPath)) fail(`registry.json not found at ${registryPath}`);
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const registrySlugs = new Set((registry.items ?? []).map((i) => i.name));

// ---------------------------------------------------------------------------
// 2. Resolve preset -> modules.
//
// The machine artifact (flows.json `backend.modules`) carries the preset's
// NATIVE entry form — plain strings + `['name', { scope }]` tuples, exactly
// `getModulePreset(name).modules`. That form is PROVISIONING-READY: it is
// passed verbatim to `databaseProvisionModule.create({ data: { modules } })`,
// whose proc (`metaschema_generators.provision_database_modules`) matches
// scoped modules by jsonb containment `@> [{"name":..,"options":{"scope":..}}]`.
// The colon string `name:scope` is NOT a recognized entry — the proc treats it
// as a bare module name and throws `NOT_FOUND (<name>)`. So we must NOT colon-
// normalize the machine list. (See harness gotchas.md PROVISION-001.)
//
// Human-readable DISPLAY (`name:scope`, used only in flow-catalog.md and the
// referential check) is derived via `displayModule`.
//
// Resolution is package-local: apps/blocks pins node-type-registry and never
// discovers a sibling constructive repository.
// ---------------------------------------------------------------------------
const { getModulePreset } = require('node-type-registry');

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
  fail(`unrecognized module entry shape: ${JSON.stringify(entry)}`);
}

function nativeModule(entry) {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) {
    const [name, opts] = entry;
    if (opts && typeof opts === 'object' && Object.keys(opts).length) return [name, opts];
    return name;
  }
  fail(`unrecognized module entry shape: ${JSON.stringify(entry)}`);
}

function resolvePreset(presetName) {
  const preset = getModulePreset?.(presetName);
  if (!preset || !Array.isArray(preset.modules)) fail(`node-type-registry has no preset '${presetName}'`);
  return preset.modules.map(nativeModule);
}
// Resolve once per distinct preset.
const presetModules = new Map();
for (const flow of FLOWS) {
  const preset = flow.backend?.preset;
  if (!preset) fail(`flow '${flow.id}' has no backend.preset`);
  if (!presetModules.has(preset)) {
    const modules = resolvePreset(preset);
    if (!modules || modules.length === 0) fail(`preset '${preset}' resolved to zero modules (unknown preset?)`);
    presetModules.set(preset, modules);
  }
}

// ---------------------------------------------------------------------------
// 3. Validate status, limitations, block slugs, and auth:email sanity.
// ---------------------------------------------------------------------------
const REQUIRED_AUTH_EMAIL = [
  'users_module',
  'sessions_module',
  'user_credentials_module',
  'emails_module',
  'rls_module',
  'user_auth_module'
];

{
  const ae = presetModules.get('auth:email');
  if (ae) {
    const aeDisplay = ae.map(displayModule);
    const missing = REQUIRED_AUTH_EMAIL.filter((m) => !aeDisplay.includes(m));
    if (missing.length) {
      fail(
        `auth:email resolved to ${ae.length} modules but is missing expected core modules [${missing.join(', ')}]. ` +
          `Resolved set: [${aeDisplay.join(', ')}]. Preset resolution is wrong — refusing to emit.`
      );
    }
    if (ae.length < 12 || ae.length > 14) {
      fail(`auth:email resolved to ${ae.length} modules; expected ~13. Resolved: [${aeDisplay.join(', ')}].`);
    }
  } else {
    fail('auth:email preset was never resolved — at least one flow must anchor to it for validation.');
  }
}

const flowIds = new Set(FLOWS.map((f) => f.id));
const validStatuses = new Set(['ga', 'limited', 'blocked']);
for (const flow of FLOWS) {
  if (!validStatuses.has(flow.status)) fail(`flow '${flow.id}' has invalid status '${flow.status}'.`);
  if (flow.status !== 'ga' && !(flow.contract?.knownBackendLimitations?.length > 0)) {
    fail(`flow '${flow.id}' is '${flow.status}' but has no knownBackendLimitations.`);
  }
  if (!Array.isArray(flow.blocks) || flow.blocks.length === 0) fail(`flow '${flow.id}' has no blocks.`);
  for (const slug of flow.blocks) {
    if (!registrySlugs.has(slug)) fail(`flow '${flow.id}' references block slug '${slug}' not in registry.json.`);
  }
  for (const rel of flow.relatedFlows ?? []) {
    if (!flowIds.has(rel)) fail(`flow '${flow.id}' relatedFlows references unknown flow id '${rel}'.`);
  }
}

// ---------------------------------------------------------------------------
// 3b. DERIVE the install command from flow.blocks[] — drift-proof by construction.
//
// The install line MUST be `@constructive/<name>`-prefixed: a BARE block name
// (`npx shadcn@latest add auth-sign-in-card`) resolves against shadcn's DEFAULT
// registry and 404s. We compute the install string from flow.blocks (already
// validated ⊆ registry.json above) rather than trusting the hand-authored
// flows-content `howto.install` literals, so the namespace can never drift out
// of sync with the blocks list. Every slug is an exact registry item name with
// no '/', so its install id is unconditionally `@constructive/<slug>` (mirrors
// the manifest generator's registryName for slash-free names).
//
// We also prepend a one-line preamble pointing at the register-the-registry
// step, since `@constructive/*` only resolves once `@constructive` is registered
// against a served registry (the published URL is still pending).
// ---------------------------------------------------------------------------
const INSTALL_NAMESPACE = '@constructive';
const INSTALL_PREAMBLE =
  '# first register @constructive against your served registry — see blocks-onramp §4c / run scripts/serve-registry.sh';

/** Install id for a flow block slug: `@constructive/<slug>` (slugs are slash-free registry names). */
function installName(slug) {
  return `${INSTALL_NAMESPACE}/${slug}`;
}

/** Derived install snippet for a flow: preamble + a namespaced `shadcn add` line. */
function buildInstall(flow) {
  return `${INSTALL_PREAMBLE}\nnpx shadcn@latest add ${flow.blocks.map(installName).join(' ')}`;
}

// ---------------------------------------------------------------------------
// 4. Resolved view: each flow + its native modules[] (strings + ["name",{scope}]
//    tuples — provisioning-ready). This is what downstream consumers commit and
//    the sotHash is computed over. howto.install is REPLACED with the derived,
//    namespaced command so every surface (catalog, flows.json) is identical.
// ---------------------------------------------------------------------------
const GROUP_ORDER = ['authentication', 'account-session', 'authorization'];
const GROUP_LABEL = {
  authentication: 'Authentication',
  'account-session': 'Account & session',
  authorization: 'Authorization'
};

// Only author-facing constraints are public. Backend limitation details remain
// in flows-content.mjs for internal validation and are never serialized.
function resolvePublicContract(contract) {
  if (!contract || typeof contract !== 'object') return undefined;
  const out = {};
  const constraints = (contract.constraints ?? []).filter((s) => typeof s === 'string' && s.trim());
  if (constraints.length) out.constraints = constraints;
  return Object.keys(out).length ? out : undefined;
}

const resolvedFlows = FLOWS.map((flow) => {
  const contract = resolvePublicContract(flow.contract);
  return {
    id: flow.id,
    name: flow.name,
    group: flow.group,
    status: flow.status,
    summary: flow.summary,
    backend: {
      preset: flow.backend.preset,
      modules: presetModules.get(flow.backend.preset),
      exposedOps: flow.backend.exposedOps ?? []
    },
    blocks: flow.blocks,
    howto: { ...flow.howto, install: buildInstall(flow) },
    ...(contract ? { contract } : {}),
    relatedFlows: flow.relatedFlows ?? []
  };
});

// ---------------------------------------------------------------------------
// 5. sotHash — sha256 of CANONICAL JSON of { flows: resolvedFlows }.
//
// CANONICALIZATION ALGORITHM (replicated EXACTLY in check-flows.mjs):
//   canonical(value):
//     - arrays  -> "[" + canonical(item) joined by "," + "]"  (ORDER PRESERVED;
//                  module lists keep preset declaration order, flows keep
//                  authored order — do NOT sort arrays).
//     - objects -> "{" + for each key in Object.keys(obj).sort():
//                    JSON.stringify(key) + ":" + canonical(obj[key])
//                  joined by "," + "}"   (KEYS SORTED).
//     - else    -> JSON.stringify(value).
//   No whitespace. sotHash = sha256_hex(canonical({ flows: resolvedFlows })).
// The envelope ({ generatedAt, source, sotHash }) is NOT part of the hash.
// ---------------------------------------------------------------------------
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const sotHash = crypto.createHash('sha256').update(canonicalize({ flows: resolvedFlows })).digest('hex');

// ---------------------------------------------------------------------------
// 6. Emit in-repo SoT + downstream committed artifacts (skill + harness).
//    Envelope: { generatedAt: null, source, sotHash }. generatedAt is null on
//    purpose so the committed bytes never churn run-to-run.
// ---------------------------------------------------------------------------
const presentGroups = GROUP_ORDER.filter((g) => FLOWS.some((f) => f.group === g));

const flowsJsonPayload = {
  generatedAt: null,
  source: 'apps/blocks/scripts/flows-content.mjs',
  sotHash,
  groups: GROUP_ORDER.filter((g) => presentGroups.includes(g)).map((g) => ({ id: g, label: GROUP_LABEL[g] })),
  flows: resolvedFlows
};
const flowsJsonBytes = JSON.stringify(flowsJsonPayload, null, 2) + '\n';

// In-repo SoT artifact: src/flows/flows.json. This is the resolved copy the
// drift guard (`pnpm check:flows --sot src/flows/flows.json`) reads, and what
// the downstream copies must match byte-for-byte. Same bytes as downstream.
const srcFlowsDir = path.join(outputAppDir, 'src', 'flows');
fs.mkdirSync(srcFlowsDir, { recursive: true });
fs.writeFileSync(path.join(srcFlowsDir, 'flows.json'), flowsJsonBytes);

// Render public author-facing constraints. Internal backend limitation details
// are intentionally excluded from all generated documentation.
function contractLines(flow) {
  const c = flow.contract;
  if (!c) return [];
  const out = [];
  for (const constraint of c.constraints ?? []) out.push(`- **Contract:** ${constraint}`);
  return out;
}

function buildCatalogMd() {
  const lines = [
    '<!-- GENERATED by apps/blocks/scripts/generate-flows.mjs — DO NOT EDIT. Run `pnpm gen:flows` to regenerate. -->',
    '',
    '# Flow catalog',
    '',
    `Source of truth: \`apps/blocks/scripts/flows-content.mjs\`. sotHash: \`${sotHash}\`.`,
    '',
    'Each flow is a backend-capability bundle: a preset to provision (resolved to a flat module list), ' +
      'the GraphQL operations it exposes, and the Blocks that wire the UI. Status is explicit: ga, limited, or blocked.',
    '',
    '**Scope:** Flows are auth, account, and organization capability bundles — the identity/membership ' +
      'surface. They are NOT general app flows and do NOT cover your domain data UI. For YOUR ' +
      'business-entity screens (list/create/edit/delete of your tables), build domain UI from the data ' +
      'model with constructive-frontend (CRUD Stack + _meta meta-forms) — automated by the harness’s ' +
      'scripts/scaffold-frontend.mjs (Phase 4).',
    ''
  ];
  for (const group of presentGroups) {
    const inGroup = resolvedFlows.filter((f) => f.group === group);
    if (!inGroup.length) continue;
    lines.push(`## ${GROUP_LABEL[group]}`, '');
    for (const flow of inGroup) {
      lines.push(`### ${flow.name} (\`${flow.id}\`)`, '');
      lines.push(flow.summary, '');
      lines.push(`- **Preset:** \`${flow.backend.preset}\``);
      lines.push(`- **Modules:** ${flow.backend.modules.map((m) => `\`${displayModule(m)}\``).join(', ')}`);
      lines.push(`- **Exposed ops:** ${flow.backend.exposedOps.map((o) => `\`${o}\``).join(', ')}`);
      lines.push(`- **Blocks:** ${flow.blocks.map((b) => `\`${b}\``).join(', ')}`);
      lines.push(...contractLines(flow));
      lines.push('');
      lines.push('Install:', '', '```bash', flow.howto.install, '```', '');
    }
  }
  return lines.join('\n');
}
const catalogMdBytes = buildCatalogMd();

function emitDownstream(envVar, label) {
  const outDir = process.env[envVar];
  if (!outDir) {
    console.warn(`[gen:flows] ${envVar} not set — skipping ${label} artifacts.`);
    return null;
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'flows.json'), flowsJsonBytes);
  fs.writeFileSync(path.join(outDir, 'flow-catalog.md'), catalogMdBytes);
  return path.join(outDir, 'flows.json');
}

const skillFlows = emitDownstream('FLOWS_OUT_SKILL', 'skill');
const harnessFlows = emitDownstream('FLOWS_OUT_HARNESS', 'harness');

// Belt-and-suspenders: assert byte-identical when both were written.
if (skillFlows && harnessFlows) {
  const a = fs.readFileSync(skillFlows);
  const b = fs.readFileSync(harnessFlows);
  if (!a.equals(b)) fail('skill flows.json and harness flows.json are not byte-identical.');
}

// ---------------------------------------------------------------------------
// Done. The docs flow PAGES are emitted by generate-manifest.mjs (via
// scripts/flows-pages.mjs) into src/lib/docs/registry-data.ts.
// ---------------------------------------------------------------------------
const byGroup = presentGroups.map((g) => `${g}:${FLOWS.filter((f) => f.group === g).length}`).join(', ');
console.log(
    `[gen:flows] ${FLOWS.length} flows (${byGroup}) | presets via node-type-registry | sotHash ${sotHash.slice(0, 12)}…\n` +
    `[gen:flows]   in-repo SoT -> src/flows/flows.json (pages via flows-pages.mjs -> registry-data.ts)\n` +
    `[gen:flows]   skill flows.json -> ${skillFlows ?? '(skipped)'}\n` +
    `[gen:flows]   harness flows.json -> ${harnessFlows ?? '(skipped)'}`
);

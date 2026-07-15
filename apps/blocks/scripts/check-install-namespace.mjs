#!/usr/bin/env node
/**
 * check-install-namespace.mjs — guard against BARE shadcn install commands.
 *
 * Every generated `shadcn ... add <pkg>...` line MUST install only NAMESPACED
 * ids (`@constructive/<name>`). A bare block name (`add auth-sign-in-card`)
 * resolves against shadcn's DEFAULT registry and 404s — exactly the drift the
 * generators (generate-flows.mjs + generate-manifest.mjs) were fixed to prevent.
 * This re-asserts the invariant on the EMITTED bytes so the bare form can't
 * silently return via a hand-edit or a generator regression.
 *
 * Scans (each only if present): the resolved SoT artifact (src/flows/flows.json,
 * whose `howto.install` carries every flow's derived install line), the flow
 * catalog wherever it lands, and downstream copies only when their explicit
 * FLOWS_OUT_SKILL / FLOWS_OUT_HARNESS directories are supplied. (The docs
 * data module derives block/ui install ids structurally as `@constructive/<name>`
 * and flow installs from this same SoT, so it needs no separate scan.)
 *
 * Zero deps, pure Node (>=18). Run from apps/blocks (or anywhere — it findUps).
 *   node scripts/check-install-namespace.mjs            # human report
 *   node scripts/check-install-namespace.mjs --json      # machine-readable
 *
 * Exit codes: 0 all install lines namespaced · 1 a bare install line was found.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

const C = process.stdout.isTTY
  ? { red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m` }
  : { red: (s) => s, green: (s) => s, dim: (s) => s, bold: (s) => s, yellow: (s) => s };

// Collect every scan target that exists.
const targets = [];
for (const rel of [join('src', 'flows', 'flows.json')]) {
  const p = join(appDir, rel);
  if (existsSync(p)) targets.push(p);
}
// Downstream validation is deliberately opt-in. CI never scans or mutates
// sibling repositories based on their position on disk.
for (const envVar of ['FLOWS_OUT_SKILL', 'FLOWS_OUT_HARNESS']) {
  const outDir = process.env[envVar];
  if (!outDir) continue;
  for (const name of ['flows.json', 'flow-catalog.md']) {
    const target = resolve(outDir, name);
    if (existsSync(target) && !targets.includes(target)) targets.push(target);
  }
}
// In-repo flow catalog, if the generator ever writes one beside the SoT json.
const localCatalog = join(appDir, 'src', 'flows', 'flow-catalog.md');
if (existsSync(localCatalog) && !targets.includes(localCatalog)) targets.push(localCatalog);

// Match a shadcn add invocation and capture the package list up to end-of-line
// or a closing JSON quote. Handles both raw shell lines and JSON-escaped strings.
const ADD_RE = /shadcn(?:@\S+)?\s+add\s+([^"\\\n]+)/g;

const violations = [];
let scanned = 0;
for (const file of targets) {
  let text;
  try {
    if (!statSync(file).isFile()) continue;
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  scanned++;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    ADD_RE.lastIndex = 0;
    let m;
    while ((m = ADD_RE.exec(lines[i])) !== null) {
      // Package tokens are whitespace-separated; ignore trailing CLI flags (--…).
      const pkgs = m[1].trim().split(/\s+/).filter((t) => t && !t.startsWith('-'));
      const bare = pkgs.filter((p) => !p.startsWith('@'));
      if (bare.length) violations.push({ file, line: i + 1, bare, snippet: lines[i].trim() });
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ ok: violations.length === 0, scanned, targets: targets.length, violations }, null, 2));
  process.exit(violations.length === 0 ? 0 : 1);
}

console.log(C.bold('\nConstructive Blocks — install-namespace guard\n'));
console.log(`${C.dim('scanned')} ${scanned} file(s) for shadcn install lines\n`);
if (violations.length === 0) {
  console.log(C.green('✓ every generated `shadcn add` line is @constructive/-namespaced.'));
  process.exit(0);
}
console.log(C.red(`✗ ${violations.length} bare (un-namespaced) install line(s) found:\n`));
for (const v of violations) {
  console.log(`  ${C.red('✗')} ${C.dim(v.file)}:${v.line}`);
  console.log(`    bare: ${v.bare.join(', ')}`);
  console.log(`    ${C.dim(v.snippet)}`);
}
console.log(
  C.yellow(
    '\n  Install lines are GENERATED. Fix the generators (generate-flows.mjs / generate-manifest.mjs),\n' +
      '  then re-run: (cd apps/blocks && pnpm gen) — never hand-edit the emitted bytes.'
  )
);
process.exit(1);

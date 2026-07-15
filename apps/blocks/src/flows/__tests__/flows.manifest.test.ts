import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { FLOWS, FLOW_GROUP_ORDER } from '../flows.manifest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- internal authoring metadata intentionally has no public TS type.
import { FLOWS as INTERNAL_FLOWS } from '../../../scripts/flows-content.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '..', '..', '..'); // src/flows/__tests__ -> apps/blocks

// --- registry slugs ---------------------------------------------------------
const registry = JSON.parse(fs.readFileSync(path.join(appDir, 'registry.json'), 'utf8'));
const registrySlugs = new Set<string>((registry.items ?? []).map((i: { name: string }) => i.name));

// --- preset resolution (same pinned package used by the generators) ----------
const SHIPPED_PRESETS = new Set(['auth:email', 'auth:sso', 'b2b']);
const { getModulePreset } = require('node-type-registry') as {
  getModulePreset: (name: string) => { modules: unknown[] } | undefined;
};

describe('flows manifest', () => {
  it('has flows in all declared groups', () => {
    expect(FLOWS.length).toBeGreaterThan(0);
    for (const group of FLOW_GROUP_ORDER) {
      expect(FLOWS.some((f) => f.group === group)).toBe(true);
    }
  });

  it('every flow id is unique', () => {
    const ids = FLOWS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses a supported release status and documents every non-GA limitation', () => {
    for (const flow of INTERNAL_FLOWS) {
      expect(['ga', 'limited', 'blocked']).toContain(flow.status);
      if (flow.status !== 'ga') {
        expect(flow.contract?.knownBackendLimitations?.length ?? 0, flow.id).toBeGreaterThan(0);
      }
    }
  });

  it('does not expose backend limitations through the public manifest', () => {
    expect(JSON.stringify(FLOWS)).not.toContain('knownBackendLimitations');
    expect(JSON.stringify(FLOWS)).not.toContain('PLATFORM-GAPS');
  });

  it('every block slug exists in registry.json', () => {
    for (const flow of FLOWS) {
      expect(flow.blocks.length).toBeGreaterThan(0);
      for (const slug of flow.blocks) {
        expect(registrySlugs, `flow '${flow.id}' block '${slug}'`).toContain(slug);
      }
    }
  });

  it('every preset is a shipped node-type-registry preset', () => {
    for (const flow of FLOWS) {
      expect(SHIPPED_PRESETS, `flow '${flow.id}' preset '${flow.backend.preset}'`).toContain(flow.backend.preset);
    }
  });

  it('every preset resolves to a non-empty module list', () => {
    for (const preset of new Set(FLOWS.map((f) => f.backend.preset))) {
      const resolved = getModulePreset(preset);
      expect(resolved, `preset '${preset}' must resolve`).toBeTruthy();
      expect(resolved!.modules.length, `preset '${preset}' modules`).toBeGreaterThan(0);
    }
  });

  it('auth:email resolves to the expected ~13 core modules', () => {
    const ae = getModulePreset('auth:email');
    expect(ae).toBeTruthy();
    const flat = ae!.modules.map((m) => (Array.isArray(m) ? m[0] : m));
    for (const required of ['users_module', 'sessions_module', 'user_credentials_module', 'emails_module', 'rls_module', 'user_auth_module']) {
      expect(flat, `auth:email must include ${required}`).toContain(required);
    }
    expect(ae!.modules.length).toBeGreaterThanOrEqual(12);
    expect(ae!.modules.length).toBeLessThanOrEqual(14);
  });

  it('every relatedFlows id resolves to a known flow', () => {
    const ids = new Set(FLOWS.map((f) => f.id));
    for (const flow of FLOWS) {
      for (const rel of flow.relatedFlows) {
        expect(ids, `flow '${flow.id}' relatedFlows '${rel}'`).toContain(rel);
      }
    }
  });

  it('exposedOps and howto are present on every flow', () => {
    for (const flow of FLOWS) {
      expect(flow.backend.exposedOps.length, `flow '${flow.id}' exposedOps`).toBeGreaterThan(0);
      for (const key of ['provision', 'install', 'wire', 'usage'] as const) {
        expect(typeof flow.howto[key], `flow '${flow.id}' howto.${key}`).toBe('string');
        expect(flow.howto[key].length, `flow '${flow.id}' howto.${key}`).toBeGreaterThan(0);
      }
    }
  });
});

#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { FLOWS as internalFlows } from './flows-content.mjs';

const require = createRequire(import.meta.url);
const { getModulePreset } = require('node-type-registry');
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const payload = JSON.parse(fs.readFileSync(path.join(appDir, 'src', 'flows', 'flows.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(appDir, 'registry.json'), 'utf8'));
const registryNames = new Set((registry.items ?? []).map((item) => item.name));
const statuses = new Set(['ga', 'limited', 'blocked']);

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const errors = [];
const expectedHash = crypto.createHash('sha256').update(canonicalize({ flows: payload.flows })).digest('hex');
if (payload.sotHash !== expectedHash) errors.push('flows.json sotHash does not match its canonical flow payload');

const ids = new Set(payload.flows.map((flow) => flow.id));
if (ids.size !== payload.flows.length) errors.push('flow ids must be unique');

for (const flow of payload.flows) {
  if (!statuses.has(flow.status)) errors.push(`${flow.id}: invalid status '${flow.status}'`);
  for (const block of flow.blocks ?? []) {
    if (!registryNames.has(block)) errors.push(`${flow.id}: unknown registry block '${block}'`);
  }
  for (const related of flow.relatedFlows ?? []) {
    if (!ids.has(related)) errors.push(`${flow.id}: unknown related flow '${related}'`);
  }
  const preset = getModulePreset?.(flow.backend?.preset);
  if (!preset?.modules?.length) errors.push(`${flow.id}: unknown or empty preset '${flow.backend?.preset}'`);
}

for (const flow of internalFlows) {
  if (flow.status !== 'ga' && !(flow.contract?.knownBackendLimitations?.length > 0)) {
    errors.push(`${flow.id}: ${flow.status} flows require an internal knownBackendLimitations entry`);
  }
}

const publicPayload = JSON.stringify(payload);
if (publicPayload.includes('knownBackendLimitations') || publicPayload.includes('PLATFORM-GAPS')) {
  errors.push('public flows.json exposes internal backend limitation details');
}

if (errors.length) {
  console.error('Flow validation failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Validated ${payload.flows.length} flows (${[...statuses].join(', ')}).`);

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

type Registry = Readonly<{
  items: readonly Readonly<{ name: string }>[];
}>;

type SkillEvals = Readonly<{
  skill_name: string;
  evals: readonly Readonly<{
    id: number;
    prompt: string;
    expected_output: string;
    files: readonly string[];
    expectations: readonly string[];
  }>[];
}>;

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const skillRoot = path.join(
  repositoryRoot,
  '.agents',
  'skills',
  'constructive-blocks',
);
const skillPath = path.join(skillRoot, 'SKILL.md');
const referencesRoot = path.join(skillRoot, 'references');
const evalsPath = path.join(skillRoot, 'evals', 'evals.json');
const expectedReferences = [
  'catalog-and-install.md',
  'runtime-and-verification.md',
  'surfaces-and-ownership.md',
] as const;
const canonicalRegistryManifests = [
  path.join(repositoryRoot, 'packages', 'ui', 'registry.json'),
  path.join(repositoryRoot, 'packages', 'sheets', 'registry.json'),
  path.join(repositoryRoot, 'packages', 'schema-builder', 'registry.json'),
  path.join(repositoryRoot, 'apps', 'blocks', 'registry.json'),
] as const;

function read(relativePath: string): string {
  return readFileSync(path.join(skillRoot, relativePath), 'utf8');
}

function parseRegistry(manifest: string): Registry {
  return JSON.parse(readFileSync(manifest, 'utf8')) as Registry;
}

describe('constructive-blocks Agent Skill', () => {
  it('uses portable Agent Skills frontmatter and progressive disclosure', () => {
    const source = readFileSync(skillPath, 'utf8');
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter, 'SKILL.md must start with YAML frontmatter.');

    const keys = frontmatter[1]
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(0, line.indexOf(':')));
    assert.deepEqual(keys, ['name', 'description']);
    assert.match(frontmatter[1], /^name: constructive-blocks$/m);
    assert.match(frontmatter[1], /^description: .+Blocks.+Use for .+$/m);
    assert.ok(
      source.split('\n').length < 500,
      'SKILL.md must stay below the progressive-disclosure line limit.',
    );

    assert.deepEqual(
      readdirSync(referencesRoot).sort(),
      [...expectedReferences].sort(),
    );
    for (const reference of expectedReferences) {
      assert.match(
        source,
        new RegExp(`\\([^)]*references/${reference.replace('.', '\\.') }\\)`),
        `SKILL.md must link ${reference}.`,
      );
    }
  });

  it('keeps every local Markdown reference inside the portable skill root', () => {
    const markdownFiles = [
      skillPath,
      ...expectedReferences.map((name) => path.join(referencesRoot, name)),
    ];

    for (const markdownFile of markdownFiles) {
      const source = readFileSync(markdownFile, 'utf8');
      for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const reference = match[1].split('#', 1)[0];
        if (
          !reference ||
          reference.startsWith('http://') ||
          reference.startsWith('https://') ||
          reference.startsWith('mailto:')
        ) {
          continue;
        }

        const resolved = path.resolve(path.dirname(markdownFile), reference);
        assert.ok(
          resolved.startsWith(`${skillRoot}${path.sep}`),
          `${path.relative(repositoryRoot, markdownFile)} escapes the skill root: ${reference}`,
        );
        assert.ok(
          existsSync(resolved),
          `${path.relative(repositoryRoot, markdownFile)} references missing ${reference}`,
        );
      }
    }
  });

  it('does not pin Blocks source, catalog snapshots, or consumer package versions', () => {
    const source = [
      read('SKILL.md'),
      ...expectedReferences.map((name) => read(`references/${name}`)),
      read('evals/evals.json'),
    ].join('\n');
    const forbidden: readonly Readonly<{ label: string; pattern: RegExp }>[] = [
      { label: 'a git commit SHA', pattern: /\b[0-9a-f]{7,40}\b/i },
      {
        label: 'a Blocks commit or non-default branch URL',
        pattern:
          /github\.com\/constructive-io\/blocks\/(?:commit\/|tree\/(?!main(?:\/|\b)))/i,
      },
      {
        label: 'a repository work branch',
        pattern: /\b(?:feat|fix|chore|docs)\/[a-z0-9._/-]+/i,
      },
      {
        label: 'a fixed shadcn version',
        pattern: /shadcn@(?:v?\d|[~^])/i,
      },
      {
        label: 'a fixed Constructive package version',
        pattern: /@constructive-io\/[a-z0-9-]+@(?:v?\d|[~^])/i,
      },
      {
        label: 'a retired snapshot contract',
        pattern:
          /(?:publicRegistryReady|install-roots\.v\d|source-preflight|branch-only)/i,
      },
    ];

    for (const { label, pattern } of forbidden) {
      assert.doesNotMatch(source, pattern, `Skill contains ${label}.`);
    }
  });

  it('routes every major current registry surface without copying the catalog', () => {
    const itemNames = new Set(
      canonicalRegistryManifests.flatMap((manifest) =>
        parseRegistry(manifest).items.map(({ name }) => name),
      ),
    );
    const source = [
      read('SKILL.md'),
      ...expectedReferences.map((name) => read(`references/${name}`)),
    ].join('\n');
    const coverage = [
      { root: 'button', marker: 'primitive' },
      { root: 'ai', marker: '`ai`' },
      { root: 'command-palette', marker: '`command-palette`' },
      { root: 'sheets', marker: '`sheets`' },
      { root: 'schema-builder', marker: '`schema-builder`' },
      { root: 'org-chart', marker: '`org-chart`' },
      { root: 'storage-browser', marker: '`storage-browser`' },
      { root: 'billing-settings-page', marker: '`billing-settings-page`' },
      { root: 'feature-pack-data', marker: '`feature-pack-<id>`' },
      { root: 'console-module-data', marker: '`console-module-<id>`' },
      { root: 'preset-full', marker: 'preset' },
      { root: 'console-kit-nextjs', marker: '`console-kit-nextjs`' },
    ] as const;

    for (const { marker, root } of coverage) {
      assert.ok(itemNames.has(root), `Canonical registries are missing ${root}.`);
      assert.ok(source.includes(marker), `Skill does not route ${root}.`);
    }
    assert.doesNotMatch(
      source,
      /\b\d+\s+(?:registry\s+)?items\b/i,
      'Skill must not embed a registry item count.',
    );
  });

  it('ships realistic forward evals for the major application workflows', () => {
    const evals = JSON.parse(readFileSync(evalsPath, 'utf8')) as SkillEvals;
    assert.equal(evals.skill_name, 'constructive-blocks');
    assert.ok(evals.evals.length >= 6);
    assert.equal(
      new Set(evals.evals.map(({ id }) => id)).size,
      evals.evals.length,
      'Eval ids must be unique.',
    );

    for (const evaluation of evals.evals) {
      assert.ok(evaluation.prompt.length > 40);
      assert.ok(evaluation.expected_output.length > 40);
      assert.deepEqual(evaluation.files, []);
      assert.ok(evaluation.expectations.length >= 6);
    }

    const prompts = evals.evals.map(({ prompt }) => prompt).join('\n');
    for (const workflow of [
      'agent chat',
      'spreadsheet',
      'schema editor',
      'storage',
      'billing',
      'tenant console',
    ]) {
      assert.match(prompts.toLowerCase(), new RegExp(workflow));
    }
  });
});

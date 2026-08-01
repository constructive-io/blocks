import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { PRIMITIVE_DOCS } from '../src/content/ui';
import { FEATURE_PACK_IDS, FEATURE_PACK_MANIFESTS } from '../src/feature-packs';
import { UI_DEMO_SOURCE } from '../src/generated/ui-demo-source';
import { APPLICATION_BLOCKS } from '../src/lib/application-blocks';
import { APPLICATION_DOC_SEQUENCE } from '../src/lib/application-doc-navigation';
import { BASE_PRIMITIVES, packageImport, type BasePrimitiveName } from '../src/lib/base-primitives';
import { AI_DOC } from '../src/lib/ai-docs';
import { COMPONENT_DOC_SEQUENCE } from '../src/lib/component-doc-navigation';
import { COMMAND_PALETTE_DOC } from '../src/lib/command-palette-docs';
import { packageCommands, registryCommands } from '../src/lib/install-mode';
import { FEATURE_PACK_DOCS } from '../src/lib/feature-packs';
import { PRIMITIVE_DOC_SECTION_ORDER, type PrimitiveApiPart } from '../src/lib/primitive-docs';
import { SOURCE_BLOCKS } from '../src/lib/source-blocks';

type PackageManifest = {
  devDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
};

type RegistryManifest = {
  items?: Array<{ name?: string; docs?: string }>;
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(appDirectory, '..', '..');
const uiDirectory = path.join(repositoryRoot, 'packages', 'ui');
const contentDirectory = path.join(appDirectory, 'src', 'content', 'ui');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function isEmpty(values: readonly unknown[]): boolean {
  return values.length === 0;
}

const APPLICATION_DOC_SECTION_ORDER = [
  'installation',
  'when-to-use',
  'usage',
  'state',
  'composition',
  'examples',
  'accessibility',
  'api-reference',
] as const;

function validateSectionOrder(
  errors: string[],
  relativePath: string,
  label: string,
): void {
  const file = path.join(appDirectory, relativePath);
  if (!fs.existsSync(file)) {
    errors.push(`${label}: missing documentation template ${relativePath}`);
    return;
  }

  const source = fs.readFileSync(file, 'utf8');
  let previousPosition = -1;
  for (const section of APPLICATION_DOC_SECTION_ORDER) {
    const position = source.indexOf(`id="${section}"`);
    if (position === -1) {
      errors.push(`${label}: missing ${section} documentation section`);
      continue;
    }
    if (position < previousPosition) {
      errors.push(`${label}: ${section} is out of canonical documentation order`);
    }
    previousPosition = position;
  }
}

function collectFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      entry.name === '.git' ||
      entry.name === '.next' ||
      entry.name === 'dist' ||
      entry.name === 'node_modules' ||
      entry.name === 'out'
    ) {
      return [];
    }
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  });
}

function isPublicDocumentationSource(file: string): boolean {
  const relativePath = path.relative(repositoryRoot, file).split(path.sep).join('/');
  const extension = path.extname(file);

  if (extension === '.md' || extension === '.mdx') return true;
  if (
    relativePath.startsWith('apps/blocks/src/') &&
    (extension === '.ts' || extension === '.tsx')
  ) {
    return true;
  }
  if (relativePath === 'apps/blocks/registry.json') return true;
  if (relativePath === 'apps/registry/registry.json') return true;
  if (
    relativePath.startsWith('apps/registry/public/r/') &&
    extension === '.json'
  ) {
    return true;
  }
  if (/^packages\/[^/]+\/registry\.json$/.test(relativePath)) return true;
  return /^packages\/[^/]+\/scripts\/build-registry\.ts$/.test(relativePath);
}

function validatePublicShadcnCommands(errors: string[]): void {
  const rules: ReadonlyArray<{
    message: string;
    pattern: RegExp;
    isViolation?: (match: RegExpMatchArray, source: string) => boolean;
  }> = [
    {
      message: 'use pnpm dlx instead of npx for public shadcn commands',
      pattern: /\bnpx\s+shadcn(?:@[^\s`"']+)?/g,
    },
    {
      message: 'use pnpm dlx instead of bunx for public shadcn commands',
      pattern: /\bbunx(?:\s+--bun)?\s+shadcn(?:@[^\s`"']+)?/g,
    },
    {
      message: 'public shadcn references must use shadcn@latest instead of a pinned tag or version',
      pattern: /\bshadcn@([a-z0-9_-]+(?:\.[a-z0-9_-]+)*)/gi,
      isViolation: (match) => match[1] !== 'latest',
    },
    {
      message: 'public add commands must use pnpm dlx shadcn@latest',
      pattern: /\bshadcn\s+add\b/g,
    },
    {
      message: 'public shadcn commands must use the pnpm dlx runner',
      pattern: /\bshadcn@[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\s+[a-z][a-z0-9:-]*\b/gi,
      isViolation: (match, source) => {
        const prefix = source
          .slice(Math.max(0, (match.index ?? 0) - 200), match.index)
          .replace(/<[^>]*>/g, ' ')
          .replace(/\{\s*['"]\s*['"]\s*\}/g, ' ');
        return !/pnpm\s+dlx\s+$/.test(prefix);
      },
    },
  ] as const;

  const files = collectFiles(repositoryRoot).filter(isPublicDocumentationSource);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      for (const match of source.matchAll(rule.pattern)) {
        if (rule.isViolation && !rule.isViolation(match, source)) continue;
        const line = source.slice(0, match.index).split('\n').length;
        errors.push(
          `${path.relative(repositoryRoot, file)}:${line}: ${rule.message} (found "${match[0]}")`,
        );
      }
    }
  }
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false)
  );
}

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : bindingNames(element.name)));
}

function runtimeExports(sourceFile: ts.SourceFile): string[] {
  const exports = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        if (!specifier.isTypeOnly) exports.add(specifier.name.text);
      }
      continue;
    }

    if (!hasExportModifier(statement)) continue;
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      exports.add(statement.name.text);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of bindingNames(declaration.name)) exports.add(name);
      }
    }
  }

  return [...exports].sort();
}

function loadUiProgram(files: string[]): { checker: ts.TypeChecker; program: ts.Program } {
  const configFile = path.join(uiDirectory, 'tsconfig.json');
  const config = ts.readConfigFile(configFile, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, uiDirectory, undefined, configFile);
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
  }
  const program = ts.createProgram({ rootNames: files, options: { ...parsed.options, noEmit: true } });
  return { checker: program.getTypeChecker(), program };
}

function exportedPropNames(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  exportName: string,
): Set<string> | undefined {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return undefined;
  const exported = checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === exportName);
  if (!exported) return undefined;
  const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
  const declaration = target.valueDeclaration ?? target.declarations?.[0] ?? sourceFile;
  const type = checker.getTypeOfSymbolAtLocation(target, declaration);
  const signatures = [...type.getCallSignatures(), ...type.getConstructSignatures()];
  if (signatures.length === 0) return undefined;

  const props = new Set<string>();
  for (const signature of signatures) {
    const parameter = signature.getParameters()[0];
    if (!parameter) continue;
    const location = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? declaration;
    const parameterType = checker.getTypeOfSymbolAtLocation(parameter, location);
    for (const prop of checker.getPropertiesOfType(parameterType)) props.add(prop.name);
  }
  return props;
}

function validateApiProps(
  errors: string[],
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  primitiveName: string,
  api: readonly PrimitiveApiPart[],
): void {
  for (const part of api) {
    if (!part.props?.length) continue;
    const props = exportedPropNames(checker, sourceFile, part.name);
    if (!props) {
      errors.push(`${primitiveName}: cannot resolve callable props for documented ${part.name}`);
      continue;
    }
    for (const prop of part.props) {
      if (!props.has(prop.name)) {
        errors.push(`${primitiveName}: ${part.name}.${prop.name} is not present in the canonical source type`);
      }
    }
  }
}

const names = BASE_PRIMITIVES.map(({ name }) => name);
const uniqueNames = new Set(names);
if (names.length !== 29 || uniqueNames.size !== names.length) {
  throw new Error(`The docs catalog must contain exactly 29 unique primitives; received ${names.length}.`);
}

const uiPackage = readJson<PackageManifest>(path.join(uiDirectory, 'package.json'));
const uiRegistry = readJson<RegistryManifest>(path.join(uiDirectory, 'registry.json'));
const registryNames = new Set((uiRegistry.items ?? []).flatMap((item) => (item.name ? [item.name] : [])));
const componentFiles = BASE_PRIMITIVES.map(({ name }) => path.join(uiDirectory, 'src', 'components', `${name}.tsx`));
const { checker, program } = loadUiProgram(componentFiles);
const errors: string[] = [];

validatePublicShadcnCommands(errors);

const contentFiles = fs
  .readdirSync(contentDirectory)
  .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
  .sort();
const expectedContentFiles = names.map((name) => `${name}.ts`).sort();
if (JSON.stringify(contentFiles) !== JSON.stringify(expectedContentFiles)) {
  errors.push('src/content/ui must contain exactly one TypeScript content module per base primitive');
}

if (PRIMITIVE_DOC_SECTION_ORDER.at(-1) !== 'api-reference') {
  errors.push('API Reference must remain the final primitive documentation section');
}

if (JSON.stringify(Object.keys(PRIMITIVE_DOCS)) !== JSON.stringify(names)) {
  errors.push('Primitive docs map must match the ordered base primitive catalog exactly');
}
if (JSON.stringify(Object.keys(UI_DEMO_SOURCE)) !== JSON.stringify([...names].sort())) {
  errors.push('Generated demo source must contain exactly the 29 sorted base primitive slugs');
}

for (const primitive of BASE_PRIMITIVES) {
  if (!uiPackage.exports?.[`./${primitive.name}`]) {
    errors.push(`${primitive.name}: missing @constructive-io/ui package export`);
  }
  if (!registryNames.has(primitive.name)) {
    errors.push(`${primitive.name}: missing packages/ui registry item`);
  }

  const demoPath = path.join(appDirectory, 'src', 'components', 'docs', 'demos', `ui-${primitive.name}.demo.tsx`);
  if (!fs.existsSync(demoPath)) {
    errors.push(`${primitive.name}: missing package-backed preview`);
    continue;
  }
  const demoSource = fs.readFileSync(demoPath, 'utf8');
  if (!demoSource.includes(`@constructive-io/ui/${primitive.name}`)) {
    errors.push(`${primitive.name}: preview must import its npm package subpath`);
  }

  const docs = PRIMITIVE_DOCS[primitive.name];
  if (docs.name !== primitive.name) errors.push(`${primitive.name}: content module name does not match its key`);
  if (docs.whenToUse.length === 0) errors.push(`${primitive.name}: missing when-to-use guidance`);
  if (docs.examples.length < 1 || docs.examples.length > 6) {
    errors.push(`${primitive.name}: expected one to six focused component-specific examples`);
  }
  if (docs.accessibility.length === 0) errors.push(`${primitive.name}: missing accessibility guidance`);
  if (docs.stateModel === 'stateless' && docs.state)
    errors.push(`${primitive.name}: stateless docs cannot render state guidance`);
  if (docs.stateModel !== 'stateless' && !docs.state)
    errors.push(`${primitive.name}: stateful docs require state guidance`);

  const generated = UI_DEMO_SOURCE[primitive.name] as Record<string, { npm: string; registry: string }>;
  const demoReferences = [
    'BlockDemo',
    docs.usage.demo,
    ...(docs.state?.demo ? [docs.state.demo] : []),
    ...docs.examples.map(({ demo }) => demo),
  ];
  if (new Set(demoReferences).size !== demoReferences.length) {
    errors.push(`${primitive.name}: example references must be distinct across page sections`);
  }
  for (const demo of demoReferences) {
    const source = generated?.[demo];
    if (!source) {
      errors.push(`${primitive.name}: missing generated source for ${demo}`);
      continue;
    }
    if (
      source.npm.includes('@/components/docs/showcase-kit') ||
      source.registry.includes('@/components/docs/showcase-kit')
    ) {
      errors.push(`${primitive.name}:${demo}: consumer source must omit the docs-only Demo wrapper`);
    }
    if (!source.npm.includes(`@constructive-io/ui/${primitive.name}`)) {
      errors.push(`${primitive.name}:${demo}: npm source must use the primitive package subpath`);
    }
    if (source.registry.includes('@constructive-io/ui')) {
      errors.push(`${primitive.name}:${demo}: registry source contains a package import`);
    }
    if (!source.registry.includes(`@/components/ui/${primitive.name}`)) {
      errors.push(`${primitive.name}:${demo}: registry source must use the local UI alias`);
    }
  }

  const sourceFile = program.getSourceFile(componentFiles[names.indexOf(primitive.name)]);
  if (!sourceFile) {
    errors.push(`${primitive.name}: TypeScript did not load the canonical component source`);
    continue;
  }
  const actualExports = runtimeExports(sourceFile);
  const documentedExports = docs.api.map(({ name }) => name).sort();
  if (JSON.stringify(documentedExports) !== JSON.stringify(actualExports)) {
    const missing = actualExports.filter((name) => !documentedExports.includes(name));
    const extra = documentedExports.filter((name) => !actualExports.includes(name));
    errors.push(
      `${primitive.name}: API export mismatch${missing.length ? `; missing ${missing.join(', ')}` : ''}${
        extra.length ? `; extra ${extra.join(', ')}` : ''
      }`,
    );
  }
  validateApiProps(errors, checker, sourceFile, primitive.name, docs.api);

  const npmCommands = packageCommands({ globals: true, importLine: packageImport(primitive) });
  const registryImport = `import { ${primitive.exportName} } from '@/components/ui/${primitive.name}';`;
  const shadcnCommands = registryCommands({ item: primitive.name, includeConfig: true, importLine: registryImport });
  if (!npmCommands.some(({ code }) => code === "@import '@constructive-io/ui/globals.css';")) {
    errors.push(`${primitive.name}: npm installation must include globals.css`);
  }
  if (!shadcnCommands.some(({ code }) => code === `pnpm dlx shadcn@latest add @constructive/${primitive.name}`)) {
    errors.push(`${primitive.name}: registry installation command is incorrect`);
  }
  if (!shadcnCommands.some(({ code }) => code === registryImport)) {
    errors.push(`${primitive.name}: registry installation must show the local alias import`);
  }
}

const documentedFeaturePackIds = FEATURE_PACK_DOCS.map(({ id }) => id);
if (JSON.stringify(documentedFeaturePackIds) !== JSON.stringify(FEATURE_PACK_IDS)) {
  errors.push('Feature-pack docs must match the seven canonical ids in dependency order');
}

const featurePackRegistry = readJson<RegistryManifest>(path.join(appDirectory, 'registry.json'));
const featurePackRegistryItems = new Map(
  (featurePackRegistry.items ?? []).flatMap((item) => (item.name ? [[item.name, item] as const] : [])),
);

for (const relativePath of [
  path.join('src', 'app', 'blocks', 'features', '[pack]', 'page.tsx'),
  path.join('src', 'app', 'blocks', 'features', '[pack]', 'preview', 'page.tsx'),
]) {
  if (!fs.existsSync(path.join(appDirectory, relativePath))) {
    errors.push(`Missing feature-pack route ${relativePath}`);
  }
}

for (const block of FEATURE_PACK_DOCS) {
  const manifest = FEATURE_PACK_MANIFESTS.find(({ id }) => id === block.id);
  if (!manifest) {
    errors.push(`${block.id}: missing canonical feature-pack manifest`);
    continue;
  }

  const expectedEndpoints = [
    ...manifest.endpoints.required,
    ...manifest.endpoints.optional.map((endpoint) => `optional ${endpoint}`),
  ].join(', ');
  if (block.registryName !== `feature-pack-${block.id}`) {
    errors.push(`${block.id}: registry name must be feature-pack-${block.id}`);
  }
  if (JSON.stringify(block.dependencies) !== JSON.stringify(manifest.dependencies)) {
    errors.push(`${block.id}: documented dependencies drifted from its manifest`);
  }
  if (block.endpoints !== expectedEndpoints) {
    errors.push(`${block.id}: documented endpoints drifted from its manifest`);
  }
  if (
    block.whenToUse.length < 2 ||
    isEmpty(block.surfaces) ||
    isEmpty(block.accessibility) ||
    isEmpty(block.api) ||
    !block.state.description ||
    !block.state.actionGuidance ||
    !block.usage.description
  ) {
    errors.push(`${block.id}: feature-pack docs are missing required editorial coverage`);
  }

  const apiLabels = block.api.flatMap(({ name }) => name.split(' / ').map((prop) => prop.trim()));
  const documentedApiProps = [...block.apiProps];
  if (
    new Set(apiLabels).size !== apiLabels.length ||
    JSON.stringify([...apiLabels].sort()) !== JSON.stringify([...documentedApiProps].sort())
  ) {
    errors.push(`${block.id}: API labels must exactly match its typed public property catalog`);
  }

  const expectedImport = `@/blocks/feature-packs/${block.id}/${block.id}-feature-pack`;
  if (!block.usage.example.includes(block.exportName) || !block.usage.example.includes(expectedImport)) {
    errors.push(`${block.id}: basic usage must import and render ${block.exportName}`);
  }
  const registryItem = featurePackRegistryItems.get(block.registryName);
  if (!registryItem?.docs?.includes(expectedImport)) {
    errors.push(`${block.id}: registry item must document its feature-pack root import`);
  }
}

validateSectionOrder(
  errors,
  path.join('src', 'components', 'application-block-showcase', 'application-block-docs-page.tsx'),
  'Application blocks',
);
validateSectionOrder(
  errors,
  path.join('src', 'components', 'source-block-showcase', 'source-block-docs-page.tsx'),
  'Source blocks',
);
validateSectionOrder(
  errors,
  path.join('src', 'app', 'blocks', 'command-palette', 'page.tsx'),
  'Command Palette',
);
validateSectionOrder(
  errors,
  path.join('src', 'app', 'blocks', 'ai', 'page.tsx'),
  'AI',
);

const applicationBlockNames = APPLICATION_BLOCKS.map(({ name }) => name);
if (
  APPLICATION_BLOCKS.length !== 2 ||
  new Set(applicationBlockNames).size !== APPLICATION_BLOCKS.length
) {
  errors.push('Application-block docs must contain exactly two unique entries');
}

for (const block of APPLICATION_BLOCKS) {
  for (const relativePath of [
    path.join('src', 'app', 'blocks', block.name, 'page.tsx'),
    path.join('src', 'app', 'blocks', block.name, 'preview', 'page.tsx'),
  ]) {
    if (!fs.existsSync(path.join(appDirectory, relativePath))) {
      errors.push(`${block.name}: missing application-block route ${relativePath}`);
    }
  }

  if (
    block.whenToUse.length < 2 ||
    isEmpty(block.composition) ||
    isEmpty(block.accessibility) ||
    isEmpty(block.api) ||
    !block.usage.description ||
    !block.usage.example ||
    !block.state.description ||
    !block.previewDescription ||
    block.previewHeight < 480
  ) {
    errors.push(`${block.name}: application-block docs are missing required editorial coverage`);
  }
}

const orgChartDoc = APPLICATION_BLOCKS.find(({ name }) => name === 'org-chart');
for (const requiredSource of [
  'type CompanyOrgChartProps',
  'saveReportingLine:',
  'openPositionEditor:',
  'openRemovalConfirmation:',
  '}: CompanyOrgChartProps)',
  'positionTitle: preserve.positionTitle',
]) {
  if (!orgChartDoc?.usage.example.includes(requiredSource)) {
    errors.push(`org-chart: basic usage is missing injected host callback ${requiredSource}`);
  }
}

const storageBrowserDoc = APPLICATION_BLOCKS.find(
  ({ name }) => name === 'storage-browser',
);
for (const requiredSource of [
  'useMemo',
  'const visibleObjects',
  'object.bucketId !== bucketId',
  'compareObjects(left, right, sort)',
  'objects={visibleObjects}',
  'onBulkDelete={actions.confirmDelete}',
  'onDelete={(object) => actions.confirmDelete([object.id])}',
]) {
  if (!storageBrowserDoc?.usage.example.includes(requiredSource)) {
    errors.push(`storage-browser: basic usage is missing ${requiredSource}`);
  }
}
if (storageBrowserDoc?.usage.example.includes('onEmptyStateAction=')) {
  errors.push(
    'storage-browser: basic usage must not route every empty-state action to one workflow',
  );
}

const sourceBlockNames = SOURCE_BLOCKS.map(({ name }) => name);
if (
  JSON.stringify(sourceBlockNames) !== JSON.stringify(['sheets', 'schema-builder']) ||
  new Set(sourceBlockNames).size !== SOURCE_BLOCKS.length
) {
  errors.push('Source-block docs must contain Sheets and Schema Builder in navigation order');
}

const applicationDocIds = APPLICATION_DOC_SEQUENCE.map(({ id }) => id);
const expectedApplicationDocIds = [
  'org-chart',
  'storage-browser',
  'sheets',
  'schema-builder',
  'console-kit',
];
if (
  JSON.stringify(applicationDocIds) !== JSON.stringify(expectedApplicationDocIds) ||
  new Set(applicationDocIds).size !== APPLICATION_DOC_SEQUENCE.length
) {
  errors.push('Application documentation pagination must follow the canonical sidebar sequence');
}

const componentDocIds = COMPONENT_DOC_SEQUENCE.map(({ id }) => id);
const expectedComponentDocIds = BASE_PRIMITIVES.map(({ name }) => name) as string[];
const dialogIndex = expectedComponentDocIds.indexOf('dialog');
expectedComponentDocIds.splice(dialogIndex, 0, 'command-palette', 'ai');
if (
  JSON.stringify(componentDocIds) !== JSON.stringify(expectedComponentDocIds) ||
  new Set(componentDocIds).size !== COMPONENT_DOC_SEQUENCE.length
) {
  errors.push('Component documentation pagination must include Command Palette and AI in sidebar order');
}

for (const block of SOURCE_BLOCKS) {
  for (const relativePath of [
    path.join('src', 'app', 'blocks', block.name, 'page.tsx'),
    path.join('src', 'app', 'blocks', block.name, 'preview', 'page.tsx'),
  ]) {
    if (!fs.existsSync(path.join(appDirectory, relativePath))) {
      errors.push(`${block.name}: missing source-block route ${relativePath}`);
    }
  }

  if (
    block.whenToUse.length < 2 ||
    isEmpty(block.composition) ||
    isEmpty(block.accessibility) ||
    isEmpty(block.api) ||
    !block.usage.description ||
    !block.usage.example ||
    !block.state.description ||
    !block.state.actionGuidance ||
    !block.previewDescription ||
    block.previewHeight < 480
  ) {
    errors.push(`${block.name}: source-block docs are missing required editorial coverage`);
  }
}

const sheetsDoc = SOURCE_BLOCKS.find(({ name }) => name === 'sheets');
const sheetsSupportingSource = sheetsDoc?.usage.supportingExamples
  ?.map(({ source }) => source)
  .join('\n') ?? '';
if (
  !sheetsDoc?.usage.example.includes('<SheetsProvider') ||
  !sheetsDoc.usage.example.includes('<Sheets') ||
  !sheetsDoc.usage.example.includes('min-h-0') ||
  !sheetsSupportingSource.includes('<PortalRoot') ||
  !sheetsSupportingSource.includes("@/components/ui/portal")
) {
  errors.push('sheets: basic usage must include the provider, grid, and shared PortalRoot setup');
}

const schemaBuilderDoc = SOURCE_BLOCKS.find(({ name }) => name === 'schema-builder');
for (const requiredSource of [
  'QueryClientProvider',
  'adapter={adapter}',
  'scope={scope}',
  'colorMode={colorMode}',
  'activeTab={activeTab}',
  'onActiveTabChange={setActiveTab}',
  'preferences={preferences}',
  'onPreferencesChange={setPreferences}',
  'min-h-0',
]) {
  if (!schemaBuilderDoc?.usage.example.includes(requiredSource)) {
    errors.push(`schema-builder: basic usage is missing ${requiredSource}`);
  }
}

const sourcePreview = fs.readFileSync(
  path.join(appDirectory, 'src', 'components', 'source-block-showcase', 'source-block-showcase-canvas.tsx'),
  'utf8',
);
for (const expectedSource of [
  "from '@constructive-io/schema-builder'",
  "from '@constructive-io/sheets'",
  '<SchemaBuilder',
  '<Sheets',
]) {
  if (!sourcePreview.includes(expectedSource)) {
    errors.push(`Source-block live preview is missing ${expectedSource}`);
  }
}

if (
  COMMAND_PALETTE_DOC.whenToUse.length < 2 ||
  isEmpty(COMMAND_PALETTE_DOC.state.guidance) ||
  isEmpty(COMMAND_PALETTE_DOC.composition.boundaries) ||
  isEmpty(COMMAND_PALETTE_DOC.accessibility) ||
  isEmpty(COMMAND_PALETTE_DOC.api) ||
  !COMMAND_PALETTE_DOC.usage.example.includes('useBackgroundTasks') ||
  !COMMAND_PALETTE_DOC.usage.example.includes('backgroundTasks={backgroundTasks}') ||
  !COMMAND_PALETTE_DOC.composition.pageCommandsExample.includes('usePageCommands')
) {
  errors.push('command-palette: docs are missing required editorial or integration coverage');
}

if (
  AI_DOC.whenToUse.length < 2 ||
  isEmpty(AI_DOC.state.guidance) ||
  isEmpty(AI_DOC.composition.boundaries) ||
  isEmpty(AI_DOC.accessibility) ||
  isEmpty(AI_DOC.api) ||
  !AI_DOC.usage.example.includes('PromptInput') ||
  !AI_DOC.usage.example.includes('PlanTracker') ||
  !AI_DOC.npmImport.includes("@constructive-io/ui/ai") ||
  !fs.existsSync(path.join(appDirectory, 'src', 'app', 'blocks', 'ai', 'page.tsx')) ||
  !fs.existsSync(
    path.join(appDirectory, 'src', 'components', 'ai-showcase', 'ai-showcase-demo.tsx'),
  )
) {
  errors.push('ai: docs are missing required editorial or showcase coverage');
}

const aiPage = fs.readFileSync(
  path.join(appDirectory, 'src', 'app', 'blocks', 'ai', 'page.tsx'),
  'utf8',
);
const aiShowcase = fs.readFileSync(
  path.join(appDirectory, 'src', 'components', 'ai-showcase', 'ai-showcase-demo.tsx'),
  'utf8',
);
for (const expected of [
  "from '@constructive-io/ui/ai'",
  'AiShowcaseDemo',
  'registryAdd(doc.kitName)',
  'PromptInput',
  'Tool',
  'PlanTracker',
  'ApprovalCard',
  'DiffTable',
]) {
  if (!`${aiPage}\n${aiShowcase}`.includes(expected)) {
    errors.push(`ai: docs or showcase is missing ${expected}`);
  }
}

const commandPaletteApi = COMMAND_PALETTE_DOC.api
  .flatMap(({ name }) => name.split(' / ').map((property) => property.trim()))
  .sort();
const expectedCommandPaletteApi = [
  'backgroundTasks',
  'label',
  'navigate',
  'onOpenChange',
  'open',
  'placeholder',
  'registry',
  'shortcut',
].sort();
if (JSON.stringify(commandPaletteApi) !== JSON.stringify(expectedCommandPaletteApi)) {
  errors.push('command-palette: API Reference must match CommandPaletteProps');
}

const appPackage = readJson<PackageManifest>(path.join(appDirectory, 'package.json'));
if (appPackage.devDependencies?.shadcn !== '4.13.1') {
  errors.push('apps/blocks must pin shadcn to 4.13.1');
}

const firstPartyMjs = collectFiles(repositoryRoot).filter(
  (file) => file.endsWith('.mjs') && !file.includes(`${path.sep}node_modules${path.sep}`),
);
for (const file of firstPartyMjs) {
  errors.push(`${path.relative(repositoryRoot, file)}: first-party .mjs files are not allowed`);
}

if (errors.length > 0) {
  throw new Error(`Blocks docs contract failed:\n- ${errors.join('\n- ')}`);
}

console.log('Blocks docs expose exactly 29 source-checked primitive references.');
console.log('Feature-pack docs expose seven manifest-aligned live references.');
console.log(
  'Application docs expose two composed blocks and two package-backed source blocks.',
);
console.log('Component docs include Command Palette and AI in the canonical component sequence.');
console.log('Every checked docs family has complete integration, state, accessibility, and API-last coverage.');
console.log('Public docs use pnpm dlx shadcn@latest for every shadcn CLI command.');

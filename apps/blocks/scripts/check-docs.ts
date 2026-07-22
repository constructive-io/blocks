import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { PRIMITIVE_DOCS } from '../src/content/ui';
import { FEATURE_PACK_IDS, FEATURE_PACK_MANIFESTS } from '../src/feature-packs';
import { UI_DEMO_SOURCE } from '../src/generated/ui-demo-source';
import { BASE_PRIMITIVES, packageImport, type BasePrimitiveName } from '../src/lib/base-primitives';
import { packageCommands, registryCommands } from '../src/lib/install-mode';
import { FEATURE_PACK_DOCS } from '../src/lib/feature-packs';
import { PRIMITIVE_DOC_SECTION_ORDER, type PrimitiveApiPart } from '../src/lib/primitive-docs';

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

function collectFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.next' || entry.name === 'node_modules' || entry.name === 'out') return [];
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  });
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
  if (!shadcnCommands.some(({ code }) => code === `pnpm dlx shadcn@4.13.1 add @constructive/${primitive.name}`)) {
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
  'Every page has complete examples, dual install paths, state guidance, accessibility, and API-last coverage.',
);

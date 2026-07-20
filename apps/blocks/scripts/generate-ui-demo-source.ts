import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const scriptFile = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptFile);
const appDirectory = path.resolve(scriptDirectory, '..');

export const DEFAULT_DEMO_DIRECTORY = path.join(appDirectory, 'src', 'components', 'docs', 'demos');
export const DEFAULT_OUTPUT_FILE = path.join(appDirectory, 'src', 'generated', 'ui-demo-source.ts');
export const DEFAULT_TSCONFIG_FILE = path.join(appDirectory, 'tsconfig.json');

const DEMO_FILE_PATTERN = /^ui-(.+)\.demo\.tsx$/;
const DOCS_SHOWCASE_MODULE = '@/components/docs/showcase-kit';
const UI_PACKAGE_PREFIX = '@constructive-io/ui/';
const REGISTRY_UI_PREFIX = '@/components/ui/';

export type DemoSourceVariants = {
  npm: string;
  registry: string;
};

export type DemoSourceManifest = Record<string, Record<string, DemoSourceVariants>>;

type ExtractOptions = {
  demoDirectory?: string;
  tsconfigFile?: string;
};

type ExportedDemo = {
  declaration: ts.Statement;
  exportDeclaration?: ts.ExportDeclaration;
  exportName: string;
  exportSpecifier?: ts.ExportSpecifier;
};

type SourceIndex = {
  docsDemoSymbols: Set<ts.Symbol>;
  importBySymbol: Map<ts.Symbol, ts.ImportDeclaration>;
  statementBySymbol: Map<ts.Symbol, ts.Statement>;
};

function normalizePath(file: string): string {
  return path.resolve(file);
}

function getDemoFiles(directory: string): Array<{ file: string; slug: string }> {
  if (!fs.existsSync(directory)) {
    throw new Error(`UI demo directory does not exist: ${directory}`);
  }

  const demos = fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (!entry.isFile()) return [];
      const match = entry.name.match(DEMO_FILE_PATTERN);
      return match ? [{ file: path.join(directory, entry.name), slug: match[1] }] : [];
    })
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.file.localeCompare(b.file));

  const duplicateSlugs = demos.filter((demo, index) => demos[index - 1]?.slug === demo.slug);
  if (duplicateSlugs.length > 0) {
    throw new Error(`Duplicate UI demo slugs: ${duplicateSlugs.map(({ slug }) => slug).join(', ')}`);
  }
  if (demos.length === 0) {
    throw new Error(`No ui-*.demo.tsx files found under ${directory}`);
  }

  return demos;
}

function readCompilerOptions(tsconfigFile: string): ts.CompilerOptions {
  const config = ts.readConfigFile(tsconfigFile, ts.sys.readFile);
  if (config.error) {
    throw new Error(formatDiagnostics([config.error]));
  }

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(tsconfigFile), undefined, tsconfigFile);
  if (parsed.errors.length > 0) {
    throw new Error(formatDiagnostics(parsed.errors));
  }

  return {
    ...parsed.options,
    composite: false,
    incremental: false,
    noEmit: true,
    tsBuildInfoFile: undefined,
  };
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  });
}

function assertProgramIsValid(program: ts.Program, sourceFiles: readonly ts.SourceFile[]): void {
  const diagnostics = sourceFiles.flatMap((sourceFile) => [
    ...program.getSyntacticDiagnostics(sourceFile),
    ...program.getSemanticDiagnostics(sourceFile),
  ]);

  if (diagnostics.length > 0) {
    throw new Error(`UI demo source extraction failed type validation:\n${formatDiagnostics(diagnostics)}`);
  }
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false);
}

function isNamedExport(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.ExportKeyword) && !hasModifier(node, ts.SyntaxKind.DefaultKeyword);
}

function isComponentName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function symbolForName(checker: ts.TypeChecker, name: ts.Identifier): ts.Symbol | undefined {
  return checker.getSymbolAtLocation(name);
}

function addBindingName(
  checker: ts.TypeChecker,
  name: ts.BindingName,
  statement: ts.Statement,
  statementBySymbol: Map<ts.Symbol, ts.Statement>,
): void {
  if (ts.isIdentifier(name)) {
    const symbol = symbolForName(checker, name);
    if (symbol) statementBySymbol.set(symbol, statement);
    return;
  }

  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) addBindingName(checker, element.name, statement, statementBySymbol);
  }
}

function indexSourceFile(sourceFile: ts.SourceFile, checker: ts.TypeChecker): SourceIndex {
  const docsDemoSymbols = new Set<ts.Symbol>();
  const importBySymbol = new Map<ts.Symbol, ts.ImportDeclaration>();
  const statementBySymbol = new Map<ts.Symbol, ts.Statement>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (!clause) continue;

      if (clause.name) {
        const symbol = symbolForName(checker, clause.name);
        if (symbol) importBySymbol.set(symbol, statement);
      }
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        const symbol = symbolForName(checker, clause.namedBindings.name);
        if (symbol) importBySymbol.set(symbol, statement);
      }
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const specifier of clause.namedBindings.elements) {
          const symbol = symbolForName(checker, specifier.name);
          if (symbol) {
            importBySymbol.set(symbol, statement);
            if (
              ts.isStringLiteral(statement.moduleSpecifier) &&
              statement.moduleSpecifier.text === DOCS_SHOWCASE_MODULE &&
              (specifier.propertyName?.text ?? specifier.name.text) === 'Demo'
            ) {
              docsDemoSymbols.add(symbol);
            }
          }
        }
      }
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        addBindingName(checker, declaration.name, statement, statementBySymbol);
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        ts.isModuleDeclaration(statement)) &&
      statement.name &&
      ts.isIdentifier(statement.name)
    ) {
      const symbol = symbolForName(checker, statement.name);
      if (symbol) statementBySymbol.set(symbol, statement);
    }
  }

  return { docsDemoSymbols, importBySymbol, statementBySymbol };
}

function isCallableSymbol(checker: ts.TypeChecker, symbol: ts.Symbol, location: ts.Node): boolean {
  const type = checker.getTypeOfSymbolAtLocation(symbol, location);
  return type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0;
}

function exportedVariableDemos(
  statement: ts.VariableStatement,
  checker: ts.TypeChecker,
): ExportedDemo[] {
  if (!isNamedExport(statement)) return [];

  return statement.declarationList.declarations.flatMap((declaration) => {
    if (!ts.isIdentifier(declaration.name) || !isComponentName(declaration.name.text)) return [];
    const symbol = symbolForName(checker, declaration.name);
    if (!symbol || !isCallableSymbol(checker, symbol, declaration.name)) return [];
    return [{ declaration: statement, exportName: declaration.name.text }];
  });
}

function localExportTarget(checker: ts.TypeChecker, specifier: ts.ExportSpecifier): ts.Symbol | undefined {
  const checkerWithExportTarget = checker as ts.TypeChecker & {
    getExportSpecifierLocalTargetSymbol?: (node: ts.ExportSpecifier) => ts.Symbol | undefined;
  };
  return (
    checkerWithExportTarget.getExportSpecifierLocalTargetSymbol?.(specifier) ??
    checker.getSymbolAtLocation(specifier.propertyName ?? specifier.name)
  );
}

function discoverExportedDemos(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  index: SourceIndex,
): ExportedDemo[] {
  const demos: ExportedDemo[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && isNamedExport(statement)) {
      const symbol = symbolForName(checker, statement.name);
      if (isComponentName(statement.name.text) && symbol && isCallableSymbol(checker, symbol, statement.name)) {
        demos.push({ declaration: statement, exportName: statement.name.text });
      }
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name && isNamedExport(statement)) {
      const symbol = symbolForName(checker, statement.name);
      if (isComponentName(statement.name.text) && symbol && isCallableSymbol(checker, symbol, statement.name)) {
        demos.push({ declaration: statement, exportName: statement.name.text });
      }
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      demos.push(...exportedVariableDemos(statement, checker));
      continue;
    }

    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause) {
      if (!ts.isNamedExports(statement.exportClause)) continue;
      for (const specifier of statement.exportClause.elements) {
        if (specifier.isTypeOnly || !isComponentName(specifier.name.text)) continue;
        const symbol = localExportTarget(checker, specifier);
        const declaration = symbol ? index.statementBySymbol.get(symbol) : undefined;
        if (!symbol || !declaration || !isCallableSymbol(checker, symbol, specifier)) continue;
        demos.push({
          declaration,
          exportDeclaration: statement,
          exportName: specifier.name.text,
          exportSpecifier: specifier,
        });
      }
    }
  }

  demos.sort((a, b) => a.exportName.localeCompare(b.exportName));
  for (let index = 1; index < demos.length; index += 1) {
    if (demos[index - 1]?.exportName === demos[index]?.exportName) {
      throw new Error(`${sourceFile.fileName}: duplicate named demo export '${demos[index].exportName}'`);
    }
  }
  if (demos.length === 0) {
    throw new Error(`${sourceFile.fileName}: expected at least one named exported React demo component`);
  }

  return demos;
}

function dependencyClosure(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  index: SourceIndex,
  root: ts.Statement,
): { imports: Set<ts.Symbol>; statements: Set<ts.Statement> } {
  const imports = new Set<ts.Symbol>();
  const statements = new Set<ts.Statement>();
  const pending = [root];

  while (pending.length > 0) {
    const statement = pending.pop();
    if (!statement || statements.has(statement)) continue;
    statements.add(statement);

    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        if (symbol) {
          if (index.importBySymbol.has(symbol) && !index.docsDemoSymbols.has(symbol)) imports.add(symbol);
          const dependency = index.statementBySymbol.get(symbol);
          if (dependency && !statements.has(dependency)) pending.push(dependency);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(statement);
  }

  return { imports, statements };
}

function isDocsDemoElement(node: ts.JsxElement, checker: ts.TypeChecker, index: SourceIndex): boolean {
  const tagName = node.openingElement.tagName;
  if (!ts.isIdentifier(tagName)) return false;
  const symbol = checker.getSymbolAtLocation(tagName);
  return symbol ? index.docsDemoSymbols.has(symbol) : false;
}

function withoutOuterWhitespace(children: readonly ts.JsxChild[]): ts.JsxChild[] {
  let start = 0;
  let end = children.length;
  while (start < end) {
    const child = children[start];
    if (!ts.isJsxText(child) || child.text.trim().length > 0) break;
    start += 1;
  }
  while (end > start) {
    const child = children[end - 1];
    if (!ts.isJsxText(child) || child.text.trim().length > 0) break;
    end -= 1;
  }
  return children.slice(start, end);
}

function unwrapDocsDemo(statement: ts.Statement, checker: ts.TypeChecker, index: SourceIndex): ts.Statement {
  if (index.docsDemoSymbols.size === 0) return statement;

  const result = ts.transform(statement, [
    (context) => {
      const visit: ts.Visitor = (node) => {
        if (ts.isJsxElement(node) && isDocsDemoElement(node, checker, index)) {
          const children = withoutOuterWhitespace(
            node.children.map((child) => ts.visitNode(child, visit) as ts.JsxChild),
          );
          if (children.length === 1) {
            const child = children[0];
            if (ts.isJsxExpression(child) && child.expression) return child.expression;
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) return child;
          }
          return ts.factory.createJsxFragment(
            ts.factory.createJsxOpeningFragment(),
            children,
            ts.factory.createJsxJsxClosingFragment(),
          );
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (root) => ts.visitNode(root, visit) as ts.Statement;
    },
  ]);

  const transformed = result.transformed[0] as ts.Statement;
  result.dispose();
  return transformed;
}

function isDirective(statement: ts.Statement): boolean {
  return ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);
}

function selectedImport(
  statement: ts.ImportDeclaration,
  checker: ts.TypeChecker,
  selectedSymbols: ReadonlySet<ts.Symbol>,
  registry: boolean,
): ts.ImportDeclaration | undefined {
  let clause = statement.importClause;
  if (clause) {
    const defaultImport =
      clause.name && selectedSymbols.has(checker.getSymbolAtLocation(clause.name) as ts.Symbol)
        ? clause.name
        : undefined;

    let namedBindings: ts.NamedImportBindings | undefined;
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      const symbol = checker.getSymbolAtLocation(clause.namedBindings.name);
      if (symbol && selectedSymbols.has(symbol)) namedBindings = clause.namedBindings;
    } else if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      const elements = clause.namedBindings.elements.filter((specifier) => {
        const symbol = checker.getSymbolAtLocation(specifier.name);
        return symbol ? selectedSymbols.has(symbol) : false;
      });
      if (elements.length > 0) namedBindings = ts.factory.updateNamedImports(clause.namedBindings, elements);
    }

    if (!defaultImport && !namedBindings) return undefined;
    clause = ts.factory.updateImportClause(clause, clause.isTypeOnly, defaultImport, namedBindings);
  }

  let moduleSpecifier = statement.moduleSpecifier;
  if (registry && ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text.startsWith(UI_PACKAGE_PREFIX)) {
    const subpath = moduleSpecifier.text.slice(UI_PACKAGE_PREFIX.length);
    if (subpath.length > 0) moduleSpecifier = ts.factory.createStringLiteral(`${REGISTRY_UI_PREFIX}${subpath}`);
  }

  return ts.factory.updateImportDeclaration(
    statement,
    statement.modifiers,
    clause,
    moduleSpecifier,
    statement.attributes,
  );
}

function selectedExportDeclaration(demo: ExportedDemo): ts.ExportDeclaration | undefined {
  const statement = demo.exportDeclaration;
  const specifier = demo.exportSpecifier;
  if (!statement || !specifier || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) return undefined;

  return ts.factory.updateExportDeclaration(
    statement,
    statement.modifiers,
    statement.isTypeOnly,
    ts.factory.updateNamedExports(statement.exportClause, [specifier]),
    statement.moduleSpecifier,
    statement.attributes,
  );
}

function printSnippet(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  demo: ExportedDemo,
  registry: boolean,
): string {
  const index = indexSourceFile(sourceFile, checker);
  const closure = dependencyClosure(sourceFile, checker, index, demo.declaration);
  const exportDeclaration = selectedExportDeclaration(demo);
  const statements: ts.Statement[] = [];

  let inDirectivePrologue = true;
  for (const statement of sourceFile.statements) {
    if (inDirectivePrologue && isDirective(statement)) {
      statements.push(statement);
      continue;
    }
    inDirectivePrologue = false;

    if (ts.isImportDeclaration(statement)) {
      const included = selectedImport(statement, checker, closure.imports, registry);
      if (included) statements.push(included);
      continue;
    }
    if (closure.statements.has(statement)) statements.push(unwrapDocsDemo(statement, checker, index));
    if (statement === demo.exportDeclaration && exportDeclaration) statements.push(exportDeclaration);
  }

  if (!closure.statements.has(demo.declaration)) {
    throw new Error(`${sourceFile.fileName}: failed to include declaration for '${demo.exportName}'`);
  }

  const snippetFile = ts.factory.updateSourceFile(sourceFile, statements);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
  const output = printer.printFile(snippetFile).trim();
  if (!output) throw new Error(`${sourceFile.fileName}: generated an empty example for '${demo.exportName}'`);

  const parsed = ts.createSourceFile('example.tsx', output, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const parseDiagnostics = (
    parsed as ts.SourceFile & { parseDiagnostics: readonly ts.DiagnosticWithLocation[] }
  ).parseDiagnostics;
  if (parseDiagnostics.length > 0) {
    throw new Error(
      `${sourceFile.fileName}: generated invalid TypeScript for '${demo.exportName}':\n${formatDiagnostics(parseDiagnostics)}`,
    );
  }

  return `${output}\n`;
}

export function extractUiDemoSource(options: ExtractOptions = {}): DemoSourceManifest {
  const demoDirectory = normalizePath(options.demoDirectory ?? DEFAULT_DEMO_DIRECTORY);
  const tsconfigFile = normalizePath(options.tsconfigFile ?? DEFAULT_TSCONFIG_FILE);
  const demos = getDemoFiles(demoDirectory);
  const compilerOptions = readCompilerOptions(tsconfigFile);
  const program = ts.createProgram({ rootNames: demos.map(({ file }) => file), options: compilerOptions });
  const checker = program.getTypeChecker();
  const sourceFiles = demos.map(({ file }) => {
    const sourceFile = program.getSourceFile(normalizePath(file));
    if (!sourceFile) throw new Error(`TypeScript did not load UI demo: ${file}`);
    return sourceFile;
  });

  assertProgramIsValid(program, sourceFiles);

  const manifest: DemoSourceManifest = {};
  demos.forEach(({ slug }, index) => {
    const sourceFile = sourceFiles[index];
    const sourceIndex = indexSourceFile(sourceFile, checker);
    const exports = discoverExportedDemos(sourceFile, checker, sourceIndex);
    manifest[slug] = Object.fromEntries(
      exports.map((demo) => [
        demo.exportName,
        {
          npm: printSnippet(sourceFile, checker, demo, false),
          registry: printSnippet(sourceFile, checker, demo, true),
        },
      ]),
    );
  });

  return manifest;
}

export function renderUiDemoSourceModule(manifest: DemoSourceManifest): string {
  const serialized = JSON.stringify(manifest, null, 2);
  return `// Generated by apps/blocks/scripts/generate-ui-demo-source.ts.\n// Do not edit this file directly.\n\nexport type UiDemoSourceVariants = {\n  npm: string;\n  registry: string;\n};\n\nexport const UI_DEMO_SOURCE = ${serialized} as const satisfies Record<\n  string,\n  Record<string, UiDemoSourceVariants>\n>;\n\nexport type UiDemoSourceSlug = keyof typeof UI_DEMO_SOURCE;\n`;
}

export function generateUiDemoSource(options: ExtractOptions = {}): string {
  return renderUiDemoSourceModule(extractUiDemoSource(options));
}

export function runGenerator(args = process.argv.slice(2)): void {
  const unknownArguments = args.filter((argument) => argument !== '--check');
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown UI demo source generator arguments: ${unknownArguments.join(', ')}`);
  }

  const expected = generateUiDemoSource();
  const check = args.includes('--check');
  const current = fs.existsSync(DEFAULT_OUTPUT_FILE) ? fs.readFileSync(DEFAULT_OUTPUT_FILE, 'utf8') : undefined;

  if (check) {
    if (current !== expected) {
      throw new Error(
        'Generated UI demo source is stale. Run `tsx apps/blocks/scripts/generate-ui-demo-source.ts` and review the result.',
      );
    }
    console.log('Generated UI demo source is current.');
    return;
  }

  if (current === expected) {
    console.log('Generated UI demo source is already current.');
    return;
  }

  fs.mkdirSync(path.dirname(DEFAULT_OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(DEFAULT_OUTPUT_FILE, expected);
  console.log(`Generated ${path.relative(process.cwd(), DEFAULT_OUTPUT_FILE)}.`);
}

if (process.argv[1] && normalizePath(process.argv[1]) === normalizePath(scriptFile)) {
  runGenerator();
}

import { spawn } from 'node:child_process';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { isAbsolute, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertNativeFixtureManifest,
  cleanupNativeFixture,
  provisionNativeFixture,
  type NativeFixtureDatabase,
  type NativeFixtureManifest,
  type SqlRequest
} from '../e2e-live/native-fixture';

type Command = 'provision' | 'cleanup' | 'run';

export type NativeFixtureCliOptions = Readonly<{
  command: Command;
  constructiveDbPath?: string;
  platformDatabase: string;
  manifestPath: string;
  graphqlOrigin: string;
  domain: string;
  host: string;
  port: number;
  user: string;
  keep: boolean;
  childCommand: readonly string[];
}>;

type FixtureEnvironment = Readonly<Record<string, string | undefined>>;

const HELP = `
Constructive Console Kit native tenant fixture

Usage:
  pnpm fixture:console-kit provision --constructive-db /abs/path/constructive-db --database NAME [options]
  pnpm fixture:console-kit cleanup --database NAME --manifest /abs/path/manifest.json [options]
  pnpm fixture:console-kit run --constructive-db /abs/path/constructive-db --database NAME [options] -- COMMAND

Required:
  --constructive-db PATH   Constructive DB repository root (provision/run)
  --database, --db NAME   Platform database passed to fun up --local --db NAME

Options:
  --manifest PATH         Exact-ID journal (default: .local/console-kit-native-fixture.json)
  --graphql-origin URL    Public GraphQL origin (default: http://localhost:6464)
  --domain DOMAIN         Tenant root domain (default: localhost)
  --host HOST             PostgreSQL host (default: PGHOST or localhost)
  --port PORT             PostgreSQL port (default: PGPORT or 5432)
  --user USER             PostgreSQL user (default: PGUSER or postgres)
  --keep                  Keep tenants after run, and keep partial tenants after provision failure
  --help                  Show this help

The password is read from PGPASSWORD, with fun up's local default of "password".
`;

function optionValue(args: readonly string[], index: number, name: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return value;
}

function positivePort(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error('--port must be an integer from 1 through 65535.');
  }
  return parsed;
}

export function parseNativeFixtureCliArgs(
  argv: readonly string[],
  cwd = process.cwd(),
  env: FixtureEnvironment = process.env
): NativeFixtureCliOptions {
  const command = argv[0];
  if (command === '--help' || command === '-h') {
    throw Object.assign(new Error(HELP.trim()), { help: true });
  }
  if (command !== 'provision' && command !== 'cleanup' && command !== 'run') {
    throw new Error('Expected a fixture command: provision, cleanup, or run.');
  }

  let constructiveDbPath: string | undefined;
  let platformDatabase = '';
  let manifestPath = resolve(cwd, '.local/console-kit-native-fixture.json');
  let graphqlOrigin = `http://localhost:${env.GRAPHQL_PORT || '6464'}`;
  let domain = 'localhost';
  let host = env.PGHOST || 'localhost';
  let port = positivePort(env.PGPORT || '5432');
  let user = env.PGUSER || 'postgres';
  let keep = false;
  let childCommand: readonly string[] = [];

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === '--') {
      childCommand = argv.slice(index + 1);
      break;
    }
    if (argument === '--help' || argument === '-h') {
      throw Object.assign(new Error(HELP.trim()), { help: true });
    }
    if (argument === '--keep') {
      keep = true;
      continue;
    }
    if (argument === '--constructive-db') {
      constructiveDbPath = optionValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === '--database' || argument === '--db') {
      platformDatabase = optionValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === '--manifest') {
      manifestPath = optionValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === '--graphql-origin') {
      graphqlOrigin = optionValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === '--domain') {
      domain = optionValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === '--host') {
      host = optionValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === '--port') {
      port = positivePort(optionValue(argv, index, argument));
      index += 1;
      continue;
    }
    if (argument === '--user') {
      user = optionValue(argv, index, argument);
      index += 1;
      continue;
    }
    throw new Error(`Unknown fixture option: ${argument}`);
  }

  if (!platformDatabase) throw new Error('--database is required and must match fun up --db.');
  if ((command === 'provision' || command === 'run') && !constructiveDbPath) {
    throw new Error('--constructive-db is required for provision and run.');
  }
  if (constructiveDbPath && !isAbsolute(constructiveDbPath)) {
    throw new Error('--constructive-db must be an absolute path.');
  }
  if (!isAbsolute(manifestPath)) manifestPath = resolve(cwd, manifestPath);
  const parsedOrigin = new URL(graphqlOrigin);
  if (parsedOrigin.origin !== graphqlOrigin.replace(/\/$/u, '')) {
    throw new Error('--graphql-origin must contain only a scheme, host, and optional port.');
  }
  if (command === 'run' && childCommand.length === 0) {
    throw new Error('run requires a command after --.');
  }
  if (command !== 'run' && childCommand.length > 0) {
    throw new Error('Only run accepts a command after --.');
  }

  return {
    command,
    constructiveDbPath,
    platformDatabase,
    manifestPath,
    graphqlOrigin: parsedOrigin.origin,
    domain,
    host,
    port,
    user,
    keep,
    childCommand
  };
}

type PsqlOptions = Pick<NativeFixtureCliOptions, 'platformDatabase' | 'host' | 'port' | 'user'>;

async function psql(
  options: PsqlOptions,
  request: SqlRequest,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const args = [
    '--host', options.host,
    '--port', String(options.port),
    '--username', options.user,
    '--dbname', options.platformDatabase,
    '--no-psqlrc',
    '--quiet',
    '--tuples-only',
    '--no-align',
    '--set=ON_ERROR_STOP=1',
    ...Object.entries(request.variables ?? {}).map(([name, value]) => `--set=${name}=${value}`)
  ];

  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn('psql', args, {
      env: { ...env, PGPASSWORD: env.PGPASSWORD || 'password' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      const output = Buffer.concat(stdout).toString('utf8').trim();
      const errorOutput = Buffer.concat(stderr).toString('utf8').trim();
      if (code !== 0) {
        reject(new Error(`psql exited with ${code}: ${errorOutput || 'unknown PostgreSQL error'}`));
        return;
      }
      resolvePromise(output);
    });
    child.stdin.end(`${request.sql.trim()}\n`);
  });
}

export class PsqlNativeFixtureDatabase implements NativeFixtureDatabase {
  constructor(private readonly options: PsqlOptions) {}

  async json<T>(request: SqlRequest): Promise<T> {
    const output = await psql(this.options, request);
    if (!output) throw new Error('The PostgreSQL fixture query returned no JSON.');
    try {
      return JSON.parse(output) as T;
    } catch (error) {
      throw new Error(`The PostgreSQL fixture query returned invalid JSON: ${output}`, { cause: error });
    }
  }

  async execute(request: SqlRequest): Promise<void> {
    await psql(this.options, request);
  }
}

export async function writeNativeFixtureManifest(
  path: string,
  manifest: NativeFixtureManifest
): Promise<void> {
  assertNativeFixtureManifest(manifest);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, path);
  await chmod(path, 0o600);
}

export async function readNativeFixtureManifest(path: string): Promise<NativeFixtureManifest> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  assertNativeFixtureManifest(value);
  return value;
}

export async function assertNativeFixtureManifestSlotAvailable(path: string): Promise<void> {
  try {
    const existing = await readNativeFixtureManifest(path);
    if (existing.status !== 'cleaned') {
      throw new Error(
        `Manifest ${path} still owns ${existing.databaseIds.length} tenant database ID(s). ` +
          'Run cleanup or choose a different --manifest path before provisioning again.'
      );
    }
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }
}

async function spawnCommand(command: readonly string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise<number>((resolvePromise, reject) => {
    const child = spawn(command[0]!, command.slice(1), { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`Fixture command was terminated by ${signal}.`));
        return;
      }
      resolvePromise(code ?? 1);
    });
  });
}

function printReady(manifestPath: string, manifest: NativeFixtureManifest): void {
  console.log(`Native tenant fixture ready: ${manifestPath}`);
  for (const tenant of manifest.tenants) {
    console.log(`  ${tenant.profile.padEnd(16)} ${tenant.database.id}`);
  }
  console.log(`  export CONSOLE_KIT_TENANT_MANIFEST=${manifestPath}`);
  console.log('  pnpm fixture:console-kit cleanup --database ' +
    `${manifest.platformDatabase} --manifest ${manifestPath}`);
}

export async function runNativeFixtureCli(options: NativeFixtureCliOptions): Promise<number> {
  const database = new PsqlNativeFixtureDatabase(options);

  if (options.command === 'cleanup') {
    const manifest = await readNativeFixtureManifest(options.manifestPath);
    if (manifest.platformDatabase !== options.platformDatabase) {
      throw new Error(
        `Manifest targets ${manifest.platformDatabase}, not ${options.platformDatabase}; cleanup refused.`
      );
    }
    const cleaned = await cleanupNativeFixture(database, manifest);
    await writeNativeFixtureManifest(options.manifestPath, cleaned);
    console.log(`Cleaned ${cleaned.databaseIds.length} exact tenant database IDs.`);
    return 0;
  }

  await assertNativeFixtureManifestSlotAvailable(options.manifestPath);
  const manifest = await provisionNativeFixture(database, {
    constructiveDbPath: options.constructiveDbPath!,
    platformDatabase: options.platformDatabase,
    graphqlOrigin: options.graphqlOrigin,
    domain: options.domain,
    keepOnFailure: options.keep,
    writeManifest: (value) => writeNativeFixtureManifest(options.manifestPath, value)
  });
  printReady(options.manifestPath, manifest);

  if (options.command === 'provision') return 0;

  let childExitCode = 1;
  let commandError: unknown;
  try {
    childExitCode = await spawnCommand(options.childCommand, {
      ...process.env,
      CONSOLE_KIT_INTEGRATION: '1',
      CONSOLE_KIT_TENANT_MANIFEST: options.manifestPath,
      CONSOLE_KIT_BASE_URL: process.env.CONSOLE_KIT_BASE_URL ||
        'http://localhost:3005/__integration/console-kit'
    });
  } catch (error) {
    commandError = error;
  } finally {
    if (!options.keep) {
      const currentManifest = await readNativeFixtureManifest(options.manifestPath);
      const cleaned = await cleanupNativeFixture(database, currentManifest);
      await writeNativeFixtureManifest(options.manifestPath, cleaned);
      console.log(`Cleaned ${cleaned.databaseIds.length} exact tenant database IDs.`);
    } else {
      console.log(`Kept native tenants for review; cleanup manifest: ${options.manifestPath}`);
    }
  }
  if (commandError) throw commandError;
  return childExitCode;
}

async function main(): Promise<void> {
  try {
    const options = parseNativeFixtureCliArgs(process.argv.slice(2));
    process.exitCode = await runNativeFixtureCli(options);
  } catch (error) {
    const isHelp = error instanceof Error && 'help' in error;
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = isHelp ? 0 : 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void main();
}

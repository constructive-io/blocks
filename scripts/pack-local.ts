import { mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, '.artifacts', 'npm');
const packages = [
  '@constructive-io/ui',
  '@constructive-io/data',
  '@constructive-io/command-palette',
  '@constructive-io/sheets',
  '@constructive-io/schema-builder',
  'json-renderer',
  'blocks-schema',
  'blocks-renderer',
  'json-schema-to-blocks',
  'meta-to-blocks',
  'flow-to-blocks'
];

function run(command: string, args: string[], options?: { ignoreLifecycleScripts?: boolean }): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: options?.ignoreLifecycleScripts
        ? { ...process.env, npm_config_ignore_scripts: 'true' }
        : process.env,
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const packageName of packages) {
  await run('pnpm', ['--filter', packageName, 'build']);
  // The verified build already exists; suppress package prepack hooks so UI and Schema Builder are not built twice.
  await run(
    'pnpm',
    ['--filter', packageName, 'pack', '--pack-destination', destination],
    { ignoreLifecycleScripts: true }
  );
}

console.log(`Packed ${packages.length} packages into ${path.relative(root, destination)}`);

import { mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, '.artifacts', 'npm');
const packages = ['@constructive-io/ui', '@constructive-io/schema-builder'];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
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
  await run('pnpm', ['--filter', packageName, 'pack', '--pack-destination', destination]);
}

console.log(`Packed ${packages.length} packages into ${path.relative(root, destination)}`);

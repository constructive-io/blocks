export type InstallMode = 'npm' | 'registry';

export const INSTALL_MODE_KEY = 'constructive:install-mode';
export const INSTALL_MODE_EVENT = 'constructive:install-mode';

export function isInstallMode(value: string | null | undefined): value is InstallMode {
  return value === 'npm' || value === 'registry';
}

export type InstallCommand = {
  /** Short label shown as a muted shell comment above the line */
  label?: string;
  /** Full command or snippet to display and copy */
  code: string;
  /** When true, prefix the line with a shell prompt `$` */
  shell?: boolean;
};

export const PACKAGE_INSTALL = 'pnpm add @constructive-io/ui';
export const PACKAGE_GLOBALS = `@import '@constructive-io/ui/globals.css';`;
export const REGISTRY_COMPONENTS_JSON = `{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}`;
export const REGISTRY_ADD_BUTTON = 'pnpm dlx shadcn@4.13.1 add @constructive/button';
export const REGISTRY_ADD_THEME = 'pnpm dlx shadcn@4.13.1 add @constructive/constructive-theme';

export function registryAdd(name: string): string {
  return `pnpm dlx shadcn@4.13.1 add @constructive/${name}`;
}

/** Server-safe helpers to build install command lists for docs pages */
export function packageCommands(options?: {
  importLine?: string;
  globals?: boolean;
}): InstallCommand[] {
  const commands: InstallCommand[] = [
    { label: 'install', code: PACKAGE_INSTALL, shell: true },
  ];
  if (options?.globals) {
    commands.push({
      label: 'app/globals.css',
      code: PACKAGE_GLOBALS,
      shell: false,
    });
  }
  if (options?.importLine) {
    commands.push({ label: 'import', code: options.importLine, shell: false });
  }
  return commands;
}

export function registryCommands(options?: {
  item?: string;
  includeConfig?: boolean;
}): InstallCommand[] {
  const commands: InstallCommand[] = [];
  if (options?.includeConfig) {
    commands.push({
      label: 'components.json',
      code: REGISTRY_COMPONENTS_JSON,
      shell: false,
    });
  }
  commands.push({
    label: 'add',
    code: registryAdd(options?.item ?? 'button'),
    shell: true,
  });
  return commands;
}

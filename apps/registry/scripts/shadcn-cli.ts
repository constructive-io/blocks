export type ShadcnCliMode = 'latest' | 'pinned';

export type ShadcnCli = {
	mode: ShadcnCliMode;
	version: string;
	argumentsPrefix: readonly string[];
};

export type ShadcnCommand = {
	command: 'pnpm';
	arguments: string[];
	display: string;
};

const SHADCN_MODE_FLAG = '--shadcn=';
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

export function parseShadcnCliMode(arguments_: readonly string[]): ShadcnCliMode {
	const flags = arguments_.filter((argument) => argument.startsWith(SHADCN_MODE_FLAG));
	if (flags.length === 0) return 'latest';
	if (flags.length > 1) throw new Error('Pass --shadcn at most once.');

	const mode = flags[0]!.slice(SHADCN_MODE_FLAG.length);
	if (mode !== 'latest' && mode !== 'pinned') {
		throw new Error(`Unknown shadcn smoke mode ${JSON.stringify(mode)}; expected latest or pinned.`);
	}
	return mode;
}

export function parseShadcnVersion(output: string): string {
	const version = output.trim();
	if (!VERSION_PATTERN.test(version)) {
		throw new Error(`Unable to read an exact shadcn version from ${JSON.stringify(version)}.`);
	}
	return version;
}

export function createShadcnCli(mode: ShadcnCliMode, version: string): ShadcnCli {
	const exactVersion = parseShadcnVersion(version);
	return {
		mode,
		version: exactVersion,
		argumentsPrefix: mode === 'latest'
			? ['dlx', `shadcn@${exactVersion}`]
			: ['exec', 'shadcn'],
	};
}

export function createShadcnAddCommand(
	cli: ShadcnCli,
	itemNames: readonly string[],
	root: string,
): ShadcnCommand {
	const registryItems = itemNames.map((itemName) => `@constructive/${itemName}`);
	const arguments_ = [
		...cli.argumentsPrefix,
		'add',
		...registryItems,
		'--cwd',
		root,
		'--yes',
	];
	return {
		command: 'pnpm',
		arguments: arguments_,
		display: `pnpm ${arguments_.join(' ')}`,
	};
}

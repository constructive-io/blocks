import assert from 'node:assert/strict';
import test from 'node:test';

import {
	createShadcnAddCommand,
	createShadcnCli,
	parseShadcnCliMode,
	parseShadcnVersion,
} from './shadcn-cli';

test('defaults public registry smoke verification to the latest shadcn release', () => {
	assert.equal(parseShadcnCliMode([]), 'latest');
	assert.equal(parseShadcnCliMode(['--shadcn=latest']), 'latest');
	assert.equal(parseShadcnCliMode(['--shadcn=pinned']), 'pinned');
	assert.throws(() => parseShadcnCliMode(['--shadcn=other']), /expected latest or pinned/u);
	assert.throws(
		() => parseShadcnCliMode(['--shadcn=latest', '--shadcn=pinned']),
		/at most once/u,
	);
});

test('accepts only an exact version reported by the shadcn executable', () => {
	assert.equal(parseShadcnVersion('4.16.1\n'), '4.16.1');
	assert.equal(parseShadcnVersion('5.0.0-beta.2'), '5.0.0-beta.2');
	assert.throws(() => parseShadcnVersion('shadcn 4.16.1'), /exact shadcn version/u);
	assert.throws(() => parseShadcnVersion('latest'), /exact shadcn version/u);
});

test('freezes latest to the resolved version for every registry add', () => {
	const cli = createShadcnCli('latest', '4.16.1');
	const command = createShadcnAddCommand(cli, ['app-kit-core', 'app-kit-data'], '/tmp/consumer');

	assert.deepEqual(command, {
		command: 'pnpm',
		arguments: [
			'dlx',
			'shadcn@4.16.1',
			'add',
			'@constructive/app-kit-core',
			'@constructive/app-kit-data',
			'--cwd',
			'/tmp/consumer',
			'--yes',
		],
		display: 'pnpm dlx shadcn@4.16.1 add @constructive/app-kit-core @constructive/app-kit-data --cwd /tmp/consumer --yes',
	});
	assert.equal(command.arguments.includes('exec'), false);
});

test('keeps workspace-pinned CLI execution available for local diagnosis', () => {
	const cli = createShadcnCli('pinned', '4.13.1');
	const command = createShadcnAddCommand(cli, ['button'], '/tmp/consumer');

	assert.deepEqual(command.arguments.slice(0, 3), ['exec', 'shadcn', 'add']);
	assert.equal(command.display, 'pnpm exec shadcn add @constructive/button --cwd /tmp/consumer --yes');
});

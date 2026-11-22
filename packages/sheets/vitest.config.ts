import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Node 25+ defines its own localStorage, which hides jsdom's unless a storage file is given.
		poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
	},
});

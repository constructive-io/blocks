import { createPostGraphileAdapter } from './postgraphile-adapter';
import type { SheetsBackendAdapter } from './sheets-adapter';
import { useSheetsContext } from '../context/sheets-context';

// Stable module-level singleton: the default adapter is stateless, so every hook
// that falls back to it shares one instance (no per-render churn).
const defaultAdapter = createPostGraphileAdapter();

/**
 * Resolve the active backend adapter. A consumer that never sets
 * `config.adapter` transparently gets the default PostGraphile adapter,
 * preserving today's behavior exactly.
 */
export function useSheetsAdapter(): SheetsBackendAdapter {
	const { config } = useSheetsContext();
	return config.adapter ?? defaultAdapter;
}

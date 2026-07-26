import type { SheetsConfig } from '../context/sheets-context';

/**
 * Execute a GraphQL mutation against the auth endpoint.
 * Falls back to the data endpoint if authEndpoint is not configured.
 */
export async function executeAuthMutation<TResult = unknown>(
	config: SheetsConfig,
	query: string,
	variables?: Record<string, unknown>,
): Promise<TResult> {
	const url = config.authEndpoint || config.endpoint;
	if (!url) {
		throw new Error('No auth endpoint configured.');
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/graphql-response+json',
	};

	let response: Response;
	try {
		response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query,
				...(variables !== undefined && { variables }),
			}),
		});
	} catch (error) {
		throw new Error(
			`Network error: ${error instanceof Error ? error.message : 'Failed to connect to auth endpoint'}`,
		);
	}

	if (!response.ok) {
		const { status, statusText } = response;
		try {
			const body = await response.json();
			if (body.errors?.length) {
				const firstError = body.errors[0];
				const err = new Error(firstError.message || `Auth request failed: ${status}`);
				(err as any).code = firstError.extensions?.code;
				(err as any).errors = body.errors;
				throw err;
			}
		} catch (e) {
			if (e instanceof Error && (e as any).errors) throw e;
		}
		throw new Error(`Auth request failed: ${status} ${statusText}`);
	}

	const result = await response.json();

	if (result.errors?.length) {
		const firstError = result.errors[0];
		const err = new Error(firstError.message || 'Auth mutation failed');
		(err as any).code = firstError.extensions?.code;
		(err as any).errors = result.errors;
		throw err;
	}

	return result.data as TResult;
}

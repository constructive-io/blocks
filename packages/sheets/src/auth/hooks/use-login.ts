import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createInvalidCredentialsError } from '../utils/auth-errors';
import type { LoginFormData } from '../utils/schemas';
import { useSheetsContext } from '../../context/sheets-context';
import { useSheetsStoreApi } from '../../store/sheets-store';
import { setStoredToken } from '../utils/token-store';
import { executeAuthMutation } from '../auth-execute';
import { toAuthToken, type SignInMutationResult, type SignInMutationVariables } from '../auth-types';

const SIGN_IN_MUTATION = /* GraphQL */ `
	mutation SignIn($input: SignInInput!) {
		signIn(input: $input) {
			result {
				id
				userId
				accessToken
				accessTokenExpiresAt
				isVerified
				totpEnabled
			}
			clientMutationId
		}
	}
`;

export function useSheetsLogin() {
	const queryClient = useQueryClient();
	const { config } = useSheetsContext();
	const storeApi = useSheetsStoreApi();

	return useMutation({
		mutationKey: ['sheets', 'auth', 'signIn'],
		mutationFn: async (credentials: LoginFormData) => {
			const result = await executeAuthMutation<SignInMutationResult>(
				config,
				SIGN_IN_MUTATION,
				{
					input: {
						email: credentials.email,
						password: credentials.password,
						rememberMe: credentials.rememberMe,
					},
				} satisfies SignInMutationVariables,
			);

			const signInResult = result.signIn?.result;
			if (!signInResult) {
				throw createInvalidCredentialsError();
			}

			const token = toAuthToken(signInResult);
			if (!token) {
				throw createInvalidCredentialsError();
			}

			return { token, email: credentials.email, identityKey: signInResult.userId };
		},
		onSuccess: ({ token, identityKey }) => {
			const databaseId = config.databaseId || 'default';
			setStoredToken(databaseId, token.accessToken, token.expiresAt, identityKey);
			storeApi.getState().setAuthenticated(token.accessToken, token.expiresAt, identityKey);
			queryClient.invalidateQueries({ queryKey: ['sheets'] });
		},
	});
}

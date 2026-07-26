import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { RegisterFormData } from '../utils/schemas';
import { useSheetsContext } from '../../context/sheets-context';
import { useSheetsStoreApi } from '../../store/sheets-store';
import { setStoredToken } from '../utils/token-store';
import { executeAuthMutation } from '../auth-execute';
import { toAuthToken, type SignUpMutationResult, type SignUpMutationVariables } from '../auth-types';

const SIGN_UP_MUTATION = /* GraphQL */ `
	mutation SignUp($input: SignUpInput!) {
		signUp(input: $input) {
			result {
				id
				userId
				accessToken
				accessTokenExpiresAt
				isVerified
				totpEnabled
			}
		}
	}
`;

export function useSheetsRegister() {
	const queryClient = useQueryClient();
	const { config } = useSheetsContext();
	const storeApi = useSheetsStoreApi();

	return useMutation({
		mutationKey: ['sheets', 'auth', 'signUp'],
		mutationFn: async (formData: RegisterFormData) => {
			const result = await executeAuthMutation<SignUpMutationResult>(
				config,
				SIGN_UP_MUTATION,
				{
					input: {
						email: formData.email,
						password: formData.password,
						rememberMe: formData.rememberMe ?? true,
					},
				} satisfies SignUpMutationVariables,
			);

			const signUpResult = result.signUp?.result;
			const token = signUpResult ? toAuthToken(signUpResult) : null;

			return { token, email: formData.email, identityKey: signUpResult?.userId ?? null };
		},
		onSuccess: ({ token, identityKey }) => {
			if (token) {
				const databaseId = config.databaseId || 'default';
				setStoredToken(databaseId, token.accessToken, token.expiresAt, identityKey);
				storeApi.getState().setAuthenticated(token.accessToken, token.expiresAt, identityKey);
			}
			queryClient.invalidateQueries({ queryKey: ['sheets'] });
		},
		onError: () => {
			storeApi.getState().setUnauthenticated();
		},
	});
}

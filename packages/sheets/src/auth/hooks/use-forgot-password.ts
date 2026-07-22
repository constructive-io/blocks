import { useMutation } from '@tanstack/react-query';

import { useSheetsContext } from '../../context/sheets-context';
import { executeAuthMutation } from '../auth-execute';
import type { ForgotPasswordMutationResult, ForgotPasswordMutationVariables } from '../auth-types';

const FORGOT_PASSWORD_MUTATION = /* GraphQL */ `
	mutation ForgotPassword($input: ForgotPasswordInput!) {
		forgotPassword(input: $input) {
			clientMutationId
		}
	}
`;

export function useSheetsForgotPassword() {
	const { config } = useSheetsContext();

	return useMutation({
		mutationKey: ['sheets', 'auth', 'forgotPassword'],
		mutationFn: async ({ email }: { email: string }) => {
			await executeAuthMutation<ForgotPasswordMutationResult>(
				config,
				FORGOT_PASSWORD_MUTATION,
				{
					input: { email },
				} satisfies ForgotPasswordMutationVariables,
			);
			return { email };
		},
	});
}

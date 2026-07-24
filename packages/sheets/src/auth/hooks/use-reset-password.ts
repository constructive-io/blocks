import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSheetsContext } from '../../context/sheets-context';
import { executeAuthMutation } from '../auth-execute';
import type { ResetPasswordInput, ResetPasswordMutationResult, ResetPasswordMutationVariables } from '../auth-types';

const RESET_PASSWORD_MUTATION = /* GraphQL */ `
	mutation ResetPassword($input: ResetPasswordInput!) {
		resetPassword(input: $input) {
			result
			clientMutationId
		}
	}
`;

export function useSheetsResetPassword() {
	const queryClient = useQueryClient();
	const { config } = useSheetsContext();

	return useMutation({
		mutationKey: ['sheets', 'auth', 'resetPassword'],
		mutationFn: async (input: ResetPasswordInput) => {
			const result = await executeAuthMutation<ResetPasswordMutationResult>(
				config,
				RESET_PASSWORD_MUTATION,
				{
					input: {
						newPassword: input.newPassword,
						resetToken: input.resetToken,
						roleId: input.roleId,
					},
				} satisfies ResetPasswordMutationVariables,
			);

			if (!result.resetPassword?.result) {
				throw new Error('Failed to reset password. The link may have expired.');
			}

			return { success: true };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sheets'] });
		},
	});
}

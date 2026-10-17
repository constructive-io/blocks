import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { RegisterFormData } from '../utils/schemas';
import { useSheetsContext } from '../../context/sheets-context';
import { useSheetsStoreApi } from '../../store/sheets-store';
import { executeAuthMutation } from '../auth-execute';
import { type SignUpMutationResult, type SignUpMutationVariables } from '../auth-types';

const SIGN_UP_MUTATION = /* GraphQL */ `
	mutation SignUp($input: SignUpInput!) {
		signUp(input: $input) {
			clientMutationId
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
			// sign_up never signs anyone in: the address is mailed a link that does
			await executeAuthMutation<SignUpMutationResult>(
				config,
				SIGN_UP_MUTATION,
				{
					input: {
						email: formData.email,
						password: formData.password,
					},
				} satisfies SignUpMutationVariables,
			);

			return { email: formData.email };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sheets'] });
		},
		onError: () => {
			storeApi.getState().setUnauthenticated();
		},
	});
}

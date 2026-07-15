/**
 * use-passkey-management
 *
 * UTILITY hook (authored + shipped). Orchestrates:
 *   1. Listing webauthn credentials via useWebauthnCredentialsQuery
 *   2. Inline rename via useUpdateWebauthnCredentialMutation
 *   3. Step-up-gated delete via useDeleteWebauthnCredentialMutation
 *
 * Generated hooks are consumed from @/generated/auth (per sdk-binding-contract.md §3).
 * No fetch, no GraphQL document string, no configure()/getClient() here.
 */

import { useWebauthnCredentialsQuery } from '@/generated/auth';
import { useUpdateWebauthnCredentialMutation } from '@/generated/auth';
import { useDeleteWebauthnCredentialMutation } from '@/generated/auth';
import { StepUpError } from '@/blocks/auth/use-step-up/use-step-up';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import type { PasskeyManagementListMessages } from '../messages';

// ---------------------------------------------------------------------------
// Shape of one credential as the block sees it (camelCase API surface)
// ---------------------------------------------------------------------------

export type WebAuthnCredential = {
  id: string;
  name: string | null;
  transports: string[];
  credentialDeviceType: string | null;
  backupEligible: boolean | null;
  backupState: boolean | null;
  lastUsedAt: string | null;
  createdAt: string | null;
};

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export type UsePasskeyManagementReturn = {
  credentials: WebAuthnCredential[];
  isLoading: boolean;
  queryError: string | null;
  /** Rename a credential by id. Resolves on success, throws on failure. */
  rename: (input: { credentialId: string; name: string }) => Promise<void>;
  /** Delete a credential (triggers step-up first). Resolves on success, throws on failure. */
  deleteCredential: (input: { credentialId: string }) => Promise<void>;
  isRenaming: boolean;
  isDeleting: boolean;
};

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function usePasskeyManagement(
  messages: PasskeyManagementListMessages
): UsePasskeyManagementReturn {

  // List query
  const credentialsQuery = useWebauthnCredentialsQuery({
    selection: {
      fields: {
        id: true,
        name: true,
        transports: true,
        credentialDeviceType: true,
        backupEligible: true,
        backupState: true,
        lastUsedAt: true,
        createdAt: true
      }
    }
  });

  // Rename mutation
  const renameMutation = useUpdateWebauthnCredentialMutation({
    selection: { fields: { id: true, name: true } }
  });

  // Delete mutation
  const deleteMutation = useDeleteWebauthnCredentialMutation({
    selection: { fields: { id: true } }
  });

  // Normalize nodes from the Connection result
  const credentials: WebAuthnCredential[] =
    (credentialsQuery.data?.webauthnCredentials?.nodes ?? []).map((node) => ({
      id: node.id,
      name: node.name ?? null,
      transports: node.transports ?? [],
      credentialDeviceType: node.credentialDeviceType ?? null,
      backupEligible: node.backupEligible ?? null,
      backupState: node.backupState ?? null,
      lastUsedAt: node.lastUsedAt ?? null,
      createdAt: node.createdAt ?? null
    }));

  const queryError = credentialsQuery.error
    ? parseGraphQLError(credentialsQuery.error, {
        customMessages: messages.errors,
        defaultMessage: messages.errors.UNKNOWN_ERROR
      }).message
    : null;

  async function rename(input: { credentialId: string; name: string }): Promise<void> {
    await renameMutation.mutateAsync({
      id: input.credentialId,
      webauthnCredentialPatch: { name: input.name }
    });
  }

  async function deleteCredential(input: { credentialId: string }): Promise<void> {
    // Step-up already verified by the caller (component's handleDeleteConfirm).
    // This function only performs the network mutation.
    await deleteMutation.mutateAsync({ id: input.credentialId });
  }

  return {
    credentials,
    isLoading: credentialsQuery.isLoading,
    queryError,
    rename,
    deleteCredential,
    isRenaming: renameMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

// Re-export so test files can import StepUpError from one location
export { StepUpError };

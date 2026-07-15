/**
 * use-user-contexts — block-owned utility hook
 *
 * Combines the signed-in personal account (from `useCurrentUserQuery`, auth
 * namespace) with the user's approved org memberships (from
 * `useOrgMembershipsQuery`, admin namespace) into a unified
 * `UserContextMembership[]` list.
 *
 * DATA PATH:
 *   - `useCurrentUserQuery`  from '@/generated/auth'  ✅ exists in SDK
 *   - `useOrgMembershipsQuery` from '@/generated/admin' ✅ exists in SDK
 *     (OrgMembershipsConnection type is present; useOrgMembershipsQuery confirmed)
 *
 * User.type normalization: the GraphQL wire value is Int! (1 = person,
 * 2 = organization). This hook converts to 'person' | 'organization' at the
 * boundary so callers never see raw integers.
 *
 * Returns contexts sorted personal-first, then orgs alphabetically.
 */

import { useCurrentUserQuery } from '@/generated/auth';
import { useOrgMembershipsQuery } from '@/generated/admin';

export type User = {
  id: string;
  /** Normalized from GraphQL Int: 1 → 'person', 2 → 'organization'. */
  type: 'person' | 'organization';
  displayName: string;
  username: string | null;
  profilePicture: string | null;
};

export type UserContextMembership = {
  user: User;
  /** Only present for type='organization' entries — membership details. */
  membership?: {
    isOwner: boolean;
    isAdmin: boolean;
    profileId: string | null;
    /** Display role label derived from isOwner / isAdmin flags. */
    roleLabel: string;
  };
};

/** Normalize the wire Int (1|2) to the public 'person' | 'organization' enum. */
export function normalizeUserType(raw: number): 'person' | 'organization' {
  if (raw === 1) return 'person';
  if (raw === 2) return 'organization';
  return 'person'; // safe fallback
}

function deriveRoleLabel(
  isOwner: boolean | null | undefined,
  isAdmin: boolean | null | undefined,
  roleOwner: string,
  roleAdmin: string,
  roleMember: string
): string {
  if (isOwner) return roleOwner;
  if (isAdmin) return roleAdmin;
  return roleMember;
}

export type UseUserContextsOptions = {
  /** Labels for role chips — passed from the component's merged messages. */
  roleOwner: string;
  roleAdmin: string;
  roleMember: string;
  /**
   * Injected personal-account user. When provided, the `useCurrentUserQuery`
   * network call is skipped (enabled: false). Useful for hosts that already
   * have currentUser in the React Query cache or want to avoid a redundant
   * auth fetch (spec: user-context-switcher.md §Props).
   */
  currentUser?: User;
};

export type UseUserContextsResult = {
  data: UserContextMembership[];
  isPending: boolean;
  error: unknown;
};

export function useUserContexts(options: UseUserContextsOptions): UseUserContextsResult {
  const { roleOwner, roleAdmin, roleMember, currentUser: injectedCurrentUser } = options;

  // Skip the network call when the host injects a pre-fetched currentUser.
  const currentUserResult = useCurrentUserQuery({
    selection: {
      fields: {
        id: true,
        type: true,
        displayName: true,
        username: true,
        profilePicture: true
      }
    },
    enabled: !injectedCurrentUser
  });

  const orgMembershipsResult = useOrgMembershipsQuery({
    selection: {
      fields: {
        id: true,
        isOwner: true,
        isAdmin: true,
        profileId: true,
        entityId: true
      },
      where: {
        isApproved: { equalTo: true },
        isBanned: { equalTo: false }
      }
    }
  });

  // When injected, the currentUser query is disabled — treat its loading as false.
  const isPending =
    (injectedCurrentUser ? false : currentUserResult.isLoading) ||
    orgMembershipsResult.isLoading;
  const error = currentUserResult.error ?? orgMembershipsResult.error;

  // Build the context list from fetched data.
  const data: UserContextMembership[] = [];

  if (injectedCurrentUser) {
    // Host-injected user — already normalized (type is 'person' | 'organization').
    data.push({ user: injectedCurrentUser });
  } else {
    const rawCurrentUser = currentUserResult.data?.currentUser;
    if (rawCurrentUser) {
      // profilePicture is ConstructiveInternalTypeImage (= unknown) on the wire;
      // treat as string | null at the block boundary.
      const pic = rawCurrentUser.profilePicture;
      data.push({
        user: {
          id: rawCurrentUser.id,
          type: normalizeUserType(rawCurrentUser.type ?? 1),
          displayName: rawCurrentUser.displayName ?? '',
          username: rawCurrentUser.username ?? null,
          profilePicture: (typeof pic === 'string' ? pic : null)
        }
      });
    }
  }

  const edges = orgMembershipsResult.data?.orgMemberships?.nodes ?? [];
  for (const membership of edges) {
    if (!membership) continue;
    if (!membership.entityId) continue;
    data.push({
      user: {
        id: membership.entityId,
        type: 'organization',
        // The org's display info is not embedded in OrgMembership — only entityId is
        // available. The component will render entityId as a fallback until the
        // OrgMembership type exposes joined entity fields (Phase 2 enhancement).
        displayName: membership.entityId,
        username: null,
        profilePicture: null
      },
      membership: {
        isOwner: membership.isOwner ?? false,
        isAdmin: membership.isAdmin ?? false,
        profileId: membership.profileId ?? null,
        roleLabel: deriveRoleLabel(
          membership.isOwner,
          membership.isAdmin,
          roleOwner,
          roleAdmin,
          roleMember
        )
      }
    });
  }

  // Sort: personal first (already first since currentUser is added first),
  // then orgs alphabetically. Since currentUser is type=1 and comes first,
  // we only need to sort the org entries among themselves.
  const personal = data.filter((c) => c.user.type === 'person');
  const orgs = data
    .filter((c) => c.user.type === 'organization')
    .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName));

  return { data: [...personal, ...orgs], isPending, error };
}

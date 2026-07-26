import type { FeaturePackId } from '../../feature-packs';

export type ConsoleKitAuthRoute =
  | Readonly<{ feature: 'auth'; screen: 'entry' }>
  | Readonly<{ feature: 'auth'; screen: 'recovery' }>
  | Readonly<{ feature: 'auth'; screen: 'callback' }>
  | Readonly<{ feature: 'auth'; screen: 'account' }>
  | Readonly<{ feature: 'auth'; screen: 'security' }>
  | Readonly<{ feature: 'auth'; screen: 'connected-accounts' }>
  | Readonly<{ feature: 'auth'; screen: 'devices' }>
  | Readonly<{ feature: 'auth'; screen: 'sessions' }>;

export type ConsoleKitAppAccessRoute =
  | Readonly<{ feature: 'users'; screen: 'members' }>
  | Readonly<{ feature: 'users'; screen: 'member'; membershipId: string }>
  | Readonly<{ feature: 'users'; screen: 'invitations' }>
  | Readonly<{ feature: 'users'; screen: 'invitation'; invitationId: string }>
  | Readonly<{ feature: 'users'; screen: 'accepted-invites' }>
  | Readonly<{ feature: 'users'; screen: 'profiles' }>
  | Readonly<{ feature: 'users'; screen: 'profile'; profileId: string }>
  | Readonly<{ feature: 'users'; screen: 'permissions' }>
  | Readonly<{ feature: 'users'; screen: 'defaults' }>;

type OrganizationRouteBase = Readonly<{
  feature: 'organizations';
  organizationId: string;
}>;

export type ConsoleKitOrganizationsRoute =
  | Readonly<{ feature: 'organizations'; screen: 'organizations' }>
  | Readonly<{ feature: 'organizations'; screen: 'create' }>
  | (OrganizationRouteBase & Readonly<{
      screen:
        | 'overview'
        | 'settings'
        | 'members'
        | 'invitations'
        | 'profiles'
        | 'permissions'
        | 'defaults'
        | 'hierarchy'
        | 'developer'
        | 'api-keys'
        | 'principals';
    }>)
  | (OrganizationRouteBase & Readonly<{
      screen: 'member';
      membershipId: string;
    }>)
  | (OrganizationRouteBase & Readonly<{
      screen: 'invitation';
      invitationId: string;
    }>)
  | (OrganizationRouteBase & Readonly<{
      screen: 'profile';
      profileId: string;
    }>);

export type ConsoleKitDataRoute =
  | Readonly<{ feature: 'data'; screen: 'tables' }>
  | Readonly<{ feature: 'data'; screen: 'table'; tableId: string }>;

export type ConsoleKitStorageRoute =
  | Readonly<{ feature: 'storage'; screen: 'buckets' }>
  | Readonly<{
      feature: 'storage';
      screen: 'bucket';
      bucketId: string;
      path?: string;
    }>;

export type ConsoleKitBillingRoute =
  | Readonly<{ feature: 'billing'; screen: 'overview' }>
  | Readonly<{ feature: 'billing'; screen: 'usage' }>
  | Readonly<{ feature: 'billing'; screen: 'settings' }>;

export type ConsoleKitNotificationsRoute =
  | Readonly<{ feature: 'notifications'; screen: 'inbox' }>
  | Readonly<{
      feature: 'notifications';
      screen: 'message';
      notificationId: string;
    }>;

/**
 * Every Console Kit location is a semantic route. Detail identifiers only
 * exist on detail variants, so consumers do not have to interpret optional
 * route bags or rebuild feature-specific path parsing.
 */
export type ConsoleKitRoute =
  | ConsoleKitAuthRoute
  | ConsoleKitAppAccessRoute
  | ConsoleKitOrganizationsRoute
  | ConsoleKitDataRoute
  | ConsoleKitStorageRoute
  | ConsoleKitBillingRoute
  | ConsoleKitNotificationsRoute;

export function defaultConsoleKitRoute(
  feature: FeaturePackId
): ConsoleKitRoute {
  switch (feature) {
    case 'auth':
      return { feature, screen: 'entry' };
    case 'users':
      return { feature, screen: 'members' };
    case 'organizations':
      return { feature, screen: 'organizations' };
    case 'storage':
      return { feature, screen: 'buckets' };
    case 'billing':
      return { feature, screen: 'overview' };
    case 'notifications':
      return { feature, screen: 'inbox' };
    case 'data':
      return { feature, screen: 'tables' };
  }
}

export function consoleKitRouteKey(route: ConsoleKitRoute): string {
  switch (route.screen) {
    case 'member':
      return 'organizationId' in route
        ? `${route.feature}:${route.screen}:${route.organizationId}:${route.membershipId}`
        : `${route.feature}:${route.screen}:${route.membershipId}`;
    case 'invitation':
      return 'organizationId' in route
        ? `${route.feature}:${route.screen}:${route.organizationId}:${route.invitationId}`
        : `${route.feature}:${route.screen}:${route.invitationId}`;
    case 'profile':
      return 'organizationId' in route
        ? `${route.feature}:${route.screen}:${route.organizationId}:${route.profileId}`
        : `${route.feature}:${route.screen}:${route.profileId}`;
    case 'table':
      return `${route.feature}:${route.screen}:${route.tableId}`;
    case 'bucket':
      return `${route.feature}:${route.screen}:${route.bucketId}:${route.path ?? ''}`;
    case 'message':
      return `${route.feature}:${route.screen}:${route.notificationId}`;
    default:
      return 'organizationId' in route
        ? `${route.feature}:${route.screen}:${route.organizationId}`
        : `${route.feature}:${route.screen}`;
  }
}

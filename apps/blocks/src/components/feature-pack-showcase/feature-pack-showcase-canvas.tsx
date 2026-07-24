'use client';

import * as React from 'react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import type { SheetsConfig, SheetsExecuteFn } from '@constructive-io/sheets';
import { createMockExecute, type MockTable } from '@constructive-io/sheets/testing';

import { BillingFeaturePack } from '@/blocks/feature-packs/billing/billing-feature-pack';
import { AuthFeaturePack } from '@/blocks/feature-packs/auth/auth-feature-pack';
import { DataFeaturePack } from '@/blocks/feature-packs/data/data-feature-pack';
import { NotificationsFeaturePack } from '@/blocks/feature-packs/notifications/notifications-feature-pack';
import { OrganizationsFeaturePack } from '@/blocks/feature-packs/organizations/organizations-feature-pack';
import { StorageFeaturePack } from '@/blocks/feature-packs/storage/storage-feature-pack';
import { UsersFeaturePack } from '@/blocks/feature-packs/users/users-feature-pack';
import type {
  BillingSettingsActions,
  BillingSettingsSection,
} from '@/blocks/billing/billing-settings-page/billing-settings-page';
import { billingShowcaseFormatOptions } from '@/lib/billing-showcase-fixtures';
import type { FeaturePackDocId } from '@/lib/feature-packs';
import { cn } from '@/lib/utils';

import {
  getBillingShowcaseAccount,
  getBillingShowcaseSettingsResources,
  type BillingShowcaseAccountKind,
} from '../billing-showcase/billing-showcase-resources';
import {
  FEATURE_PACK_SHOWCASE_AUTH_ACCOUNT,
  FEATURE_PACK_SHOWCASE_NOTIFICATIONS,
  FEATURE_PACK_SHOWCASE_ORGANIZATIONS,
  FEATURE_PACK_SHOWCASE_STORAGE,
  FEATURE_PACK_SHOWCASE_USERS,
  getFeaturePackShowcaseResource,
  type FeaturePackShowcaseState,
} from './feature-pack-showcase-resources';

export const FEATURE_PACK_SHOWCASE_ROOTS = {
  data: DataFeaturePack,
  auth: AuthFeaturePack,
  users: UsersFeaturePack,
  organizations: OrganizationsFeaturePack,
  storage: StorageFeaturePack,
  billing: BillingFeaturePack,
  notifications: NotificationsFeaturePack,
} satisfies Record<FeaturePackDocId, React.ElementType>;

function createDataTables(): MockTable[] {
  return [
    {
      name: 'projects',
      fields: [
        { name: 'id', gqlType: 'UUID', pgType: 'uuid' },
        { name: 'name', gqlType: 'String', pgType: 'text' },
        { name: 'status', gqlType: 'String', pgType: 'text' },
        { name: 'owner', gqlType: 'String', pgType: 'text' },
        { name: 'updatedAt', gqlType: 'Datetime', pgType: 'timestamptz' },
      ],
      rows: [
        {
          id: 'project_atlas',
          name: 'Atlas migration',
          status: 'In progress',
          owner: 'Ada Lovelace',
          updatedAt: '2026-07-22T08:00:00.000Z',
        },
        {
          id: 'project_beacon',
          name: 'Beacon launch',
          status: 'Review',
          owner: 'Grace Hopper',
          updatedAt: '2026-07-21T15:20:00.000Z',
        },
        {
          id: 'project_compass',
          name: 'Compass research',
          status: 'Planned',
          owner: 'Alan Turing',
          updatedAt: '2026-07-18T11:45:00.000Z',
        },
      ],
    },
    {
      name: 'releases',
      fields: [
        { name: 'id', gqlType: 'UUID', pgType: 'uuid' },
        { name: 'version', gqlType: 'String', pgType: 'text' },
        { name: 'channel', gqlType: 'String', pgType: 'text' },
        { name: 'published', gqlType: 'Boolean', pgType: 'boolean' },
      ],
      rows: [
        {
          id: 'release_24',
          version: '2.4.0',
          channel: 'Stable',
          published: true,
        },
        {
          id: 'release_25',
          version: '2.5.0-beta.2',
          channel: 'Beta',
          published: false,
        },
      ],
    },
  ];
}

function DataShowcase({ onAction, state }: { onAction: (message: string) => void; state: FeaturePackShowcaseState }) {
  const config = React.useMemo<SheetsConfig>(() => {
    const mock = createMockExecute({
      tables: state === 'empty' ? [] : createDataTables(),
      onMutation: (mutation) => onAction(`${mutation.op}(${mutation.tableName})`),
    });

    const execute: SheetsExecuteFn = async <T = unknown,>(
      document: Parameters<SheetsExecuteFn>[0],
      variables?: Record<string, unknown>,
    ): Promise<T> => {
      if (state === 'loading') return new Promise<T>(() => undefined);
      if (state === 'error') {
        throw new Error('Application metadata is temporarily unavailable.');
      }

      const result = await mock.execute<T>(document, variables);
      const response = result as Record<string, unknown>;
      const meta = response?._meta as { tables?: Array<Record<string, unknown>> } | undefined;
      if (!meta?.tables) return result;

      return {
        ...response,
        _meta: {
          ...meta,
          tables: meta.tables.map((table) => ({
            ...table,
            scope: {
              scope: 'app',
              tier: 'database',
              source: 'smartTag',
            },
          })),
        },
      } as T;
    };

    return {
      endpoint: 'mock://feature-pack-data',
      databaseId: 'docs-preview',
      auth: { mode: 'standalone' },
      execute,
      executeUpload: mock.executeUpload,
    };
  }, [onAction, state]);

  const FeatureRoot = FEATURE_PACK_SHOWCASE_ROOTS.data;

  return (
    <FeatureRoot
      config={config}
      defaultActiveTable="projects"
      onActiveTableChange={(tableName) => onAction(`onActiveTableChange('${tableName}')`)}
      onCreateTable={() => onAction('onCreateTable()')}
      onEvent={(event) => {
        if (event.type !== 'cell:edit' && event.type !== 'row:create' && event.type !== 'row:delete') return;
        onAction(`onEvent('${event.type}')`);
      }}
      pageSize={25}
    />
  );
}

function previewWidth(pack: FeaturePackDocId) {
  if (pack === 'auth') return 'max-w-5xl';
  if (pack === 'notifications') return 'max-w-5xl';
  if (pack === 'billing') return 'max-w-6xl';
  return 'max-w-7xl';
}

export function FeaturePackShowcaseCanvas({
  pack,
  state,
  variant,
}: {
  pack: FeaturePackDocId;
  state: FeaturePackShowcaseState;
  variant: string;
}) {
  const [delegatedAction, setDelegatedAction] = React.useState<string | null>(null);
  const [billingSection, setBillingSection] = React.useState<BillingSettingsSection>('overview');

  const recordAction = React.useCallback((message: string) => {
    setDelegatedAction(message);
  }, []);

  function renderPack() {
    if (pack === 'data') {
      return <DataShowcase onAction={recordAction} state={state} />;
    }

    if (pack === 'auth') {
      const FeatureRoot = FEATURE_PACK_SHOWCASE_ROOTS.auth;
      if (variant !== 'account') {
        const mode =
          variant === 'sign-up' || variant === 'recover-password' || variant === 'reset-password' ? variant : 'sign-in';

        return (
          <FeatureRoot
            actions={{
              signIn: ({ email }) => recordAction(`signIn('${email}')`),
              signUp: ({ email }) => recordAction(`signUp('${email}')`),
              recoverPassword: ({ email }) => recordAction(`recoverPassword('${email}')`),
              resetPassword: () => recordAction('resetPassword()'),
            }}
            mode={mode}
            onAuthenticated={() => recordAction('onAuthenticated()')}
            onError={(error) => recordAction(`onError('${error.message}')`)}
            onModeChange={(mode) => recordAction(`onModeChange('${mode}')`)}
            policy={{
              signIn: true,
              signUp: true,
              recoverPassword: true,
              resetPassword: true,
            }}
            view="entry"
          />
        );
      }

      return (
        <FeatureRoot
          account={getFeaturePackShowcaseResource(state, FEATURE_PACK_SHOWCASE_AUTH_ACCOUNT)}
          actions={{
            signOut: () => recordAction('signOut()'),
            updateProfile: ({ displayName }) => recordAction(`updateProfile('${displayName}')`),
            changePassword: () => recordAction('changePassword()'),
            revokeSession: ({ sessionId }) => recordAction(`revokeSession('${sessionId}')`),
          }}
          onError={(error) => recordAction(`onError('${error.message}')`)}
          policy={{
            signOut: true,
            updateProfile: true,
            changePassword: true,
            revokeSession: true,
          }}
          view="account"
        />
      );
    }

    if (pack === 'users') {
      const FeatureRoot = FEATURE_PACK_SHOWCASE_ROOTS.users;
      return (
        <FeatureRoot
          actions={{
            invite: ({ recipient, profileId }) =>
              recordAction(`invite('${recipient}', '${profileId ?? ''}')`),
            setApproved: ({ membershipId, approved }) =>
              recordAction(`setApproved('${membershipId}', ${approved})`),
            setVerified: ({ membershipId, verified }) =>
              recordAction(`setVerified('${membershipId}', ${verified})`),
            setBanned: ({ membershipId, banned }) =>
              recordAction(`setBanned('${membershipId}', ${banned})`),
            setDisabled: ({ membershipId, disabled }) =>
              recordAction(`setDisabled('${membershipId}', ${disabled})`),
            setOwner: ({ userId, owner }) =>
              recordAction(`setOwner('${userId}', ${owner})`),
            setAdmin: ({ userId, admin }) =>
              recordAction(`setAdmin('${userId}', ${admin})`),
            setProfile: ({ membershipId, profileId }) =>
              recordAction(`setProfile('${membershipId}', '${profileId ?? ''}')`),
            setDirectPermission: ({ userId, permissionId, granted }) =>
              recordAction(`setDirectPermission('${userId}', '${permissionId}', ${granted})`),
            createProfile: ({ name, slug }) =>
              recordAction(`createProfile('${name}', '${slug}')`),
            updateProfile: ({ profileId, name, slug }) =>
              recordAction(`updateProfile('${profileId}', '${name}', '${slug}')`),
            deleteProfile: ({ profileId }) => recordAction(`deleteProfile('${profileId}')`),
            setDefaultProfile: ({ profileId }) =>
              recordAction(`setDefaultProfile('${profileId}')`),
            setProfilePermission: ({ profileId, permissionId, granted }) =>
              recordAction(`setProfilePermission('${profileId}', '${permissionId}', ${granted})`),
            setDefaultPermission: ({ permissionId, granted }) =>
              recordAction(`setDefaultPermission('${permissionId}', ${granted})`),
            cancelInvite: ({ inviteId }) => recordAction(`cancelInvite('${inviteId}')`),
            extendInvite: ({ inviteId }) => recordAction(`extendInvite('${inviteId}')`),
          }}
          onError={(error) => recordAction(`onError('${error.message}')`)}
          policy={{
            invite: true,
            assignInviteProfile: true,
            setApproved: true,
            setVerified: true,
            setBanned: true,
            setDisabled: true,
            setOwner: true,
            setAdmin: true,
            setProfile: true,
            setDirectPermission: true,
            createProfile: true,
            updateProfile: true,
            deleteProfile: true,
            setDefaultProfile: true,
            setProfilePermission: true,
            setDefaultPermission: true,
            cancelInvite: true,
            extendInvite: true,
          }}
          resource={getFeaturePackShowcaseResource(state, FEATURE_PACK_SHOWCASE_USERS)}
        />
      );
    }

    if (pack === 'organizations') {
      const FeatureRoot = FEATURE_PACK_SHOWCASE_ROOTS.organizations;
      return (
        <FeatureRoot
          actions={{
            createOrganization: ({ name }) => recordAction(`createOrganization('${name}')`),
            selectOrganization: ({ organizationId }) => recordAction(`selectOrganization('${organizationId}')`),
            inviteMember: ({ organizationId, channel, recipient, profileId }) =>
              recordAction(`inviteMember('${organizationId}', '${channel}', '${recipient ?? ''}', '${profileId ?? ''}')`),
            updateMemberLifecycle: ({ organizationId, membershipId, patch }) =>
              recordAction(`updateMemberLifecycle('${organizationId}', '${membershipId}', '${JSON.stringify(patch)}')`),
            setMemberAdmin: ({ organizationId, actorId, isGrant }) =>
              recordAction(`setMemberAdmin('${organizationId}', '${actorId}', ${isGrant})`),
            setMemberOwner: ({ organizationId, actorId, isGrant }) =>
              recordAction(`setMemberOwner('${organizationId}', '${actorId}', ${isGrant})`),
            setMemberProfile: ({ organizationId, membershipId, profileId, isGrant }) =>
              recordAction(`setMemberProfile('${organizationId}', '${membershipId}', '${profileId}', ${isGrant})`),
            setMemberPermission: ({ organizationId, actorId, permissions, isGrant }) =>
              recordAction(`setMemberPermission('${organizationId}', '${actorId}', '${permissions}', ${isGrant})`),
            removeMember: ({ organizationId, membershipId }) =>
              recordAction(`removeMember('${organizationId}', '${membershipId}')`),
            cancelInvite: ({ organizationId, inviteId }) =>
              recordAction(`cancelInvite('${organizationId}', '${inviteId}')`),
          }}
          onError={(error) => recordAction(`onError('${error.message}')`)}
          policy={{
            createOrganization: true,
            selectOrganization: true,
            inviteMember: true,
            assignInviteProfile: true,
            approveMember: true,
            banMember: true,
            disableMember: true,
            markMemberExternal: true,
            markMemberReadOnly: true,
            grantAdmin: true,
            grantOwner: true,
            assignProfile: true,
            grantPermission: true,
            removeMember: true,
            cancelInvite: true,
          }}
          resource={getFeaturePackShowcaseResource(state, FEATURE_PACK_SHOWCASE_ORGANIZATIONS)}
        />
      );
    }

    if (pack === 'storage') {
      const FeatureRoot = FEATURE_PACK_SHOWCASE_ROOTS.storage;
      return (
        <FeatureRoot
          actions={{
            selectBucket: ({ bucketKey }) => recordAction(`selectBucket('${bucketKey}')`),
            navigate: ({ bucketKey, path }) => recordAction(`navigate('${bucketKey}', '${path}')`),
            createBucket: ({ name, access }) => recordAction(`createBucket('${name}', '${access}')`),
            upload: ({ bucketKey, path, files }) =>
              recordAction(`upload('${bucketKey}', '${path}', ${files.length} files)`),
            download: ({ bucketKey, objectKey }) => recordAction(`download('${bucketKey}', '${objectKey}')`),
            deleteObject: ({ bucketKey, objectKey }) => recordAction(`deleteObject('${bucketKey}', '${objectKey}')`),
          }}
          onError={(error) => recordAction(`onError('${error.message}')`)}
          policy={{
            selectBucket: true,
            navigate: true,
            createBucket: true,
            upload: true,
            download: true,
            deleteObject: true,
          }}
          resource={getFeaturePackShowcaseResource(state, FEATURE_PACK_SHOWCASE_STORAGE)}
        />
      );
    }

    if (pack === 'billing') {
      const FeatureRoot = FEATURE_PACK_SHOWCASE_ROOTS.billing;
      const accountKind: BillingShowcaseAccountKind = variant === 'personal' ? 'personal' : 'organization';
      const billingActions: BillingSettingsActions = {
        onSelectPlan: ({ planId, priceId }) => recordAction(`onSelectPlan('${planId}', '${priceId}')`),
        onContactSales: ({ planId }) => recordAction(`onContactSales('${planId}')`),
        onManageSubscription: ({ subscriptionId }) => recordAction(`onManageSubscription('${subscriptionId}')`),
        onChangePlan: ({ subscriptionId }) => {
          setBillingSection('plans');
          recordAction(`onChangePlan('${subscriptionId}')`);
        },
        onResolvePayment: ({ subscriptionId }) => recordAction(`onResolvePayment('${subscriptionId}')`),
        onViewHistory: (meterSlug) => {
          setBillingSection('usage');
          recordAction(`onViewHistory('${meterSlug}')`);
        },
        onBuyCredits: (meterSlug) => recordAction(`onBuyCredits('${meterSlug}')`),
      };

      return (
        <FeatureRoot
          account={getBillingShowcaseAccount(accountKind)}
          actions={billingActions}
          formatOptions={billingShowcaseFormatOptions}
          onError={(error) => recordAction(`onError('${error.message}')`)}
          onSectionChange={setBillingSection}
          resources={getBillingShowcaseSettingsResources(state, accountKind)}
          section={billingSection}
        />
      );
    }

    const FeatureRoot = FEATURE_PACK_SHOWCASE_ROOTS.notifications;
    return (
      <FeatureRoot
        actions={{
          markRead: ({ notificationId }) => recordAction(`markRead('${notificationId}')`),
          markAllRead: () => recordAction('markAllRead()'),
          openNotification: ({ notification }) => recordAction(`openNotification('${notification.id}')`),
          deleteNotification: ({ notificationId }) => recordAction(`deleteNotification('${notificationId}')`),
        }}
        onError={(error) => recordAction(`onError('${error.message}')`)}
        policy={{
          markRead: true,
          markAllRead: true,
          openNotification: true,
          deleteNotification: true,
        }}
        resource={getFeaturePackShowcaseResource(state, FEATURE_PACK_SHOWCASE_NOTIFICATIONS)}
      />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-5" data-slot="feature-pack-showcase-canvas">
      <div className={cn('mx-auto w-full min-w-0', previewWidth(pack))}>{renderPack()}</div>

      {delegatedAction ? (
        <Alert className="mx-auto w-full min-w-0 max-w-3xl" role="status" variant="info">
          <AlertDescription>
            <span className="font-medium text-current">Action received.</span>{' '}
            <code className="break-all whitespace-normal">{delegatedAction}</code> The preview received this host
            action. Its deterministic resource remains unchanged.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

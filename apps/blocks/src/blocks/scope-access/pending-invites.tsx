'use client';

import * as React from 'react';
import { MailOpenIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { SectionHeading } from '@/components/ui/workspace-kit/surface';

import { normalizeFeaturePackError, type FeaturePackError } from '../feature-packs/shared/feature-pack-contracts';
import { articled } from '../feature-packs/users/users-scope-noun';
import {
  acceptPendingInvite,
  loadPendingInvites,
  type PendingInvite
} from './pending-invites-load';
import { useScopeRuntime } from './scope-access-provider';
import { loadScopeSchemas } from './scope-runtime';

export type PendingInvitesProps = Readonly<{
  /** Names the entity an invitation admits to, when the app knows it. */
  entityLabel?: (invite: PendingInvite) => string | undefined;
  /** Runs after an invitation is accepted, so the app can show the new access. */
  onAccepted?: (invite: PendingInvite) => void;
  onError?: (error: FeaturePackError) => void;
  /** Shown when there is nothing to accept; nothing renders without it. */
  empty?: React.ReactNode;
}>;

function inviteText(invite: PendingInvite, label: string | undefined): string {
  const what = label ?? (invite.scope.entity ? articled(invite.scope.noun.long) : 'this application');
  return invite.senderName ? `${invite.senderName} invited you to ${what}.` : `You're invited to ${what}.`;
}

/**
 * The invitations waiting for the signed-in user in every membership scope:
 * the app, an organization, a data room. Accepting one adds the membership
 * the invitation grants, with no link to follow.
 */
export function PendingInvites({ entityLabel, onAccepted, onError, empty = null }: PendingInvitesProps) {
  const runtime = useScopeRuntime();
  const [invites, setInvites] = React.useState<readonly PendingInvite[] | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState(0);
  // The host's handler may be a new function each render; it doesn't start a new load.
  const reportLoadError = React.useEffectEvent((error: unknown) => {
    onError?.(normalizeFeaturePackError(error, 'Your invitations could not be loaded.'));
  });

  React.useEffect(() => {
    const controller = new AbortController();
    loadScopeSchemas(runtime, ['admin', 'auth'])
      .then((schemas) => loadPendingInvites(runtime, schemas, controller.signal))
      .then((rows) => {
        if (!controller.signal.aborted) setInvites(rows);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setInvites([]);
        reportLoadError(error);
      });
    return () => controller.abort();
  }, [runtime, version]);

  if (!invites) return null;
  if (invites.length === 0) return <>{empty}</>;

  return (
    <section aria-label='Invitations for you' className='flex flex-col gap-3'>
      <SectionHeading title='Invitations for you' />
      <ul className='flex flex-col divide-y rounded-lg border'>
        {invites.map((invite) => (
          <li className='flex items-center gap-3 px-4 py-3' key={`${invite.scope.scope}:${invite.id}`}>
            <MailOpenIcon aria-hidden className='size-4 shrink-0 text-muted-foreground' />
            <span className='min-w-0 flex-1 text-sm'>{inviteText(invite, entityLabel?.(invite))}</span>
            <Button
              disabled={pending !== null}
              onClick={async () => {
                setPending(invite.id);
                try {
                  await acceptPendingInvite(runtime, invite);
                  onAccepted?.(invite);
                  setVersion((current) => current + 1);
                } catch (error) {
                  onError?.(normalizeFeaturePackError(error, 'The invitation could not be accepted.'));
                } finally {
                  setPending(null);
                }
              }}
              size='sm'
            >
              Accept
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

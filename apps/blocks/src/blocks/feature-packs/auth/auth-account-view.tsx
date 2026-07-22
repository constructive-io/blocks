'use client';

import * as React from 'react';
import { LogOutIcon, MonitorSmartphoneIcon, ShieldCheckIcon, UserRoundIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@constructive-io/ui/avatar';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { Separator } from '@constructive-io/ui/separator';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionResult
} from '../shared/feature-pack-contracts';
import { FeaturePackBoundary, FeaturePackPageHeader } from '../shared/feature-pack-ui';
import type { AuthFeaturePackProps } from './auth-contracts';

function identityInitials(value: string): string {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AuthAccountView({
  account = { status: 'loading' },
  policy,
  actions,
  onError
}: Omit<AuthFeaturePackProps, 'view' | 'mode' | 'resetToken' | 'onModeChange' | 'onAuthenticated'>) {
  const [displayName, setDisplayName] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<string>();
  const fieldIdPrefix = React.useId();
  const displayNameId = `${fieldIdPrefix}-display-name`;
  const currentPasswordId = `${fieldIdPrefix}-current-password`;
  const newPasswordId = `${fieldIdPrefix}-new-password`;

  const run = async (
    key: string,
    action: () => FeatureActionResult,
    fallback: string,
    onSuccess?: () => void
  ) => {
    setPendingAction(key);
    try {
      await action();
      onSuccess?.();
    } catch (cause) {
      onError?.(normalizeFeaturePackError(cause, fallback));
    } finally {
      setPendingAction(undefined);
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <FeaturePackPageHeader
        actions={
          canPerform(policy, 'signOut') && actions?.signOut ? (
            <Button
              disabled={pendingAction === 'signOut'}
              onClick={() => void run('signOut', actions.signOut!, 'You could not be signed out.')}
              variant='outline'
            >
              <LogOutIcon data-icon='inline-start' />
              Sign out
            </Button>
          ) : null
        }
        description='Manage the credentials and sessions owned by your personal identity.'
        eyebrow='Authentication'
        title='Account security'
      />
      <FeaturePackBoundary
        emptyDescription='Sign in before opening account security.'
        emptyTitle='No active account'
        resource={account}
      >
        {(data) => (
          <div className='grid gap-6 lg:grid-cols-2'>
            <Card variant='flat'>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>This identity follows you across applications that trust the same auth service.</CardDescription>
              </CardHeader>
              <CardContent className='flex flex-col gap-5'>
                <div className='flex items-center gap-4'>
                  <Avatar className='size-12'>
                    {data.identity.avatarUrl ? <AvatarImage alt='' src={data.identity.avatarUrl} /> : null}
                    <AvatarFallback>{identityInitials(data.identity.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className='min-w-0'>
                    <p className='truncate font-medium'>{data.identity.displayName}</p>
                    <p className='text-muted-foreground truncate text-sm'>{data.identity.primaryEmail}</p>
                  </div>
                  {data.identity.emailVerified ? (
                    <Badge className='ml-auto' variant='secondary'>
                      <ShieldCheckIcon data-icon='inline-start' />
                      Verified
                    </Badge>
                  ) : null}
                </div>
                {canPerform(policy, 'updateProfile') && actions?.updateProfile ? (
                  <form
                    className='flex flex-col gap-3'
                    onSubmit={(event) => {
                      event.preventDefault();
                      const name = displayName.trim();
                      if (!name) return;
                      void run(
                        'profile',
                        () => actions.updateProfile!({ displayName: name }),
                        'Your profile could not be updated.',
                        () => setDisplayName('')
                      );
                    }}
                  >
                    <Field htmlFor={displayNameId} label='Display name'>
                      <Input
                        id={displayNameId}
                        onChange={(event) => setDisplayName(event.currentTarget.value)}
                        placeholder={data.identity.displayName}
                        value={displayName}
                      />
                    </Field>
                    <Button className='self-start' disabled={!displayName.trim() || pendingAction === 'profile'} size='sm' type='submit'>
                      <UserRoundIcon data-icon='inline-start' />
                      Save profile
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>

            <Card variant='flat'>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Changing the password can affect every application using this identity.</CardDescription>
              </CardHeader>
              <CardContent>
                {canPerform(policy, 'changePassword') && actions?.changePassword ? (
                  <form
                    className='flex flex-col gap-4'
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(
                        'password',
                        () => actions.changePassword!({ currentPassword, newPassword }),
                        'Your password could not be changed.',
                        () => {
                          setCurrentPassword('');
                          setNewPassword('');
                        }
                      );
                    }}
                  >
                    <Field htmlFor={currentPasswordId} label='Current password' required>
                      <Input
                        autoComplete='current-password'
                        id={currentPasswordId}
                        onChange={(event) => setCurrentPassword(event.currentTarget.value)}
                        required
                        type='password'
                        value={currentPassword}
                      />
                    </Field>
                    <Field description='Use at least 12 characters.' htmlFor={newPasswordId} label='New password' required>
                      <Input
                        autoComplete='new-password'
                        id={newPasswordId}
                        minLength={12}
                        onChange={(event) => setNewPassword(event.currentTarget.value)}
                        required
                        type='password'
                        value={newPassword}
                      />
                    </Field>
                    <Button className='self-start' disabled={pendingAction === 'password'} size='sm' type='submit'>
                      Change password
                    </Button>
                  </form>
                ) : (
                  <p className='text-muted-foreground text-sm'>Password changes are managed by the host application.</p>
                )}
              </CardContent>
            </Card>

            {data.sessions ? (
              <Card className='lg:col-span-2' variant='flat'>
                <CardHeader>
                  <CardTitle>Sessions</CardTitle>
                  <CardDescription>Review devices that currently have access to your account.</CardDescription>
                </CardHeader>
                <CardContent className='flex flex-col'>
                  {data.sessions.map((session, index) => (
                    <React.Fragment key={session.id}>
                      {index > 0 ? <Separator /> : null}
                      <div className='flex min-h-16 items-center gap-3 py-3'>
                        <div className='bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg'>
                          <MonitorSmartphoneIcon aria-hidden='true' />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <p className='truncate text-sm font-medium'>{session.deviceLabel}</p>
                            {session.current ? <Badge variant='secondary'>Current</Badge> : null}
                          </div>
                          <p className='text-muted-foreground truncate text-xs'>
                            {[session.location, session.lastSeenAt].filter(Boolean).join(' · ') || 'Session details unavailable'}
                          </p>
                        </div>
                        {!session.current && canPerform(policy, 'revokeSession') && actions?.revokeSession ? (
                          <Button
                            disabled={pendingAction === session.id}
                            onClick={() =>
                              void run(
                                session.id,
                                () => actions.revokeSession!({ sessionId: session.id }),
                                'The session could not be revoked.'
                              )
                            }
                            size='sm'
                            variant='outline'
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    </React.Fragment>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </FeaturePackBoundary>
    </div>
  );
}

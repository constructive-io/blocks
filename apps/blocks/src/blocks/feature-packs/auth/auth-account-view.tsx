'use client';

import * as React from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  Link2Icon,
  LogOutIcon,
  MailCheckIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserRoundIcon
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@constructive-io/ui/avatar';
import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@constructive-io/ui/alert-dialog';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Field, FieldGroup } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@constructive-io/ui/input-group';
import { Separator } from '@constructive-io/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { cn } from '@/lib/utils';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionResult
} from '../shared/feature-pack-contracts';
import {
  FeaturePackBoundary,
  FeaturePackTimestamp
} from '../shared/feature-pack-ui';
import type {
  AuthAccountData,
  AuthConnectedAccount,
  AuthFeatureActions,
  AuthFeaturePackProps,
  AuthIdentity,
  AuthPasswordPolicy,
  AuthSession
} from './auth-contracts';
import {
  authPasswordHint,
  authPasswordPolicyError,
  normalizedPasswordLength
} from './auth-password-policy';

type AccountSection = 'profile' | 'security' | 'connections' | 'sessions';

function identityInitials(value: string): string {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const sectionTriggerClass = cn(
  'relative h-10 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3',
  'text-muted-foreground shadow-none',
  'hover:text-foreground data-[active]:text-foreground',
  'data-[active]:border-foreground data-[active]:bg-transparent data-[active]:shadow-none',
  'focus-visible:ring-0 focus-visible:outline-none'
);

/**
 * Identity hub: hero strip for who you are, underline sections for what you do.
 * Rejects nested “tabs-inside-cards” chrome in favor of a single calm settings surface.
 */
export function AuthAccountView({
  account = { status: 'loading' },
  policy,
  actions,
  notice,
  verificationNotice,
  passwordPolicy,
  onError
}: Omit<AuthFeaturePackProps, 'view' | 'mode' | 'onModeChange' | 'onAuthenticated'>) {
  const [displayName, setDisplayName] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<string>();
  const [sessionToRevoke, setSessionToRevoke] = React.useState<Readonly<{
    id: string;
    deviceLabel: string;
  }>>();
  const [verificationMessage, setVerificationMessage] = React.useState<Readonly<{
    kind: 'error' | 'success';
    text: string;
  }>>();
  const [section, setSection] = React.useState<AccountSection>('profile');
  const fieldIdPrefix = React.useId();
  const displayNameId = `${fieldIdPrefix}-display-name`;
  const currentPasswordId = `${fieldIdPrefix}-current-password`;
  const newPasswordId = `${fieldIdPrefix}-new-password`;
  const activeNotice = notice ?? verificationNotice;
  const identityId = account.status === 'ready' ? account.data.identity.id : undefined;

  React.useEffect(() => {
    setCurrentPassword('');
    setNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setSessionToRevoke(undefined);
  }, [identityId]);

  const run = async (
    key: string,
    action: () => FeatureActionResult,
    fallback: string,
    onSuccess?: () => void,
    onFailure?: (message: string) => void
  ) => {
    setPendingAction(key);
    try {
      await action();
      onSuccess?.();
    } catch (cause) {
      const error = normalizeFeaturePackError(cause, fallback);
      onError?.(error);
      onFailure?.(error.message);
    } finally {
      setPendingAction(undefined);
    }
  };

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <h1 className='sr-only'>Account</h1>
      {activeNotice ? (
        <Alert variant={activeNotice.status === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{activeNotice.message}</AlertDescription>
        </Alert>
      ) : null}
      <FeaturePackBoundary
        emptyDescription='Sign in before opening your account.'
        emptyTitle='No active account'
        resource={account}
      >
        {(data) => {
          const showSecurity =
            (canPerform(policy, 'changePassword') && Boolean(actions?.changePassword)) ||
            (canPerform(policy, 'requestAccountDeletion') &&
              Boolean(actions?.requestAccountDeletion));
          const connectedAccounts = data.connectedAccounts ?? [];
          const showConnections = connectedAccounts.length > 0;
          const sessions = data.sessions ?? [];
          const showSessions = sessions.length > 0;
          const sections: AccountSection[] = [
            'profile',
            ...(showSecurity ? (['security'] as const) : []),
            ...(showConnections ? (['connections'] as const) : []),
            ...(showSessions ? (['sessions'] as const) : [])
          ];
          const activeSection = sections.includes(section) ? section : 'profile';
          const multiSection = sections.length > 1;

          return (
            <div className='flex flex-col gap-6'>
              <IdentityHero
                identity={data.identity}
                onSignOut={
                  canPerform(policy, 'signOut') && actions?.signOut
                    ? () => void run('signOut', actions.signOut!, 'You could not be signed out.')
                    : undefined
                }
                signOutPending={pendingAction === 'signOut'}
              />

              {data.identity.emailVerified === false &&
              canPerform(policy, 'sendVerificationEmail') &&
              actions?.sendVerificationEmail ? (
                <VerificationBanner
                  message={verificationMessage}
                  pending={pendingAction === 'verificationEmail'}
                  onSend={() => {
                    setVerificationMessage(undefined);
                    void run(
                      'verificationEmail',
                      () => actions.sendVerificationEmail!({
                        email: data.identity.primaryEmail
                      }),
                      'The verification email could not be sent.',
                      () => setVerificationMessage({
                        kind: 'success',
                        text: 'Verification email sent.'
                      }),
                      (message) => setVerificationMessage({ kind: 'error', text: message })
                    );
                  }}
                />
              ) : null}

              {multiSection ? (
                <Tabs
                  onValueChange={(value) => setSection(value as AccountSection)}
                  value={activeSection}
                >
                  <TabsList
                    aria-label='Account sections'
                    className='bg-transparent h-auto w-full justify-start gap-1 rounded-none border-b border-border/60 p-0'
                  >
                    <TabsTrigger className={sectionTriggerClass} value='profile'>
                      Profile
                    </TabsTrigger>
                    {showSecurity ? (
                      <TabsTrigger className={sectionTriggerClass} value='security'>
                        Security
                      </TabsTrigger>
                    ) : null}
                    {showConnections ? (
                      <TabsTrigger className={sectionTriggerClass} value='connections'>
                        Connections
                        <span className='text-muted-foreground ml-1.5 tabular-nums text-xs'>
                          {connectedAccounts.length}
                        </span>
                      </TabsTrigger>
                    ) : null}
                    {showSessions ? (
                      <TabsTrigger className={sectionTriggerClass} value='sessions'>
                        Sessions
                        <span className='text-muted-foreground ml-1.5 tabular-nums text-xs'>
                          {sessions.length}
                        </span>
                      </TabsTrigger>
                    ) : null}
                  </TabsList>

                  <TabsContent className='mt-6 outline-none' value='profile'>
                    <ProfileSection
                      data={data}
                      displayName={displayName}
                      displayNameId={displayNameId}
                      onDisplayNameChange={setDisplayName}
                      pending={pendingAction === 'profile'}
                      canUpdate={
                        canPerform(policy, 'updateProfile') && Boolean(actions?.updateProfile)
                      }
                      onSave={() => {
                        const name = displayName.trim();
                        if (!name || !actions?.updateProfile) return;
                        void run(
                          'profile',
                          () => actions.updateProfile!({ displayName: name }),
                          'Your profile could not be updated.',
                          () => setDisplayName('')
                        );
                      }}
                    />
                  </TabsContent>

                  {showSecurity ? (
                    <TabsContent className='mt-6 outline-none' value='security'>
                      <div className='flex flex-col gap-8'>
                        {canPerform(policy, 'changePassword') && actions?.changePassword ? (
                          <SecuritySection
                            currentPassword={currentPassword}
                            currentPasswordId={currentPasswordId}
                            newPassword={newPassword}
                            newPasswordId={newPasswordId}
                            passwordPolicy={passwordPolicy}
                            pending={pendingAction === 'password'}
                            showCurrentPassword={showCurrentPassword}
                            showNewPassword={showNewPassword}
                            onCurrentPasswordChange={setCurrentPassword}
                            onNewPasswordChange={setNewPassword}
                            onToggleCurrent={() => setShowCurrentPassword((v) => !v)}
                            onToggleNew={() => setShowNewPassword((v) => !v)}
                            onSubmit={() => {
                              void run(
                                'password',
                                () => actions.changePassword!({
                                  currentPassword,
                                  newPassword
                                }),
                                'Your password could not be changed.',
                                () => {
                                  setCurrentPassword('');
                                  setNewPassword('');
                                }
                              );
                            }}
                          />
                        ) : null}
                        {canPerform(policy, 'requestAccountDeletion') &&
                        actions?.requestAccountDeletion ? (
                          <>
                            {canPerform(policy, 'changePassword') && actions?.changePassword ? (
                              <Separator />
                            ) : null}
                            <AccountDeletionSection
                              identity={data.identity}
                              key={`account-deletion-${data.identity.id}`}
                              onError={onError}
                              requestAccountDeletion={actions.requestAccountDeletion}
                            />
                          </>
                        ) : null}
                      </div>
                    </TabsContent>
                  ) : null}

                  {showConnections ? (
                    <TabsContent className='mt-6 outline-none' value='connections'>
                      <ConnectedAccountsSection
                        accounts={connectedAccounts}
                        disconnect={
                          canPerform(policy, 'disconnectConnectedAccount')
                            ? actions?.disconnectConnectedAccount
                            : undefined
                        }
                        key={`connected-accounts-${data.identity.id}`}
                        onError={onError}
                      />
                    </TabsContent>
                  ) : null}

                  {showSessions ? (
                    <TabsContent className='mt-6 outline-none' value='sessions'>
                      <SessionsSection
                        sessions={sessions}
                        pendingAction={pendingAction}
                        canRevoke={
                          canPerform(policy, 'revokeSession') && Boolean(actions?.revokeSession)
                        }
                        onRevokeRequest={(session) =>
                          setSessionToRevoke({
                            id: session.id,
                            deviceLabel: session.deviceLabel
                          })
                        }
                      />
                    </TabsContent>
                  ) : null}
                </Tabs>
              ) : (
                <ProfileSection
                  data={data}
                  displayName={displayName}
                  displayNameId={displayNameId}
                  onDisplayNameChange={setDisplayName}
                  pending={pendingAction === 'profile'}
                  canUpdate={
                    canPerform(policy, 'updateProfile') && Boolean(actions?.updateProfile)
                  }
                  onSave={() => {
                    const name = displayName.trim();
                    if (!name || !actions?.updateProfile) return;
                    void run(
                      'profile',
                      () => actions.updateProfile!({ displayName: name }),
                      'Your profile could not be updated.',
                      () => setDisplayName('')
                    );
                  }}
                />
              )}

              {canPerform(policy, 'revokeSession') && actions?.revokeSession ? (
                <AlertDialog
                  onOpenChange={(open) => {
                    if (!open && pendingAction !== sessionToRevoke?.id) {
                      setSessionToRevoke(undefined);
                    }
                  }}
                  open={Boolean(sessionToRevoke)}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke {sessionToRevoke?.deviceLabel}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This signs that device out of your account. You will need to authenticate there again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={pendingAction === sessionToRevoke?.id}>
                        Cancel
                      </AlertDialogCancel>
                      <Button
                        disabled={!sessionToRevoke || pendingAction === sessionToRevoke.id}
                        onClick={() => {
                          if (!sessionToRevoke) return;
                          const sessionId = sessionToRevoke.id;
                          void run(
                            sessionId,
                            () => actions.revokeSession!({ sessionId }),
                            'The session could not be revoked.',
                            () => setSessionToRevoke(undefined)
                          );
                        }}
                        variant='destructive'
                      >
                        {pendingAction === sessionToRevoke?.id ? 'Revoking…' : 'Revoke session'}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}

function IdentityHero({
  identity,
  onSignOut,
  signOutPending
}: Readonly<{
  identity: AuthAccountData['identity'];
  onSignOut?: () => void;
  signOutPending?: boolean;
}>) {
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
      <div className='flex min-w-0 items-center gap-4'>
        <Avatar className='ring-border/60 size-14 shrink-0 ring-1 ring-inset'>
          {identity.avatarUrl ? <AvatarImage alt='' src={identity.avatarUrl} /> : null}
          <AvatarFallback className='text-base'>
            {identityInitials(identity.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0'>
          <p className='truncate text-lg font-semibold tracking-tight'>
            {identity.displayName}
          </p>
          <div className='mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
            <p className='text-muted-foreground truncate text-sm'>{identity.primaryEmail}</p>
            {identity.emailVerified === true ? (
              <Badge size='sm' variant='secondary'>
                <ShieldCheckIcon data-icon='inline-start' />
                Verified
              </Badge>
            ) : identity.emailVerified === false ? (
              <Badge size='sm' variant='outline'>
                <MailIcon data-icon='inline-start' />
                Unverified
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      {onSignOut ? (
        <Button
          className='self-start sm:self-center'
          disabled={signOutPending}
          onClick={onSignOut}
          variant='outline'
        >
          <LogOutIcon data-icon='inline-start' />
          Sign out
        </Button>
      ) : null}
    </div>
  );
}

function VerificationBanner({
  pending,
  message,
  onSend
}: Readonly<{
  pending: boolean;
  message?: Readonly<{ kind: 'error' | 'success'; text: string }>;
  onSend: () => void;
}>) {
  return (
    <div className='border-border/70 bg-muted/25 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='min-w-0'>
        <p className='text-sm font-medium'>Confirm your email</p>
        <p className='text-muted-foreground mt-0.5 text-pretty text-xs leading-5'>
          A verified address keeps recovery and security notices reachable.
        </p>
        {message ? (
          <p
            className={
              message.kind === 'error'
                ? 'text-destructive mt-1.5 text-xs'
                : 'text-muted-foreground mt-1.5 text-xs'
            }
            role={message.kind === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        ) : null}
      </div>
      <Button
        className='shrink-0 self-start sm:self-auto'
        disabled={pending}
        onClick={onSend}
        size='sm'
        variant='secondary'
      >
        <MailCheckIcon data-icon='inline-start' />
        Send verification email
      </Button>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  description
}: Readonly<{
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  description?: string;
}>) {
  return (
    <div className='mb-5 flex items-start gap-3'>
      <div className='bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'>
        <Icon aria-hidden='true' className='size-4' />
      </div>
      <div className='min-w-0 pt-0.5'>
        <h2 className='text-sm font-semibold tracking-tight'>{title}</h2>
        {description ? (
          <p className='text-muted-foreground mt-0.5 text-pretty text-sm'>{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function ProfileSection({
  data,
  displayName,
  displayNameId,
  onDisplayNameChange,
  canUpdate,
  pending,
  onSave
}: Readonly<{
  data: AuthAccountData;
  displayName: string;
  displayNameId: string;
  onDisplayNameChange: (value: string) => void;
  canUpdate: boolean;
  pending: boolean;
  onSave: () => void;
}>) {
  return (
    <section className='max-w-md'>
      <SectionLabel
        description='How your name appears in this application.'
        icon={UserRoundIcon}
        title='Display name'
      />
      {canUpdate ? (
        <form
          className='flex flex-col gap-3'
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <Field htmlFor={displayNameId} label='Display name'>
            <Input
              id={displayNameId}
              onChange={(event) => onDisplayNameChange(event.currentTarget.value)}
              placeholder={data.identity.displayName}
              value={displayName}
            />
          </Field>
          <Button
            className='self-start'
            disabled={!displayName.trim() || pending}
            size='sm'
            type='submit'
          >
            Save changes
          </Button>
        </form>
      ) : (
        <p className='text-sm'>
          <span className='text-muted-foreground'>Current name · </span>
          <span className='font-medium'>{data.identity.displayName}</span>
        </p>
      )}
    </section>
  );
}

function SecuritySection({
  currentPassword,
  currentPasswordId,
  newPassword,
  newPasswordId,
  passwordPolicy,
  showCurrentPassword,
  showNewPassword,
  pending,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onToggleCurrent,
  onToggleNew,
  onSubmit
}: Readonly<{
  currentPassword: string;
  currentPasswordId: string;
  newPassword: string;
  newPasswordId: string;
  passwordPolicy?: AuthPasswordPolicy;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  pending: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onToggleCurrent: () => void;
  onToggleNew: () => void;
  onSubmit: () => void;
}>) {
  const passwordError = newPassword
    ? authPasswordPolicyError(newPassword, passwordPolicy)
    : undefined;
  const passwordHint = authPasswordHint(newPassword, passwordPolicy);
  const minLength = normalizedPasswordLength(passwordPolicy?.minLength);
  const maxLength = normalizedPasswordLength(passwordPolicy?.maxLength);

  return (
    <section className='max-w-md'>
      <SectionLabel
        description='Updates the password on this identity for every connected app.'
        icon={KeyRoundIcon}
        title='Change password'
      />
      <form
        className='flex flex-col gap-4'
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <FieldGroup>
          <Field htmlFor={currentPasswordId} label='Current password' required>
            <InputGroup>
              <InputGroupInput
                autoComplete='current-password'
                id={currentPasswordId}
                onChange={(event) => onCurrentPasswordChange(event.currentTarget.value)}
                required
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
              />
              <InputGroupAddon align='inline-end'>
                <Button
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  aria-pressed={showCurrentPassword}
                  className='size-7 p-0'
                  onClick={onToggleCurrent}
                  size='sm'
                  type='button'
                  variant='ghost'
                >
                  {showCurrentPassword
                    ? <EyeOffIcon aria-hidden='true' />
                    : <EyeIcon aria-hidden='true' />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field
            description={passwordHint}
            error={passwordError}
            htmlFor={newPasswordId}
            label='New password'
            required
          >
            <InputGroup>
              <InputGroupInput
                autoComplete='new-password'
                aria-invalid={passwordError ? true : undefined}
                id={newPasswordId}
                maxLength={maxLength}
                minLength={minLength}
                onChange={(event) => onNewPasswordChange(event.currentTarget.value)}
                required
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
              />
              <InputGroupAddon align='inline-end'>
                <Button
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  aria-pressed={showNewPassword}
                  className='size-7 p-0'
                  onClick={onToggleNew}
                  size='sm'
                  type='button'
                  variant='ghost'
                >
                  {showNewPassword
                    ? <EyeOffIcon aria-hidden='true' />
                    : <EyeIcon aria-hidden='true' />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>
        <Button
          className='self-start'
          disabled={!currentPassword || !newPassword || Boolean(passwordError) || pending}
          size='sm'
          type='submit'
        >
          {pending ? 'Changing password…' : 'Change password'}
        </Button>
      </form>
    </section>
  );
}

function AccountDeletionSection({
  identity,
  requestAccountDeletion,
  onError
}: Readonly<{
  identity: AuthIdentity;
  requestAccountDeletion: NonNullable<AuthFeatureActions['requestAccountDeletion']>;
  onError?: AuthFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [feedback, setFeedback] = React.useState<string>();
  const fieldId = React.useId();
  const confirmationValue = identity.primaryEmail === 'Private email'
    ? identity.displayName
    : identity.primaryEmail;
  const confirmed = confirmation.trim() === confirmationValue;

  const resetDialog = () => {
    setConfirmation('');
    setPassword('');
    setError(undefined);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmed || !password || pending) return;
    setPending(true);
    setError(undefined);
    try {
      await requestAccountDeletion({ password });
      setOpen(false);
      resetDialog();
      setFeedback('Check your email to finish deleting this account.');
    } catch (cause) {
      const normalized = normalizeFeaturePackError(
        cause,
        'The account deletion email could not be sent.'
      );
      setError(normalized.message);
      onError?.(normalized);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className='max-w-md'>
      <SectionLabel
        description='Permanently removes this identity after you follow a confirmation link.'
        icon={Trash2Icon}
        title='Delete account'
      />
      {feedback ? (
        <Alert className='mb-4'>
          <AlertDescription>{feedback}</AlertDescription>
        </Alert>
      ) : null}
      <Button onClick={() => setOpen(true)} size='sm' variant='destructive'>
        Delete account
      </Button>
      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !pending) resetDialog();
          setOpen(nextOpen);
        }}
        open={open}
      >
        <AlertDialogContent>
          <form className='flex flex-col gap-4' onSubmit={(event) => void submit(event)}>
            <AlertDialogHeader>
              <AlertDialogTitle>Request permanent account deletion?</AlertDialogTitle>
              <AlertDialogDescription className='text-pretty'>
                This sends a time-limited confirmation link. Verify your password and type{' '}
                <strong className='text-foreground'>{confirmationValue}</strong> to continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <FieldGroup>
              <Field
                htmlFor={`${fieldId}-confirmation`}
                label={`Type ${confirmationValue} to confirm`}
                required
              >
                <Input
                  autoComplete='off'
                  id={`${fieldId}-confirmation`}
                  onChange={(event) => setConfirmation(event.currentTarget.value)}
                  required
                  value={confirmation}
                />
              </Field>
              <Field htmlFor={`${fieldId}-password`} label='Current password' required>
                <Input
                  autoComplete='current-password'
                  id={`${fieldId}-password`}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  required
                  type='password'
                  value={password}
                />
              </Field>
            </FieldGroup>
            {error ? (
              <Alert role='alert' variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending} type='button'>Cancel</AlertDialogCancel>
              <Button
                disabled={!confirmed || !password || pending}
                type='submit'
                variant='destructive'
              >
                {pending ? 'Sending confirmation…' : 'Send deletion email'}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function ConnectedAccountsSection({
  accounts,
  disconnect,
  onError
}: Readonly<{
  accounts: readonly AuthConnectedAccount[];
  disconnect?: AuthFeatureActions['disconnectConnectedAccount'];
  onError?: AuthFeaturePackProps['onError'];
}>) {
  const [target, setTarget] = React.useState<AuthConnectedAccount>();
  const [confirmation, setConfirmation] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();
  const confirmed = Boolean(target) && confirmation.trim() === target?.identifier;

  const resetDialog = () => {
    setTarget(undefined);
    setConfirmation('');
    setPassword('');
    setError(undefined);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disconnect || !target || !confirmed || !password || pending) return;
    setPending(true);
    setError(undefined);
    try {
      await disconnect({ accountId: target.id, password });
      resetDialog();
    } catch (cause) {
      const normalized = normalizeFeaturePackError(
        cause,
        'The connected account could not be disconnected.'
      );
      setError(normalized.message);
      onError?.(normalized);
    } finally {
      setPending(false);
    }
  };

  return (
    <section>
      <SectionLabel
        description='External identities that can authenticate as this account.'
        icon={Link2Icon}
        title='Connected accounts'
      />
      <ul className='border-border/70 divide-border/60 divide-y overflow-hidden rounded-xl border'>
        {accounts.map((account) => (
          <li className='flex min-h-14 items-center gap-3 px-3 py-3 sm:px-4' key={account.id}>
            <div className='bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'>
              <Link2Icon aria-hidden='true' className='size-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <p className='truncate text-sm font-medium'>{account.service}</p>
                {account.isVerified ? (
                  <Badge size='sm' variant='secondary'>Verified</Badge>
                ) : null}
              </div>
              <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                {account.identifier}
              </p>
            </div>
            {disconnect ? (
              <Button onClick={() => setTarget(account)} size='sm' variant='ghost'>
                Disconnect
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {disconnect ? (
        <AlertDialog
          onOpenChange={(open) => {
            if (!open && !pending) resetDialog();
          }}
          open={Boolean(target)}
        >
          <AlertDialogContent>
            <form className='flex flex-col gap-4' onSubmit={(event) => void submit(event)}>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect {target?.service}?</AlertDialogTitle>
                <AlertDialogDescription className='text-pretty'>
                  Verify your password and type{' '}
                  <strong className='text-foreground'>{target?.identifier}</strong> to confirm.
                  You will no longer be able to sign in with this connection.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <FieldGroup>
                <Field
                  htmlFor={`${fieldId}-confirmation`}
                  label={`Type ${target?.identifier ?? 'the account identifier'} to confirm`}
                  required
                >
                  <Input
                    autoComplete='off'
                    id={`${fieldId}-confirmation`}
                    onChange={(event) => setConfirmation(event.currentTarget.value)}
                    required
                    value={confirmation}
                  />
                </Field>
                <Field htmlFor={`${fieldId}-password`} label='Current password' required>
                  <Input
                    autoComplete='current-password'
                    id={`${fieldId}-password`}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    required
                    type='password'
                    value={password}
                  />
                </Field>
              </FieldGroup>
              {error ? (
                <Alert role='alert' variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending} type='button'>Cancel</AlertDialogCancel>
                <Button
                  disabled={!confirmed || !password || pending}
                  type='submit'
                  variant='destructive'
                >
                  {pending ? 'Disconnecting…' : 'Disconnect account'}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </section>
  );
}

function SessionsSection({
  sessions,
  canRevoke,
  pendingAction,
  onRevokeRequest
}: Readonly<{
  sessions: readonly AuthSession[];
  canRevoke: boolean;
  pendingAction?: string;
  onRevokeRequest: (session: AuthSession) => void;
}>) {
  return (
    <section>
      <SectionLabel
        description='Devices that currently hold a session for this identity.'
        icon={MonitorSmartphoneIcon}
        title='Active sessions'
      />
      <ul className='border-border/70 divide-border/60 divide-y overflow-hidden rounded-xl border'>
        {sessions.map((session) => (
          <li
            className='flex min-h-14 items-center gap-3 px-3 py-3 sm:px-4'
            key={session.id}
          >
            <div className='bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'>
              <MonitorSmartphoneIcon aria-hidden='true' className='size-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <p className='truncate text-sm font-medium'>{session.deviceLabel}</p>
                {session.current ? (
                  <Badge size='sm' variant='secondary'>Current</Badge>
                ) : null}
              </div>
              <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                {session.location ? (
                  <>
                    {session.location}
                    {session.lastSeenAt ? ' · ' : null}
                  </>
                ) : null}
                {session.lastSeenAt ? (
                  <FeaturePackTimestamp value={session.lastSeenAt} />
                ) : session.location ? null : (
                  'Last activity unknown'
                )}
              </p>
            </div>
            {!session.current && canRevoke ? (
              <Button
                disabled={pendingAction === session.id}
                onClick={() => onRevokeRequest(session)}
                size='sm'
                variant='ghost'
              >
                Revoke
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

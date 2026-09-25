'use client';

import * as React from 'react';
import {
  BadgeCheckIcon,
  BanIcon,
  HistoryIcon,
  KeyRoundIcon,
  MailPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShieldIcon,
  Trash2Icon,
  UserRoundCheckIcon,
  UserRoundXIcon,
  UsersRoundIcon
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@constructive-io/ui/alert-dialog';
import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
  DialogTrigger
} from '@constructive-io/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@constructive-io/ui/sheet';
import { Tabs, TabsContent } from '@constructive-io/ui/tabs';
import { Textarea } from '@constructive-io/ui/textarea';
import { focusRingClass, pressClass, SearchField, ToneBadge, TooltipIconButton } from '@/components/ui/workspace-kit/primitives';
import { SectionHeading, TableSurface, tableHeadClass, tableRowClass } from '@/components/ui/workspace-kit/surface';
import { cn } from '@/lib/utils';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionPolicy,
  type FeatureActionResult,
  type FeaturePackError,
  type FeaturePackResource
} from '../shared/feature-pack-contracts';
import {
  FeaturePackBoundary,
  FeaturePackEmpty,
  FeaturePackFilteredEmpty,
  FeaturePackLimitations,
  FeaturePackOptionList,
  FeaturePackPageHeader,
  FeaturePackPerson,
  FeaturePackTabList,
  FeaturePackTimestamp,
  FeatureStatusBadge,
  focusedRecordClass
} from '../shared/feature-pack-ui';

export type UsersSection =
  | 'members'
  | 'invitations'
  | 'accepted-invites'
  | 'profiles'
  | 'capabilities'
  | 'defaults';

const NO_PROFILE_VALUE = '__no_profile__';

export type AppMemberLifecycle = Readonly<{
  approved: boolean;
  verified: boolean;
  banned: boolean;
  disabled: boolean;
  active: boolean;
}>;

export type AppMemberGovernance = Readonly<{
  owner: boolean;
  admin: boolean;
}>;

export type AppCapability = Readonly<{
  id: string;
  name: string;
  description?: string;
  bit?: number;
}>;

export type AppAccessProfile = Readonly<{
  id: string;
  name: string;
  slug?: string;
  description?: string;
  capabilityIds: readonly string[];
  system?: boolean;
  default?: boolean;
  memberCount?: number;
  actionPolicy?: FeatureActionPolicy<
    'updateProfile' | 'deleteProfile' | 'setDefaultProfile' | 'setProfileCapability'
  >;
}>;

export type AppMember = Readonly<{
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  lifecycle: AppMemberLifecycle;
  governance: AppMemberGovernance;
  profile?: Readonly<{ id: string; name: string }>;
  directCapabilityIds: readonly string[];
  effectiveCapabilityIds: readonly string[];
  joinedAt?: string;
  actionPolicy?: FeatureActionPolicy<
    | 'setApproved'
    | 'setVerified'
    | 'setBanned'
    | 'setDisabled'
    | 'setOwner'
    | 'setAdmin'
    | 'setProfile'
    | 'setDirectCapability'
  >;
}>;

export type AppInvite = Readonly<{
  id: string;
  recipient: string;
  channel?: 'email' | 'sms' | 'link' | string;
  status: string;
  profile?: Readonly<{ id: string; name: string }>;
  createdAt?: string;
  expiresAt?: string;
  useCount?: number;
  useLimit?: number;
  actionPolicy?: FeatureActionPolicy<'cancelInvite' | 'extendInvite'>;
}>;

export type AppClaimedInvite = Readonly<{
  id: string;
  senderId?: string;
  senderName?: string;
  receiverId?: string;
  receiverName?: string;
  acceptedAt?: string;
}>;

export type UsersFeatureData = Readonly<{
  members: readonly AppMember[];
  invitations?: readonly AppInvite[];
  acceptedInvites?: readonly AppClaimedInvite[];
  profiles?: readonly AppAccessProfile[];
  capabilities?: readonly AppCapability[];
  defaultCapabilityIds?: readonly string[];
  inviteProfileIds?: readonly string[];
}>;

export type UsersFeatureAction =
  | 'invite'
  | 'assignInviteProfile'
  | 'setApproved'
  | 'setVerified'
  | 'setBanned'
  | 'setDisabled'
  | 'setOwner'
  | 'setAdmin'
  | 'setProfile'
  | 'setDirectCapability'
  | 'createProfile'
  | 'updateProfile'
  | 'deleteProfile'
  | 'setDefaultProfile'
  | 'setProfileCapability'
  | 'setDefaultCapability'
  | 'cancelInvite'
  | 'extendInvite';

export type UsersFeatureActions = Readonly<{
  invite?: (input: { recipient: string; profileId?: string }) => FeatureActionResult;
  setApproved?: (input: { membershipId: string; approved: boolean }) => FeatureActionResult;
  setVerified?: (input: { membershipId: string; verified: boolean }) => FeatureActionResult;
  setBanned?: (input: { membershipId: string; banned: boolean }) => FeatureActionResult;
  setDisabled?: (input: { membershipId: string; disabled: boolean }) => FeatureActionResult;
  setOwner?: (input: { userId: string; owner: boolean }) => FeatureActionResult;
  setAdmin?: (input: { userId: string; admin: boolean }) => FeatureActionResult;
  setProfile?: (input: { membershipId: string; profileId?: string }) => FeatureActionResult;
  setDirectCapability?: (input: {
    userId: string;
    capabilityId: string;
    granted: boolean;
  }) => FeatureActionResult;
  createProfile?: (input: {
    name: string;
    slug: string;
    description?: string;
  }) => FeatureActionResult;
  updateProfile?: (input: {
    profileId: string;
    name: string;
    slug: string;
    description?: string;
  }) => FeatureActionResult;
  deleteProfile?: (input: { profileId: string }) => FeatureActionResult;
  setDefaultProfile?: (input: { profileId: string }) => FeatureActionResult;
  setProfileCapability?: (input: {
    profileId: string;
    capabilityId: string;
    granted: boolean;
  }) => FeatureActionResult;
  setDefaultCapability?: (input: {
    capabilityId: string;
    granted: boolean;
  }) => FeatureActionResult;
  cancelInvite?: (input: { inviteId: string }) => FeatureActionResult;
  extendInvite?: (input: { inviteId: string }) => FeatureActionResult;
}>;

export type UsersFeaturePackProps = Readonly<{
  resource: FeaturePackResource<UsersFeatureData>;
  policy?: FeatureActionPolicy<UsersFeatureAction>;
  actions?: UsersFeatureActions;
  section?: UsersSection;
  defaultSection?: UsersSection;
  onSectionChange?: (section: UsersSection) => void;
  /** Highlights and moves focus to a route-selected application membership. */
  focusedMemberId?: string;
  /** Highlights and moves focus to a route-selected pending invitation. */
  focusedInvitationId?: string;
  /** Highlights and moves focus to a route-selected access profile. */
  focusedProfileId?: string;
  title?: string;
  description?: string;
  onError?: (error: FeaturePackError) => void;
}>;

function memberStatus(member: AppMember): string {
  if (member.lifecycle.banned) return 'banned';
  if (member.lifecycle.disabled) return 'disabled';
  if (!member.lifecycle.approved) return 'pending approval';
  if (!member.lifecycle.verified) return 'unverified';
  return member.lifecycle.active ? 'active' : 'inactive';
}

function reportActionError(
  cause: unknown,
  fallback: string,
  setError: (message: string | undefined) => void,
  onError?: UsersFeaturePackProps['onError']
) {
  const normalized = normalizeFeaturePackError(cause, fallback);
  setError(normalized.message);
  onError?.(normalized);
}

function InviteMemberDialog({
  profiles,
  inviteProfileIds,
  canAssignProfile,
  onInvite,
  onError
}: Readonly<{
  profiles: readonly AppAccessProfile[];
  inviteProfileIds: readonly string[];
  canAssignProfile: boolean;
  onInvite: NonNullable<UsersFeatureActions['invite']>;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [recipient, setRecipient] = React.useState('');
  const [profileId, setProfileId] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();
  const eligibleProfiles = profiles.filter((profile) => inviteProfileIds.includes(profile.id));

  const changeOpen = (nextOpen: boolean) => {
    if (pending) return;
    if (nextOpen) {
      setError(undefined);
      if (!inviteProfileIds.includes(profileId)) setProfileId('');
    }
    setOpen(nextOpen);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipient.trim()) return;

    setPending(true);
    setError(undefined);
    try {
      await onInvite({
        recipient: recipient.trim(),
        profileId: canAssignProfile && inviteProfileIds.includes(profileId)
          ? profileId
          : undefined
      });
      setRecipient('');
      setProfileId('');
      setOpen(false);
    } catch (cause) {
      reportActionError(cause, 'The invitation could not be sent.', setError, onError);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger render={<Button size='sm' />}>
        <MailPlusIcon data-icon='inline-start' />
        Invite member
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Invite an application member</DialogTitle>
            <DialogDescription>
              This grants application access. The recipient keeps ownership of their account credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FieldGroup>
              <Field
                error={error}
                htmlFor={`${fieldId}-recipient`}
                label='Email address'
                required
              >
                <Input
                  aria-invalid={error ? true : undefined}
                  autoCapitalize='none'
                  autoComplete='email'
                  id={`${fieldId}-recipient`}
                  name='invite-email'
                  onChange={(event) => setRecipient(event.currentTarget.value)}
                  placeholder='member@example.com'
                  required
                  spellCheck={false}
                  type='email'
                  value={recipient}
                />
              </Field>
              {canAssignProfile && eligibleProfiles.length > 0 ? (
                <Field htmlFor={`${fieldId}-profile`} label='Access profile'>
                  <Select
                    onValueChange={(value) => setProfileId(
                      value === NO_PROFILE_VALUE ? '' : value
                    )}
                    value={profileId || NO_PROFILE_VALUE}
                  >
                    <SelectTrigger id={`${fieldId}-profile`}>
                      <SelectValue>
                        {(value: string | null) => value === NO_PROFILE_VALUE
                          ? 'No profile'
                          : eligibleProfiles.find((profile) => profile.id === value)?.name ?? value}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={NO_PROFILE_VALUE}>No profile</SelectItem>
                        {eligibleProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </FieldGroup>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !recipient.trim()} type='submit'>
              {pending ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type MemberActionIntent = Readonly<{
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => FeatureActionResult;
}>;

type AppMemberRowAction =
  | 'setApproved'
  | 'setVerified'
  | 'setBanned'
  | 'setDisabled'
  | 'setOwner'
  | 'setAdmin'
  | 'setProfile'
  | 'setDirectCapability';

function MemberActions({
  member,
  policy,
  actions,
  onError
}: Readonly<{
  member: AppMember;
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [intent, setIntent] = React.useState<MemberActionIntent>();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const rowPolicy = member.actionPolicy;
  const available = (action: AppMemberRowAction) =>
    canPerform(policy, action) && canPerform(rowPolicy, action) && Boolean(actions?.[action]);
  const hasLifecycle = available('setApproved') || available('setVerified') ||
    available('setBanned') || available('setDisabled');
  const hasGovernance = available('setAdmin') || available('setOwner');
  const finalOwner = member.governance.owner && canPerform(policy, 'setOwner') &&
    Boolean(actions?.setOwner) && !canPerform(rowPolicy, 'setOwner');

  const choose = (nextIntent: MemberActionIntent) => {
    setError(undefined);
    setIntent(nextIntent);
  };

  const confirm = async () => {
    if (!intent) return;
    setPending(true);
    setError(undefined);
    try {
      await intent.run();
      setIntent(undefined);
    } catch (cause) {
      reportActionError(cause, 'The membership could not be changed.', setError, onError);
    } finally {
      setPending(false);
    }
  };

  if (!hasLifecycle && !hasGovernance && !finalOwner) return null;

  return (
    <div className='flex flex-col items-end gap-1'>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${member.name}`}
          className={cn(
            'text-muted-foreground hover:bg-overlay-hover hover:text-foreground data-[popup-open]:bg-overlay-hover grid size-7 cursor-pointer place-items-center rounded-md',
            pressClass,
            focusRingClass
          )}
        >
          <MoreHorizontalIcon aria-hidden='true' className='size-3.5' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56 [&_[role=menuitem]]:gap-2 [&_[role=menuitem]_svg]:size-3.5'>
          {hasLifecycle ? (
            <DropdownMenuGroup>
              {available('setApproved') && actions?.setApproved ? (
                <DropdownMenuItem onClick={() => choose({
                  title: member.lifecycle.approved
                    ? `Revoke approval for ${member.name}?`
                    : `Approve ${member.name}?`,
                  description: member.lifecycle.approved
                    ? 'The member will lose application access until approved again.'
                    : 'Approval is one part of active application membership.',
                  confirmLabel: member.lifecycle.approved ? 'Revoke approval' : 'Approve member',
                  destructive: member.lifecycle.approved,
                  run: () => actions.setApproved!({
                    membershipId: member.id,
                    approved: !member.lifecycle.approved
                  })
                })}>
                  <UserRoundCheckIcon />
                  {member.lifecycle.approved ? 'Revoke approval' : 'Approve member'}
                </DropdownMenuItem>
              ) : null}
              {available('setVerified') && actions?.setVerified ? (
                <DropdownMenuItem onClick={() => choose({
                  title: member.lifecycle.verified
                    ? `Revoke verification for ${member.name}?`
                    : `Mark ${member.name} as verified?`,
                  description: member.lifecycle.verified
                    ? 'The member will lose application access until verified again.'
                    : 'Use this only after completing your application verification process.',
                  confirmLabel: member.lifecycle.verified ? 'Revoke verification' : 'Mark verified',
                  destructive: member.lifecycle.verified,
                  run: () => actions.setVerified!({
                    membershipId: member.id,
                    verified: !member.lifecycle.verified
                  })
                })}>
                  <BadgeCheckIcon />
                  {member.lifecycle.verified ? 'Revoke verification' : 'Mark verified'}
                </DropdownMenuItem>
              ) : null}
              {available('setBanned') && actions?.setBanned ? (
                <DropdownMenuItem
                  onClick={() => choose({
                    title: member.lifecycle.banned
                      ? `Unban ${member.name}?`
                      : `Ban ${member.name}?`,
                    description: member.lifecycle.banned
                      ? 'The member can regain access when every other lifecycle requirement is met.'
                      : 'Banning takes effect immediately and revokes the member’s active sessions.',
                    confirmLabel: member.lifecycle.banned ? 'Unban member' : 'Ban member',
                    destructive: !member.lifecycle.banned,
                    run: () => actions.setBanned!({
                      membershipId: member.id,
                      banned: !member.lifecycle.banned
                    })
                  })}
                  variant={member.lifecycle.banned ? undefined : 'destructive'}
                >
                  <BanIcon />
                  {member.lifecycle.banned ? 'Unban member' : 'Ban member'}
                </DropdownMenuItem>
              ) : null}
              {available('setDisabled') && actions?.setDisabled ? (
                <DropdownMenuItem
                  onClick={() => choose({
                    title: member.lifecycle.disabled
                      ? `Enable access for ${member.name}?`
                      : `Disable access for ${member.name}?`,
                    description: member.lifecycle.disabled
                      ? 'The member can regain access when every other lifecycle requirement is met.'
                      : 'Disabling takes effect immediately and revokes the member’s active sessions.',
                    confirmLabel: member.lifecycle.disabled ? 'Enable access' : 'Disable access',
                    destructive: !member.lifecycle.disabled,
                    run: () => actions.setDisabled!({
                      membershipId: member.id,
                      disabled: !member.lifecycle.disabled
                    })
                  })}
                  variant={member.lifecycle.disabled ? undefined : 'destructive'}
                >
                  {member.lifecycle.disabled ? <UserRoundCheckIcon /> : <UserRoundXIcon />}
                  {member.lifecycle.disabled ? 'Enable access' : 'Disable access'}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          ) : null}
          {hasLifecycle && (hasGovernance || finalOwner) ? <DropdownMenuSeparator /> : null}
          {hasGovernance || finalOwner ? (
            <DropdownMenuGroup>
              {available('setAdmin') && actions?.setAdmin ? (
                <DropdownMenuItem onClick={() => choose({
                  title: member.governance.admin
                    ? `Revoke app admin from ${member.name}?`
                    : `Grant app admin to ${member.name}?`,
                  description: member.governance.admin
                    ? 'The member will keep only profile and direct capabilities.'
                    : 'App admins receive every application capability.',
                  confirmLabel: member.governance.admin ? 'Revoke app admin' : 'Grant app admin',
                  destructive: member.governance.admin,
                  run: () => actions.setAdmin!({
                    userId: member.userId,
                    admin: !member.governance.admin
                  })
                })}>
                  <ShieldCheckIcon />
                  {member.governance.admin ? 'Revoke app admin' : 'Grant app admin'}
                </DropdownMenuItem>
              ) : null}
              {available('setOwner') && actions?.setOwner ? (
                <DropdownMenuItem onClick={() => choose({
                  title: member.governance.owner
                    ? `Revoke app ownership from ${member.name}?`
                    : `Grant app ownership to ${member.name}?`,
                  description: member.governance.owner
                    ? 'The member will remain an app admin until that grant is separately revoked.'
                    : 'Owners can grant and revoke ownership. Keep at least one owner at all times.',
                  confirmLabel: member.governance.owner ? 'Revoke ownership' : 'Grant ownership',
                  destructive: member.governance.owner,
                  run: () => actions.setOwner!({
                    userId: member.userId,
                    owner: !member.governance.owner
                  })
                })}>
                  <KeyRoundIcon />
                  {member.governance.owner ? 'Revoke app ownership' : 'Grant app ownership'}
                </DropdownMenuItem>
              ) : finalOwner ? (
                <DropdownMenuItem disabled>
                  <KeyRoundIcon />
                  Final owner cannot be revoked
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className='text-destructive max-w-64 text-pretty text-xs' role='alert'>{error}</p> : null}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !pending) setIntent(undefined);
        }}
        open={Boolean(intent)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intent?.title}</AlertDialogTitle>
            <AlertDialogDescription>{intent?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              disabled={pending}
              onClick={() => void confirm()}
              variant={intent?.destructive ? 'destructive' : 'default'}
            >
              {pending ? 'Saving…' : intent?.confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemberAccessSheet({
  member,
  profiles,
  capabilities,
  policy,
  actions,
  onError
}: Readonly<{
  member: AppMember;
  profiles: readonly AppAccessProfile[];
  capabilities: readonly AppCapability[];
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [pendingKey, setPendingKey] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();
  const rowPolicy = member.actionPolicy;
  const canSetProfile = canPerform(policy, 'setProfile') &&
    canPerform(rowPolicy, 'setProfile') && Boolean(actions?.setProfile);
  const canSetDirectCapability = canPerform(policy, 'setDirectCapability') &&
    canPerform(rowPolicy, 'setDirectCapability') && Boolean(actions?.setDirectCapability);
  const directCapabilityIds = new Set(member.directCapabilityIds);
  const effectiveCapabilityIds = new Set(member.effectiveCapabilityIds);

  const run = async (key: string, action: () => FeatureActionResult, fallback: string) => {
    setPendingKey(key);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      reportActionError(cause, fallback, setError, onError);
    } finally {
      setPendingKey(undefined);
    }
  };

  return (
    <>
      <TooltipIconButton extendHitArea={false} label='Manage access' onClick={() => setOpen(true)}>
        <ShieldIcon aria-hidden='true' className='size-3.5' />
      </TooltipIconButton>
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetContent className='w-full gap-0 p-0 sm:max-w-md' side='right'>
          <header className='flex flex-col gap-3 p-4 pr-12'>
            <SheetTitle className='text-sm font-medium'>Access for {member.name}</SheetTitle>
            <SheetDescription className='text-[13px]'>
              Profiles and direct grants are separate inputs. Effective capabilities show the result enforced by the backend.
            </SheetDescription>
            <div className='flex flex-wrap items-center gap-1.5'>
              <MemberRole member={member} />
              <FeatureStatusBadge status={memberStatus(member)} />
            </div>
          </header>
          <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-dashed border-foreground/10 p-4'>
            {profiles.length > 0 ? (
              <Field htmlFor={`${fieldId}-profile`} label='Access profile'>
                <Select
                  disabled={!canSetProfile || Boolean(pendingKey)}
                  onValueChange={(value) => {
                    const profileId = value === NO_PROFILE_VALUE ? undefined : value;
                    if (profileId === member.profile?.id || (!profileId && !member.profile)) return;
                    void run(
                      'profile',
                      () => actions!.setProfile!({ membershipId: member.id, profileId }),
                      'The access profile could not be changed.'
                    );
                  }}
                  value={member.profile?.id ?? NO_PROFILE_VALUE}
                >
                  <SelectTrigger id={`${fieldId}-profile`}>
                    <SelectValue>
                      {(value: string | null) => value === NO_PROFILE_VALUE
                        ? 'No profile'
                        : profiles.find((profile) => profile.id === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NO_PROFILE_VALUE}>No profile</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <section className='flex flex-col gap-2'>
              <SectionHeading
                description='These grants are independent from the selected profile.'
                title='Direct capability overrides'
              />
              {capabilities.length > 0 ? (
                <FeaturePackOptionList>
                  {capabilities.map((capability) => {
                    const checked = directCapabilityIds.has(capability.id);
                    return (
                      <Field
                        data-disabled={!canSetDirectCapability || Boolean(pendingKey)}
                        key={capability.id}
                        orientation='horizontal'
                      >
                        <Checkbox
                          aria-label={`${checked ? 'Revoke' : 'Grant'} ${capability.name} directly`}
                          checked={checked}
                          disabled={!canSetDirectCapability || Boolean(pendingKey)}
                          id={`${fieldId}-direct-${capability.id}`}
                          onCheckedChange={(nextChecked) => void run(
                            `direct-${capability.id}`,
                            () => actions!.setDirectCapability!({
                              userId: member.userId,
                              capabilityId: capability.id,
                              granted: nextChecked === true
                            }),
                            'The direct capability could not be changed.'
                          )}
                        />
                        <div className='min-w-0 flex-1'>
                          <FieldLabel htmlFor={`${fieldId}-direct-${capability.id}`}>{capability.name}</FieldLabel>
                          {capability.description ? (
                            <FieldDescription className='text-pretty'>{capability.description}</FieldDescription>
                          ) : null}
                        </div>
                      </Field>
                    );
                  })}
                </FeaturePackOptionList>
              ) : (
                <p className='text-muted-foreground text-pretty text-[13px]'>
                  The capability catalog is unavailable for this tenant.
                </p>
              )}
            </section>

            <section className='flex flex-col gap-2'>
              <SectionHeading
                description='Read-only result of profile, direct, admin, and owner access.'
                title='Effective capabilities'
              />
              <div className='flex flex-wrap gap-1.5'>
                {capabilities.filter((capability) => effectiveCapabilityIds.has(capability.id)).map(
                  (capability) => <ToneBadge key={capability.id} tone='neutral'>{capability.name}</ToneBadge>
                )}
                {effectiveCapabilityIds.size === 0 ? (
                  <span className='text-muted-foreground text-[13px]'>No effective capabilities</span>
                ) : null}
              </div>
            </section>
            {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
          </div>
          <footer className='flex justify-end border-t border-dashed border-foreground/10 bg-muted/40 p-3'>
            <Button onClick={() => setOpen(false)} size='sm' type='button' variant='outline'>Done</Button>
          </footer>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MemberRole({ member }: Readonly<{ member: AppMember }>) {
  if (member.governance.owner) return <ToneBadge tone='primary'>Owner</ToneBadge>;
  if (member.governance.admin) return <ToneBadge tone='info'>Admin</ToneBadge>;
  return <span className='text-muted-foreground text-[13px]'>Member</span>;
}

/** Moves focus to a record a route points at, once it is on screen. */
function useFocusedRecord<T extends HTMLElement>(present: boolean, key: string | undefined) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    if (!present) return;
    const element = ref.current;
    element?.focus({ preventScroll: true });
    element?.scrollIntoView?.({ block: 'nearest' });
  }, [key, present]);
  return ref;
}

function MembersDirectory({
  members,
  query,
  onClearSearch,
  profiles,
  capabilities,
  focusedMemberId,
  policy,
  actions,
  onError
}: Readonly<{
  members: readonly AppMember[];
  query: string;
  onClearSearch: () => void;
  profiles: readonly AppAccessProfile[];
  capabilities: readonly AppCapability[];
  focusedMemberId?: string;
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const focusedMemberRef = useFocusedRecord<HTMLTableRowElement>(
    Boolean(focusedMemberId && members.some((member) => member.id === focusedMemberId)),
    focusedMemberId
  );

  if (members.length === 0 && query.trim()) {
    return (
      <FeaturePackFilteredEmpty
        clearLabel='Clear search'
        description='Try a different name, email, profile, or governance role.'
        onClear={onClearSearch}
        query={query}
        title='No application members match'
      />
    );
  }

  if (members.length === 0) {
    return (
      <FeaturePackEmpty
        description='People with access to this application will appear here.'
        icon={UsersRoundIcon}
        title='No application members to show'
      />
    );
  }

  const canManageAccess = profiles.length > 0 || capabilities.length > 0;

  return (
    <TableSurface className='@container/table' minWidth='0'>
      <caption className='sr-only'>Application members</caption>
      <thead className={tableHeadClass}>
        <tr>
          <th scope='col'>Member</th>
          <th className='hidden @xl/table:table-cell' scope='col'>Profile</th>
          <th className='hidden w-24 @lg/table:table-cell' scope='col'>Role</th>
          <th className='w-32' scope='col'>Status</th>
          <th className='hidden w-36 @3xl/table:table-cell' scope='col'>Joined</th>
          <th className='w-20' scope='col'><span className='sr-only'>Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {members.map((member) => {
          const focused = member.id === focusedMemberId;
          return (
            <tr
              aria-current={focused ? 'true' : undefined}
              className={cn(tableRowClass, 'hover:bg-overlay-hover transition-colors', focused && focusedRecordClass)}
              key={member.id}
              ref={focused ? focusedMemberRef : undefined}
              tabIndex={focused ? -1 : undefined}
            >
              <td className='max-w-0'>
                <FeaturePackPerson
                  avatarUrl={member.avatarUrl}
                  detail={member.email}
                  name={member.name}
                />
              </td>
              <td className='text-muted-foreground hidden truncate @xl/table:table-cell'>
                {member.profile?.name ?? 'No profile'}
              </td>
              <td className='hidden @lg/table:table-cell'><MemberRole member={member} /></td>
              <td><FeatureStatusBadge status={memberStatus(member)} /></td>
              <td className='text-muted-foreground hidden tabular-nums @3xl/table:table-cell'>
                <FeaturePackTimestamp value={member.joinedAt} />
              </td>
              <td>
                <div className='flex items-center justify-end gap-0.5'>
                  {canManageAccess ? (
                    <MemberAccessSheet
                      actions={actions}
                      capabilities={capabilities}
                      member={member}
                      onError={onError}
                      policy={policy}
                      profiles={profiles}
                    />
                  ) : null}
                  <MemberActions actions={actions} member={member} onError={onError} policy={policy} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableSurface>
  );
}

function CancelInviteAction({
  invite,
  cancelInvite,
  onError
}: Readonly<{
  invite: AppInvite;
  cancelInvite: NonNullable<UsersFeatureActions['cancelInvite']>;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const cancel = async () => {
    setPending(true);
    setError(undefined);
    try {
      await cancelInvite({ inviteId: invite.id });
      setOpen(false);
    } catch (cause) {
      reportActionError(cause, 'The invitation could not be canceled.', setError, onError);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)} open={open}>
      <AlertDialogTrigger render={<Button className='h-7' size='sm' variant='outline' />}>Cancel</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel invitation for {invite.recipient}?</AlertDialogTitle>
          <AlertDialogDescription>
            The invitation link will stop working. You can send a new invitation later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep invitation</AlertDialogCancel>
          <Button disabled={pending} onClick={() => void cancel()} variant='destructive'>
            {pending ? 'Canceling…' : 'Cancel invitation'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InvitationsDirectory({
  invitations,
  focusedInvitationId,
  policy,
  actions,
  onError
}: Readonly<{
  invitations: readonly AppInvite[];
  focusedInvitationId?: string;
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [error, setError] = React.useState<string>();
  const [pendingInviteId, setPendingInviteId] = React.useState<string>();
  const focusedInvitationRef = useFocusedRecord<HTMLTableRowElement>(
    Boolean(focusedInvitationId && invitations.some((invite) => invite.id === focusedInvitationId)),
    focusedInvitationId
  );

  if (invitations.length === 0) {
    return (
      <FeaturePackEmpty
        description='Invite a collaborator when they are ready to join this application.'
        icon={MailPlusIcon}
        title='No pending invitations'
      />
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
      <TableSurface className='@container/table' minWidth='0'>
        <caption className='sr-only'>Application invitations</caption>
        <thead className={tableHeadClass}>
          <tr>
            <th scope='col'>Recipient</th>
            <th className='hidden @xl/table:table-cell' scope='col'>Profile</th>
            <th className='w-28' scope='col'>Status</th>
            <th className='hidden w-40 @2xl/table:table-cell' scope='col'>Expires</th>
            <th className='hidden w-20 text-right @lg/table:table-cell' scope='col'>Uses</th>
            <th className='w-32' scope='col'><span className='sr-only'>Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((invite) => {
            const focused = invite.id === focusedInvitationId;
            return (
              <tr
                aria-current={focused ? 'true' : undefined}
                className={cn(tableRowClass, focused && focusedRecordClass)}
                key={invite.id}
                ref={focused ? focusedInvitationRef : undefined}
                tabIndex={focused ? -1 : undefined}
              >
                <td className='max-w-0'>
                  <span className='flex min-w-0 items-center gap-2'>
                    <span className='truncate font-medium' title={invite.recipient}>{invite.recipient}</span>
                    {invite.channel ? <ToneBadge className='capitalize' tone='neutral'>{invite.channel}</ToneBadge> : null}
                  </span>
                  <span className='text-muted-foreground block truncate text-xs @xl/table:hidden'>
                    {invite.profile?.name ?? 'No access profile'}
                  </span>
                </td>
                <td className='text-muted-foreground hidden truncate @xl/table:table-cell'>{invite.profile?.name ?? 'No profile'}</td>
                <td><FeatureStatusBadge status={invite.status} /></td>
                <td className='text-muted-foreground hidden @2xl/table:table-cell'><FeaturePackTimestamp value={invite.expiresAt} /></td>
                <td className='hidden text-right tabular-nums @lg/table:table-cell'>
                  {invite.useLimit !== undefined ? `${invite.useCount ?? 0}/${invite.useLimit}` : '—'}
                </td>
                <td>
                  <div className='flex items-center justify-end gap-1'>
                    {canPerform(policy, 'extendInvite') &&
                    canPerform(invite.actionPolicy, 'extendInvite') && actions?.extendInvite ? (
                      <TooltipIconButton
                        disabled={pendingInviteId === invite.id}
                        extendHitArea={false}
                        label={`Extend invitation for ${invite.recipient}`}
                        onClick={() => void (async () => {
                          setPendingInviteId(invite.id);
                          try {
                            await actions.extendInvite!({ inviteId: invite.id });
                          } catch (cause) {
                            reportActionError(cause, 'The invitation could not be extended.', setError, onError);
                          } finally {
                            setPendingInviteId(undefined);
                          }
                        })()}
                      >
                        <RefreshCwIcon aria-hidden='true' className='size-3.5' />
                      </TooltipIconButton>
                    ) : null}
                    {canPerform(policy, 'cancelInvite') &&
                    canPerform(invite.actionPolicy, 'cancelInvite') && actions?.cancelInvite ? (
                      <CancelInviteAction cancelInvite={actions.cancelInvite} invite={invite} onError={onError} />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableSurface>
    </div>
  );
}

function AcceptedInvitesDirectory({
  invitations
}: Readonly<{ invitations: readonly AppClaimedInvite[] }>) {
  if (invitations.length === 0) {
    return (
      <FeaturePackEmpty
        description='Accepted application invitations will appear here as an audit history.'
        icon={HistoryIcon}
        title='No accepted invitations'
      />
    );
  }

  return (
    <TableSurface className='@container/table' minWidth='0'>
      <caption className='sr-only'>Accepted invitations</caption>
      <thead className={tableHeadClass}>
        <tr>
          <th scope='col'>Recipient</th>
          <th className='hidden @lg/table:table-cell' scope='col'>Invited by</th>
          <th className='w-44' scope='col'>Accepted</th>
        </tr>
      </thead>
      <tbody>
        {invitations.map((invite) => {
          const receiver = invite.receiverName ?? invite.receiverId ?? 'Unknown member';
          const sender = invite.senderName ?? invite.senderId ?? 'Unknown sender';
          const receiverIsId = !invite.receiverName && Boolean(invite.receiverId);
          const senderIsId = !invite.senderName && Boolean(invite.senderId);
          return (
            <tr className={tableRowClass} key={invite.id}>
              <td className='max-w-0'>
                <span className={cn('block truncate font-medium', receiverIsId && 'font-mono text-xs')} translate={receiverIsId ? 'no' : undefined}>
                  {receiver}
                </span>
                <span className='text-muted-foreground block truncate text-xs @lg/table:hidden'>Invited by {sender}</span>
              </td>
              <td className={cn('text-muted-foreground hidden truncate @lg/table:table-cell', senderIsId && 'font-mono text-xs')} translate={senderIsId ? 'no' : undefined}>
                {sender}
              </td>
              <td className='text-muted-foreground'><FeaturePackTimestamp value={invite.acceptedAt} /></td>
            </tr>
          );
        })}
      </tbody>
    </TableSurface>
  );
}

function ProfileFormDialog({
  profile,
  action,
  onError
}: Readonly<{
  profile?: AppAccessProfile;
  action: NonNullable<UsersFeatureActions['createProfile'] | UsersFeatureActions['updateProfile']>;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(profile?.name ?? '');
  const [slug, setSlug] = React.useState(profile?.slug ?? '');
  const [description, setDescription] = React.useState(profile?.description ?? '');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();

  const changeOpen = (nextOpen: boolean) => {
    if (pending) return;
    if (nextOpen) {
      setName(profile?.name ?? '');
      setSlug(profile?.slug ?? '');
      setDescription(profile?.description ?? '');
      setError(undefined);
    }
    setOpen(nextOpen);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      const nextName = name.trim();
      const nextSlug = slug.trim();
      const nextDescription = description.trim() || undefined;
      if (profile) {
        await (action as NonNullable<UsersFeatureActions['updateProfile']>)({
          profileId: profile.id,
          name: nextName,
          slug: nextSlug,
          description: nextDescription
        });
      } else {
        await (action as NonNullable<UsersFeatureActions['createProfile']>)({
          name: nextName,
          slug: nextSlug,
          description: nextDescription
        });
      }
      setOpen(false);
    } catch (cause) {
      reportActionError(cause, 'The access profile could not be saved.', setError, onError);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      {profile ? (
        <TooltipIconButton extendHitArea={false} label={`Edit ${profile.name}`} onClick={() => changeOpen(true)}>
          <PencilIcon aria-hidden='true' className='size-3.5' />
        </TooltipIconButton>
      ) : (
        <DialogTrigger render={<Button size='sm' />}>
          <PlusIcon data-icon='inline-start' />
          New profile
        </DialogTrigger>
      )}
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>{profile ? `Edit ${profile.name}` : 'Create an access profile'}</DialogTitle>
            <DialogDescription>
              Profiles bundle capabilities. Application ownership and admin governance stay separate.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FieldGroup>
              <Field error={error} htmlFor={`${fieldId}-name`} label='Name' required>
                <Input
                  aria-invalid={error ? true : undefined}
                  autoComplete='off'
                  id={`${fieldId}-name`}
                  name='profile-name'
                  onChange={(event) => setName(event.currentTarget.value)}
                  placeholder='Support agent'
                  required
                  value={name}
                />
              </Field>
              <Field htmlFor={`${fieldId}-slug`} label='Slug' required>
                <Input
                  autoCapitalize='none'
                  autoComplete='off'
                  className='font-mono'
                  id={`${fieldId}-slug`}
                  name='profile-slug'
                  onChange={(event) => setSlug(event.currentTarget.value)}
                  placeholder='support-agent'
                  required
                  spellCheck={false}
                  value={slug}
                />
              </Field>
              <Field htmlFor={`${fieldId}-description`} label='Description'>
                <Textarea
                  autoComplete='off'
                  id={`${fieldId}-description`}
                  name='profile-description'
                  onChange={(event) => setDescription(event.currentTarget.value)}
                  placeholder='What members with this profile can do.'
                  value={description}
                />
              </Field>
            </FieldGroup>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !name.trim() || !slug.trim()} type='submit'>
              {pending ? 'Saving…' : profile ? 'Save profile' : 'Create profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProfileCard({
  profile,
  capabilities,
  policy,
  actions,
  focused,
  onError
}: Readonly<{
  profile: AppAccessProfile;
  capabilities: readonly AppCapability[];
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  focused?: boolean;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [pendingKey, setPendingKey] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const profilePolicy = profile.actionPolicy;
  const canUpdate = canPerform(policy, 'updateProfile') &&
    canPerform(profilePolicy, 'updateProfile') && Boolean(actions?.updateProfile);
  const canDelete = canPerform(policy, 'deleteProfile') &&
    canPerform(profilePolicy, 'deleteProfile') && Boolean(actions?.deleteProfile);
  const canSetDefault = canPerform(policy, 'setDefaultProfile') &&
    canPerform(profilePolicy, 'setDefaultProfile') && Boolean(actions?.setDefaultProfile);
  const canCompose = canPerform(policy, 'setProfileCapability') &&
    canPerform(profilePolicy, 'setProfileCapability') && Boolean(actions?.setProfileCapability);
  const profileCapabilityIds = new Set(profile.capabilityIds);
  const fieldId = React.useId();
  const focusedProfileRef = useFocusedRecord<HTMLLIElement>(Boolean(focused), profile.id);

  const run = async (key: string, action: () => FeatureActionResult, fallback: string) => {
    setPendingKey(key);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      reportActionError(cause, fallback, setError, onError);
    } finally {
      setPendingKey(undefined);
    }
  };

  return (
    <li
      aria-current={focused ? 'true' : undefined}
      className={cn('flex flex-col overflow-hidden rounded-xl bg-card shadow-card', focused && focusedRecordClass)}
      ref={focused ? focusedProfileRef : undefined}
      tabIndex={focused ? -1 : undefined}
    >
      <div className='flex items-start gap-3 px-4 pt-3.5 pb-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <h3 className='text-balance text-sm font-medium'>{profile.name}</h3>
            {profile.default ? <ToneBadge tone='primary'>Default</ToneBadge> : null}
            {profile.system ? <ToneBadge tone='neutral'>System</ToneBadge> : null}
          </div>
          <p className='text-muted-foreground mt-0.5 text-pretty text-[13px]'>
            {profile.description ?? profile.slug ?? 'No description'}
          </p>
          <p className='text-muted-foreground mt-1 text-xs tabular-nums'>
            {profile.capabilityIds.length} {profile.capabilityIds.length === 1 ? 'capability' : 'capabilities'}
            {profile.memberCount !== undefined ? ` · ${profile.memberCount} ${profile.memberCount === 1 ? 'member' : 'members'}` : ''}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-0.5'>
          {!profile.default && canSetDefault && actions?.setDefaultProfile ? (
            <Button
              className='h-7'
              disabled={Boolean(pendingKey)}
              onClick={() => void run(
                'default',
                () => actions.setDefaultProfile!({ profileId: profile.id }),
                'The default profile could not be changed.'
              )}
              size='sm'
              variant='ghost'
            >
              Make default
            </Button>
          ) : null}
          {canUpdate && actions?.updateProfile ? (
            <ProfileFormDialog action={actions.updateProfile} onError={onError} profile={profile} />
          ) : null}
          {canDelete && actions?.deleteProfile ? (
            <AlertDialog>
              <AlertDialogTrigger
                aria-label={`Delete ${profile.name}`}
                className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 cursor-pointer place-items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
              >
                <Trash2Icon aria-hidden='true' className='size-3.5' />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {profile.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Members assigned to this profile may lose profile-based capabilities. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={Boolean(pendingKey)}>Keep profile</AlertDialogCancel>
                  <Button
                    disabled={Boolean(pendingKey)}
                    onClick={() => void run(
                      'delete',
                      () => actions.deleteProfile!({ profileId: profile.id }),
                      'The access profile could not be deleted.'
                    )}
                    variant='destructive'
                  >
                    {pendingKey === 'delete' ? 'Deleting…' : 'Delete profile'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>
      {capabilities.length > 0 ? (
        <div className='grid gap-x-4 gap-y-2.5 border-t border-dashed border-foreground/10 px-4 py-3 @lg/profiles:grid-cols-2'>
          {capabilities.map((capability) => {
            const checked = profileCapabilityIds.has(capability.id);
            return (
              <Field
                data-disabled={!canCompose || Boolean(pendingKey)}
                key={capability.id}
                orientation='horizontal'
              >
                <Checkbox
                  aria-label={`${checked ? 'Remove' : 'Add'} ${capability.name} ${checked ? 'from' : 'to'} ${profile.name}`}
                  checked={checked}
                  disabled={!canCompose || Boolean(pendingKey)}
                  id={`${fieldId}-${capability.id}`}
                  onCheckedChange={(nextChecked) => void run(
                    `capability-${capability.id}`,
                    () => actions!.setProfileCapability!({
                      profileId: profile.id,
                      capabilityId: capability.id,
                      granted: nextChecked === true
                    }),
                    'The profile capability could not be changed.'
                  )}
                />
                <div className='min-w-0 flex-1'>
                  <FieldLabel htmlFor={`${fieldId}-${capability.id}`}>{capability.name}</FieldLabel>
                  {capability.description ? <FieldDescription>{capability.description}</FieldDescription> : null}
                </div>
              </Field>
            );
          })}
        </div>
      ) : null}
      {error ? <p className='text-destructive text-pretty px-4 pb-3 text-sm' role='alert'>{error}</p> : null}
    </li>
  );
}

function ProfilesDirectory({
  profiles,
  capabilities,
  focusedProfileId,
  policy,
  actions,
  onError
}: Readonly<{
  profiles: readonly AppAccessProfile[];
  capabilities: readonly AppCapability[];
  focusedProfileId?: string;
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const canCreate = canPerform(policy, 'createProfile') && Boolean(actions?.createProfile);
  const create = canCreate && actions?.createProfile
    ? <ProfileFormDialog action={actions.createProfile} onError={onError} />
    : null;

  return (
    <div className='@container/profiles flex flex-col gap-3'>
      <SectionHeading
        actions={profiles.length > 0 ? create : null}
        description='Named capability bundles for application members. Owner and admin grants remain separate.'
        title='Access profiles'
      />
      {profiles.length > 0 ? (
        <ul className='grid gap-3 @4xl/profiles:grid-cols-2'>
          {profiles.map((profile) => (
            <ProfileCard
              actions={actions}
              capabilities={capabilities}
              focused={profile.id === focusedProfileId}
              key={profile.id}
              onError={onError}
              policy={policy}
              profile={profile}
            />
          ))}
        </ul>
      ) : (
        <FeaturePackEmpty
          action={create}
          description='Create a reusable capability bundle for application members.'
          icon={ShieldIcon}
          title='No access profiles'
        />
      )}
    </div>
  );
}

function CapabilitiesCatalog({ capabilities }: Readonly<{ capabilities: readonly AppCapability[] }>) {
  if (capabilities.length === 0) {
    return (
      <FeaturePackEmpty
        description='This tenant does not expose a capability catalog.'
        icon={KeyRoundIcon}
        title='No application capabilities'
      />
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <SectionHeading
        description='Console Kit assigns existing capabilities through profiles, defaults, and direct grants. It never rewrites the backend catalog.'
        title='Capability definitions are read-only'
      />
      <TableSurface className='@container/table' minWidth='0'>
        <caption className='sr-only'>Application capabilities</caption>
        <thead className={tableHeadClass}>
          <tr>
            <th scope='col'>Capability</th>
            <th className='hidden @lg/table:table-cell' scope='col'>Description</th>
            <th className='w-16 text-right' scope='col'>Bit</th>
          </tr>
        </thead>
        <tbody>
          {capabilities.map((capability) => (
            <tr className={tableRowClass} key={capability.id}>
              <td className='max-w-0'>
                <span className='block truncate font-medium'>{capability.name}</span>
                <span className='text-muted-foreground block text-pretty text-xs @lg/table:hidden'>{capability.description ?? 'No description'}</span>
              </td>
              <td className='text-muted-foreground hidden text-pretty @lg/table:table-cell'>{capability.description ?? 'No description'}</td>
              <td className='text-muted-foreground text-right font-mono text-xs tabular-nums'>{capability.bit ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </TableSurface>
    </div>
  );
}

function CapabilityDefaults({
  capabilities,
  defaultCapabilityIds,
  policy,
  actions,
  onError
}: Readonly<{
  capabilities: readonly AppCapability[];
  defaultCapabilityIds: readonly string[];
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [pendingId, setPendingId] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const canUpdate = canPerform(policy, 'setDefaultCapability') &&
    Boolean(actions?.setDefaultCapability);
  const defaults = new Set(defaultCapabilityIds);
  const fieldId = React.useId();

  const update = async (capabilityId: string, granted: boolean) => {
    if (!actions?.setDefaultCapability) return;
    setPendingId(capabilityId);
    setError(undefined);
    try {
      await actions.setDefaultCapability({ capabilityId, granted });
    } catch (cause) {
      reportActionError(cause, 'The default capability could not be changed.', setError, onError);
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <div className='flex max-w-3xl flex-col gap-3'>
      <SectionHeading
        description='These capabilities apply to new application memberships. Existing members keep their current grants.'
        title='New-member capability defaults'
      />
      {capabilities.length > 0 ? (
        <FeaturePackOptionList>
          {capabilities.map((capability) => {
            const checked = defaults.has(capability.id);
            return (
              <Field
                data-disabled={!canUpdate || Boolean(pendingId)}
                key={capability.id}
                orientation='horizontal'
              >
                <Checkbox
                  aria-label={`${checked ? 'Remove' : 'Add'} ${capability.name} ${checked ? 'from' : 'to'} new-member defaults`}
                  checked={checked}
                  disabled={!canUpdate || Boolean(pendingId)}
                  id={`${fieldId}-${capability.id}`}
                  onCheckedChange={(nextChecked) => void update(capability.id, nextChecked === true)}
                />
                <div className='min-w-0 flex-1'>
                  <FieldLabel htmlFor={`${fieldId}-${capability.id}`}>{capability.name}</FieldLabel>
                  {capability.description ? <FieldDescription>{capability.description}</FieldDescription> : null}
                </div>
              </Field>
            );
          })}
        </FeaturePackOptionList>
      ) : (
        <p className='text-muted-foreground text-pretty text-[13px]'>
          Capability defaults require the application capability catalog.
        </p>
      )}
      {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
    </div>
  );
}

/**
 * Provider-neutral application membership administration. The install id
 * remains `users`, while the product surface uses the more precise App access
 * and application-member language.
 */
export function UsersFeaturePack({
  resource,
  policy,
  actions,
  section: controlledSection,
  defaultSection = 'members',
  onSectionChange,
  focusedMemberId,
  focusedInvitationId,
  focusedProfileId,
  title = 'App access',
  description,
  onError
}: UsersFeaturePackProps) {
  const [query, setQuery] = React.useState('');
  const [internalSection, setInternalSection] = React.useState<UsersSection>(defaultSection);
  const normalizedQuery = query.trim().toLowerCase();
  const canInvite = canPerform(policy, 'invite') && Boolean(actions?.invite);
  const limitations = resource.status === 'ready' ? resource.limitations : undefined;
  // A route-selected member must be visible, so a hiding search clears (adjusted during render, not in an effect).
  const [clearedFor, setClearedFor] = React.useState(focusedMemberId);
  if (focusedMemberId !== clearedFor) {
    setClearedFor(focusedMemberId);
    if (focusedMemberId) setQuery('');
  }

  return (
    <FeaturePackBoundary
      emptyAction={canInvite && actions?.invite ? (
        <InviteMemberDialog
          canAssignProfile={false}
          inviteProfileIds={[]}
          onError={onError}
          onInvite={actions.invite}
          profiles={[]}
        />
      ) : null}
      emptyDescription='Invite the first application member when the app is ready for collaborators.'
      emptyTitle='No application members yet'
      resource={resource}
    >
      {(data) => {
        const profiles = data.profiles ?? [];
        const capabilities = data.capabilities ?? [];
        const invitations = data.invitations ?? [];
        const acceptedInvites = data.acceptedInvites ?? [];
        const members = data.members.filter((member) => {
          if (!normalizedQuery) return true;
          return `${member.name} ${member.email} ${member.profile?.name ?? ''} ${member.governance.owner ? 'owner' : ''} ${member.governance.admin ? 'admin' : ''}`
            .toLowerCase()
            .includes(normalizedQuery);
        });
        const sections: Array<Readonly<{ id: UsersSection; label: string; count?: number }>> = [
          { id: 'members', label: 'Members', count: data.members.length }
        ];
        if (data.invitations !== undefined) {
          sections.push({ id: 'invitations', label: 'Invitations', count: invitations.length });
        }
        if (data.acceptedInvites !== undefined) {
          sections.push({ id: 'accepted-invites', label: 'Accepted', count: acceptedInvites.length });
        }
        if (data.profiles !== undefined) {
          sections.push({ id: 'profiles', label: 'Profiles', count: profiles.length });
        }
        if (data.capabilities !== undefined) {
          sections.push({ id: 'capabilities', label: 'Capabilities', count: capabilities.length });
        }
        if (data.defaultCapabilityIds !== undefined) {
          sections.push({ id: 'defaults', label: 'Defaults' });
        }
        const requestedSection = controlledSection ?? internalSection;
        const activeSection = sections.some((candidate) => candidate.id === requestedSection)
          ? requestedSection
          : 'members';
        const activeCount = data.members.filter((member) => member.lifecycle.active).length;
        const inviteProfileIds = data.inviteProfileIds ?? profiles.map((profile) => profile.id);
        const inviteAction = canInvite && actions?.invite ? (
          <InviteMemberDialog
            canAssignProfile={canPerform(policy, 'assignInviteProfile')}
            inviteProfileIds={inviteProfileIds}
            onError={onError}
            onInvite={actions.invite}
            profiles={profiles}
          />
        ) : null;

        const changeSection = (value: unknown) => {
          const nextSection = value as UsersSection;
          if (!sections.some((candidate) => candidate.id === nextSection)) return;
          if (controlledSection === undefined) setInternalSection(nextSection);
          onSectionChange?.(nextSection);
        };

        return (
          <div className='flex flex-col gap-5'>
            <FeaturePackPageHeader
              actions={inviteAction}
              description={description ?? (
                `${data.members.length} ${data.members.length === 1 ? 'application member' : 'application members'}` +
                (activeCount !== data.members.length ? ` · ${activeCount} active` : '')
              )}
              title={title}
            />

            <FeaturePackLimitations limitations={limitations} />

            <Tabs className='gap-4' onValueChange={changeSection} value={activeSection}>
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <FeaturePackTabList label='App access sections' sections={sections} />
                {activeSection === 'members' ? (
                  <SearchField
                    autoComplete='off'
                    className='w-full md:w-64'
                    label='Search application members'
                    name='member-search'
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder='Search members'
                    value={query}
                  />
                ) : null}
              </div>

              <TabsContent value='members'>
                <MembersDirectory
                  actions={actions}
                  capabilities={capabilities}
                  focusedMemberId={focusedMemberId}
                  members={members}
                  onClearSearch={() => setQuery('')}
                  onError={onError}
                  policy={policy}
                  profiles={profiles}
                  query={query}
                />
              </TabsContent>
              {data.invitations !== undefined ? (
                <TabsContent value='invitations'>
                  <InvitationsDirectory
                    actions={actions}
                    focusedInvitationId={focusedInvitationId}
                    invitations={invitations}
                    onError={onError}
                    policy={policy}
                  />
                </TabsContent>
              ) : null}
              {data.acceptedInvites !== undefined ? (
                <TabsContent value='accepted-invites'>
                  <AcceptedInvitesDirectory invitations={acceptedInvites} />
                </TabsContent>
              ) : null}
              {data.profiles !== undefined ? (
                <TabsContent value='profiles'>
                  <ProfilesDirectory
                    actions={actions}
                    capabilities={capabilities}
                    focusedProfileId={focusedProfileId}
                    onError={onError}
                    policy={policy}
                    profiles={profiles}
                  />
                </TabsContent>
              ) : null}
              {data.capabilities !== undefined ? (
                <TabsContent value='capabilities'>
                  <CapabilitiesCatalog capabilities={capabilities} />
                </TabsContent>
              ) : null}
              {data.defaultCapabilityIds !== undefined ? (
                <TabsContent value='defaults'>
                  <CapabilityDefaults
                    actions={actions}
                    capabilities={capabilities}
                    defaultCapabilityIds={data.defaultCapabilityIds}
                    onError={onError}
                    policy={policy}
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
        );
      }}
    </FeaturePackBoundary>
  );
}

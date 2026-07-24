'use client';

import * as React from 'react';
import {
  BadgeCheckIcon,
  BanIcon,
  CheckIcon,
  HistoryIcon,
  KeyRoundIcon,
  MailPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShieldIcon,
  Trash2Icon,
  UserRoundCheckIcon,
  UserRoundXIcon
} from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@constructive-io/ui/alert';
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
import { Avatar, AvatarFallback, AvatarImage } from '@constructive-io/ui/avatar';
import { Badge } from '@constructive-io/ui/badge';
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@constructive-io/ui/empty';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@constructive-io/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { Textarea } from '@constructive-io/ui/textarea';
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
  FeaturePackFilteredEmpty,
  FeaturePackTimestamp,
  FeatureStatusBadge
} from '../shared/feature-pack-ui';

export type UsersSection =
  | 'members'
  | 'invitations'
  | 'accepted-invites'
  | 'profiles'
  | 'permissions'
  | 'defaults';

const sectionTriggerClass = cn(
  'relative h-10 shrink-0 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3',
  'text-muted-foreground shadow-none',
  'hover:text-foreground data-[active]:text-foreground',
  'data-[active]:border-foreground data-[active]:bg-transparent data-[active]:shadow-none',
  'focus-visible:ring-0 focus-visible:outline-none'
);

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

export type AppPermission = Readonly<{
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
  permissionIds: readonly string[];
  system?: boolean;
  default?: boolean;
  memberCount?: number;
  actionPolicy?: FeatureActionPolicy<
    'updateProfile' | 'deleteProfile' | 'setDefaultProfile' | 'setProfilePermission'
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
  directPermissionIds: readonly string[];
  effectivePermissionIds: readonly string[];
  joinedAt?: string;
  actionPolicy?: FeatureActionPolicy<
    | 'setApproved'
    | 'setVerified'
    | 'setBanned'
    | 'setDisabled'
    | 'setOwner'
    | 'setAdmin'
    | 'setProfile'
    | 'setDirectPermission'
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
  permissions?: readonly AppPermission[];
  defaultPermissionIds?: readonly string[];
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
  | 'setDirectPermission'
  | 'createProfile'
  | 'updateProfile'
  | 'deleteProfile'
  | 'setDefaultProfile'
  | 'setProfilePermission'
  | 'setDefaultPermission'
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
  setDirectPermission?: (input: {
    userId: string;
    permissionId: string;
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
  setProfilePermission?: (input: {
    profileId: string;
    permissionId: string;
    granted: boolean;
  }) => FeatureActionResult;
  setDefaultPermission?: (input: {
    permissionId: string;
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
  title?: string;
  description?: string;
  onError?: (error: FeaturePackError) => void;
}>;

function initials(name: string): string {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

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
      <DialogTrigger render={<Button />}>
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
                  autoComplete='email'
                  id={`${fieldId}-recipient`}
                  onChange={(event) => setRecipient(event.currentTarget.value)}
                  placeholder='member@example.com'
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
  | 'setDirectPermission';

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
          render={<Button size='icon' variant='ghost' />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
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
                    ? 'The member will keep only profile and direct permissions.'
                    : 'App admins receive every application permission.',
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

function MemberAccessDialog({
  member,
  profiles,
  permissions,
  policy,
  actions,
  onError
}: Readonly<{
  member: AppMember;
  profiles: readonly AppAccessProfile[];
  permissions: readonly AppPermission[];
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
  const canSetDirectPermission = canPerform(policy, 'setDirectPermission') &&
    canPerform(rowPolicy, 'setDirectPermission') && Boolean(actions?.setDirectPermission);
  const directPermissionIds = new Set(member.directPermissionIds);
  const effectivePermissionIds = new Set(member.effectivePermissionIds);

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
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size='sm' variant='outline' />}>
        <ShieldIcon data-icon='inline-start' />
        Manage access
      </DialogTrigger>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Access for {member.name}</DialogTitle>
          <DialogDescription>
            Profiles and direct grants are separate inputs. Effective permissions show the result enforced by the backend.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className='flex max-h-[70dvh] flex-col gap-6 overflow-y-auto'>
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

          <section className='flex flex-col gap-3'>
            <div>
              <h3 className='text-balance text-sm font-medium'>Direct permission overrides</h3>
              <p className='text-muted-foreground text-pretty text-xs'>
                These grants are independent from the selected profile.
              </p>
            </div>
            {permissions.length > 0 ? (
              <FieldGroup>
                {permissions.map((permission) => {
                  const checked = directPermissionIds.has(permission.id);
                  return (
                    <Field
                      data-disabled={!canSetDirectPermission || Boolean(pendingKey)}
                      key={permission.id}
                      orientation='horizontal'
                    >
                      <Checkbox
                        aria-label={`${checked ? 'Revoke' : 'Grant'} ${permission.name} directly`}
                        checked={checked}
                        disabled={!canSetDirectPermission || Boolean(pendingKey)}
                        id={`${fieldId}-direct-${permission.id}`}
                        onCheckedChange={(nextChecked) => void run(
                          `direct-${permission.id}`,
                          () => actions!.setDirectPermission!({
                            userId: member.userId,
                            permissionId: permission.id,
                            granted: nextChecked === true
                          }),
                          'The direct permission could not be changed.'
                        )}
                      />
                      <div className='min-w-0 flex-1'>
                        <FieldLabel htmlFor={`${fieldId}-direct-${permission.id}`}>
                          {permission.name}
                        </FieldLabel>
                        {permission.description ? (
                          <FieldDescription className='text-pretty'>{permission.description}</FieldDescription>
                        ) : null}
                      </div>
                    </Field>
                  );
                })}
              </FieldGroup>
            ) : (
              <p className='text-muted-foreground text-pretty text-sm'>
                The permission catalog is unavailable for this tenant.
              </p>
            )}
          </section>

          <section className='flex flex-col gap-3'>
            <div>
              <h3 className='text-balance text-sm font-medium'>Effective permissions</h3>
              <p className='text-muted-foreground text-pretty text-xs'>
                This read-only result includes profile, direct, admin, and owner access.
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              {permissions.filter((permission) => effectivePermissionIds.has(permission.id)).map(
                (permission) => <Badge key={permission.id} variant='outline'>{permission.name}</Badge>
              )}
              {effectivePermissionIds.size === 0 ? (
                <span className='text-muted-foreground text-sm'>No effective permissions</span>
              ) : null}
            </div>
          </section>
          {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
        </DialogPanel>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} type='button' variant='outline'>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersDirectory({
  members,
  query,
  onClearSearch,
  emptyAction,
  profiles,
  permissions,
  policy,
  actions,
  onError
}: Readonly<{
  members: readonly AppMember[];
  query: string;
  onClearSearch: () => void;
  emptyAction?: React.ReactNode;
  profiles: readonly AppAccessProfile[];
  permissions: readonly AppPermission[];
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
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
      <Empty className='min-h-40 border border-dashed'>
        <EmptyHeader>
          <EmptyMedia variant='icon'><SearchIcon aria-hidden='true' /></EmptyMedia>
          <EmptyTitle>No application members to show</EmptyTitle>
          <EmptyDescription>People with access to this application will appear here.</EmptyDescription>
        </EmptyHeader>
        {emptyAction ? <EmptyContent>{emptyAction}</EmptyContent> : null}
      </Empty>
    );
  }

  return (
    <ul
      aria-label='Application members'
      className='border-border/70 divide-border/60 divide-y overflow-hidden rounded-xl border'
    >
      {members.map((member) => (
        <li
          className='flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4'
          key={member.id}
        >
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            <Avatar className='ring-border/50 size-10 shrink-0 ring-1 ring-inset'>
              {member.avatarUrl ? <AvatarImage alt='' src={member.avatarUrl} /> : null}
              <AvatarFallback>{initials(member.name)}</AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <p className='truncate text-sm font-medium'>{member.name}</p>
              <p className='text-muted-foreground truncate text-xs sm:text-sm'>{member.email}</p>
              <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                {member.profile?.name ?? 'No access profile'}
                {member.joinedAt ? <>{' · Joined '}<FeaturePackTimestamp value={member.joinedAt} /></> : null}
              </p>
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            {member.governance.owner ? <Badge>Owner</Badge> : null}
            {!member.governance.owner && member.governance.admin ? <Badge variant='secondary'>Admin</Badge> : null}
            <FeatureStatusBadge status={memberStatus(member)} />
            {(profiles.length > 0 || permissions.length > 0) ? (
              <MemberAccessDialog
                actions={actions}
                member={member}
                onError={onError}
                permissions={permissions}
                policy={policy}
                profiles={profiles}
              />
            ) : null}
            <MemberActions actions={actions} member={member} onError={onError} policy={policy} />
          </div>
        </li>
      ))}
    </ul>
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
      <AlertDialogTrigger render={<Button size='sm' variant='outline' />}>Cancel</AlertDialogTrigger>
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
  canInvite,
  inviteAction,
  policy,
  actions,
  onError
}: Readonly<{
  invitations: readonly AppInvite[];
  canInvite: boolean;
  inviteAction: React.ReactNode;
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [error, setError] = React.useState<string>();
  const [pendingInviteId, setPendingInviteId] = React.useState<string>();

  if (invitations.length === 0) {
    return (
      <Empty className='min-h-48 border border-dashed'>
        <EmptyHeader>
          <EmptyMedia variant='icon'><MailPlusIcon aria-hidden='true' /></EmptyMedia>
          <EmptyTitle>No pending invitations</EmptyTitle>
          <EmptyDescription>Invite a collaborator when they are ready to join this application.</EmptyDescription>
        </EmptyHeader>
        {canInvite && inviteAction ? <EmptyContent>{inviteAction}</EmptyContent> : null}
      </Empty>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
      <ul
        aria-label='Application invitations'
        className='border-border/70 divide-border/60 divide-y overflow-hidden rounded-xl border'
      >
        {invitations.map((invite) => (
          <li
            className='flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4'
            key={invite.id}
          >
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium'>{invite.recipient}</p>
              <p className='text-muted-foreground mt-0.5 text-xs'>
                {invite.profile?.name ?? 'No access profile'}
                {invite.expiresAt ? <>{' · Expires '}<FeaturePackTimestamp value={invite.expiresAt} /></> : null}
                {invite.useLimit !== undefined ? <>{' · '}<span className='tabular-nums'>{invite.useCount ?? 0}/{invite.useLimit}</span>{' uses'}</> : null}
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
              {invite.channel ? <Badge variant='outline'>{invite.channel}</Badge> : null}
              <FeatureStatusBadge status={invite.status} />
              {canPerform(policy, 'extendInvite') &&
              canPerform(invite.actionPolicy, 'extendInvite') && actions?.extendInvite ? (
                <Button
                  aria-label={`Extend invitation for ${invite.recipient}`}
                  disabled={pendingInviteId === invite.id}
                  onClick={() => void (async () => {
                    setPendingInviteId(invite.id);
                    try {
                      await actions.extendInvite!({ inviteId: invite.id });
                    } catch (cause) {
                      reportActionError(
                        cause,
                        'The invitation could not be extended.',
                        setError,
                        onError
                      );
                    } finally {
                      setPendingInviteId(undefined);
                    }
                  })()}
                  size='icon-sm'
                  variant='ghost'
                >
                  <RefreshCwIcon />
                </Button>
              ) : null}
              {canPerform(policy, 'cancelInvite') &&
              canPerform(invite.actionPolicy, 'cancelInvite') && actions?.cancelInvite ? (
                <CancelInviteAction cancelInvite={actions.cancelInvite} invite={invite} onError={onError} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AcceptedInvitesDirectory({
  invitations
}: Readonly<{ invitations: readonly AppClaimedInvite[] }>) {
  if (invitations.length === 0) {
    return (
      <Empty className='min-h-48 border border-dashed'>
        <EmptyHeader>
          <EmptyMedia variant='icon'><HistoryIcon aria-hidden='true' /></EmptyMedia>
          <EmptyTitle>No accepted invitations</EmptyTitle>
          <EmptyDescription>Accepted application invitations will appear here as an audit history.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recipient</TableHead>
          <TableHead>Invited by</TableHead>
          <TableHead>Accepted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invite) => (
          <TableRow key={invite.id}>
            <TableCell>
              <p className='font-medium'>{invite.receiverName ?? invite.receiverId ?? 'Unknown member'}</p>
            </TableCell>
            <TableCell>{invite.senderName ?? invite.senderId ?? 'Unknown sender'}</TableCell>
            <TableCell><FeaturePackTimestamp value={invite.acceptedAt} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
      const input = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined
      };
      if (profile) {
        await (action as NonNullable<UsersFeatureActions['updateProfile']>)({
          profileId: profile.id,
          ...input
        });
      } else {
        await (action as NonNullable<UsersFeatureActions['createProfile']>)(input);
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
      <DialogTrigger render={<Button size={profile ? 'icon-sm' : 'default'} variant={profile ? 'ghost' : 'default'} />}>
        {profile ? <PencilIcon /> : <PlusIcon data-icon='inline-start' />}
        {profile ? <span className='sr-only'>Edit {profile.name}</span> : 'New profile'}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>{profile ? `Edit ${profile.name}` : 'Create an access profile'}</DialogTitle>
            <DialogDescription>
              Profiles bundle permissions. Application ownership and admin governance stay separate.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FieldGroup>
              <Field error={error} htmlFor={`${fieldId}-name`} label='Name' required>
                <Input
                  aria-invalid={error ? true : undefined}
                  id={`${fieldId}-name`}
                  onChange={(event) => setName(event.currentTarget.value)}
                  placeholder='Support agent'
                  value={name}
                />
              </Field>
              <Field htmlFor={`${fieldId}-slug`} label='Slug' required>
                <Input
                  id={`${fieldId}-slug`}
                  onChange={(event) => setSlug(event.currentTarget.value)}
                  placeholder='support-agent'
                  value={slug}
                />
              </Field>
              <Field htmlFor={`${fieldId}-description`} label='Description'>
                <Textarea
                  id={`${fieldId}-description`}
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

function ProfileRow({
  profile,
  permissions,
  policy,
  actions,
  onError
}: Readonly<{
  profile: AppAccessProfile;
  permissions: readonly AppPermission[];
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
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
  const canCompose = canPerform(policy, 'setProfilePermission') &&
    canPerform(profilePolicy, 'setProfilePermission') && Boolean(actions?.setProfilePermission);
  const profilePermissionIds = new Set(profile.permissionIds);
  const fieldId = React.useId();

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
    <li className='flex flex-col gap-4 px-4 py-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-balance text-sm font-medium'>{profile.name}</h3>
            {profile.default ? <Badge>Default</Badge> : null}
            {profile.system ? <Badge variant='secondary'>System</Badge> : null}
          </div>
          <p className='text-muted-foreground mt-1 text-pretty text-xs'>
            {profile.description ?? profile.slug ?? 'No description'}
          </p>
          <p className='text-muted-foreground mt-1 text-xs tabular-nums'>
            {profile.permissionIds.length} {profile.permissionIds.length === 1 ? 'permission' : 'permissions'}
            {profile.memberCount !== undefined ? ` · ${profile.memberCount} members` : ''}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-1'>
          {!profile.default && canSetDefault && actions?.setDefaultProfile ? (
            <Button
              disabled={Boolean(pendingKey)}
              onClick={() => void run(
                'default',
                () => actions.setDefaultProfile!({ profileId: profile.id }),
                'The default profile could not be changed.'
              )}
              size='sm'
              variant='outline'
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
                render={<Button size='icon-sm' variant='ghost' />}
              >
                <Trash2Icon />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {profile.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Members assigned to this profile may lose profile-based permissions. This cannot be undone.
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
      {permissions.length > 0 ? (
        <FieldGroup className='grid sm:grid-cols-2'>
          {permissions.map((permission) => {
            const checked = profilePermissionIds.has(permission.id);
            return (
              <Field
                data-disabled={!canCompose || Boolean(pendingKey)}
                key={permission.id}
                orientation='horizontal'
              >
                <Checkbox
                  aria-label={`${checked ? 'Remove' : 'Add'} ${permission.name} ${checked ? 'from' : 'to'} ${profile.name}`}
                  checked={checked}
                  disabled={!canCompose || Boolean(pendingKey)}
                  id={`${fieldId}-${permission.id}`}
                  onCheckedChange={(nextChecked) => void run(
                    `permission-${permission.id}`,
                    () => actions!.setProfilePermission!({
                      profileId: profile.id,
                      permissionId: permission.id,
                      granted: nextChecked === true
                    }),
                    'The profile permission could not be changed.'
                  )}
                />
                <div className='min-w-0 flex-1'>
                  <FieldLabel htmlFor={`${fieldId}-${permission.id}`}>{permission.name}</FieldLabel>
                  {permission.description ? <FieldDescription>{permission.description}</FieldDescription> : null}
                </div>
              </Field>
            );
          })}
        </FieldGroup>
      ) : null}
      {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
    </li>
  );
}

function ProfilesDirectory({
  profiles,
  permissions,
  policy,
  actions,
  onError
}: Readonly<{
  profiles: readonly AppAccessProfile[];
  permissions: readonly AppPermission[];
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const canCreate = canPerform(policy, 'createProfile') && Boolean(actions?.createProfile);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-balance text-sm font-medium'>Access profiles</h2>
          <p className='text-muted-foreground text-pretty text-xs'>
            Named permission bundles for application members. Owner and admin grants remain separate.
          </p>
        </div>
        {canCreate && actions?.createProfile ? (
          <ProfileFormDialog action={actions.createProfile} onError={onError} />
        ) : null}
      </div>
      {profiles.length > 0 ? (
        <ul className='border-border/70 divide-border/60 divide-y overflow-hidden rounded-xl border'>
          {profiles.map((profile) => (
            <ProfileRow
              actions={actions}
              key={profile.id}
              onError={onError}
              permissions={permissions}
              policy={policy}
              profile={profile}
            />
          ))}
        </ul>
      ) : (
        <Empty className='min-h-48 border border-dashed'>
          <EmptyHeader>
            <EmptyMedia variant='icon'><ShieldIcon aria-hidden='true' /></EmptyMedia>
            <EmptyTitle>No access profiles</EmptyTitle>
            <EmptyDescription>Create a reusable permission bundle for application members.</EmptyDescription>
          </EmptyHeader>
          {canCreate && actions?.createProfile ? (
            <EmptyContent><ProfileFormDialog action={actions.createProfile} onError={onError} /></EmptyContent>
          ) : null}
        </Empty>
      )}
    </div>
  );
}

function PermissionsCatalog({ permissions }: Readonly<{ permissions: readonly AppPermission[] }>) {
  if (permissions.length === 0) {
    return (
      <Empty className='min-h-48 border border-dashed'>
        <EmptyHeader>
          <EmptyMedia variant='icon'><KeyRoundIcon aria-hidden='true' /></EmptyMedia>
          <EmptyTitle>No application permissions</EmptyTitle>
          <EmptyDescription>This tenant does not expose a permission catalog.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <Alert>
        <ShieldCheckIcon aria-hidden='true' />
        <AlertTitle>Permission definitions are read-only</AlertTitle>
        <AlertDescription>
          Console Kit assigns existing permissions through profiles, defaults, and direct grants. It never rewrites the backend catalog.
        </AlertDescription>
      </Alert>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Permission</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Bit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((permission) => (
            <TableRow key={permission.id}>
              <TableCell className='font-medium'>{permission.name}</TableCell>
              <TableCell className='max-w-xl whitespace-normal text-pretty text-muted-foreground'>
                {permission.description ?? '—'}
              </TableCell>
              <TableCell className='tabular-nums'>{permission.bit ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PermissionDefaults({
  permissions,
  defaultPermissionIds,
  policy,
  actions,
  onError
}: Readonly<{
  permissions: readonly AppPermission[];
  defaultPermissionIds: readonly string[];
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [pendingId, setPendingId] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const canUpdate = canPerform(policy, 'setDefaultPermission') &&
    Boolean(actions?.setDefaultPermission);
  const defaults = new Set(defaultPermissionIds);
  const fieldId = React.useId();

  const update = async (permissionId: string, granted: boolean) => {
    if (!actions?.setDefaultPermission) return;
    setPendingId(permissionId);
    setError(undefined);
    try {
      await actions.setDefaultPermission({ permissionId, granted });
    } catch (cause) {
      reportActionError(cause, 'The default permission could not be changed.', setError, onError);
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <h2 className='text-balance text-sm font-medium'>New-member permission defaults</h2>
        <p className='text-muted-foreground text-pretty text-xs'>
          These permissions apply to new application memberships. Existing members keep their current grants.
        </p>
      </div>
      {permissions.length > 0 ? (
        <FieldGroup className='border-border/70 rounded-xl border p-4'>
          {permissions.map((permission) => {
            const checked = defaults.has(permission.id);
            return (
              <Field
                data-disabled={!canUpdate || Boolean(pendingId)}
                key={permission.id}
                orientation='horizontal'
              >
                <Checkbox
                  aria-label={`${checked ? 'Remove' : 'Add'} ${permission.name} ${checked ? 'from' : 'to'} new-member defaults`}
                  checked={checked}
                  disabled={!canUpdate || Boolean(pendingId)}
                  id={`${fieldId}-${permission.id}`}
                  onCheckedChange={(nextChecked) => void update(
                    permission.id,
                    nextChecked === true
                  )}
                />
                <div className='min-w-0 flex-1'>
                  <FieldLabel htmlFor={`${fieldId}-${permission.id}`}>{permission.name}</FieldLabel>
                  {permission.description ? <FieldDescription>{permission.description}</FieldDescription> : null}
                </div>
              </Field>
            );
          })}
        </FieldGroup>
      ) : (
        <p className='text-muted-foreground text-pretty text-sm'>
          Permission defaults require the application permission catalog.
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
  title = 'App access',
  description,
  onError
}: UsersFeaturePackProps) {
  const [query, setQuery] = React.useState('');
  const [internalSection, setInternalSection] = React.useState<UsersSection>(defaultSection);
  const normalizedQuery = query.trim().toLowerCase();
  const canInvite = canPerform(policy, 'invite') && Boolean(actions?.invite);

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
        const permissions = data.permissions ?? [];
        const invitations = data.invitations ?? [];
        const acceptedInvites = data.acceptedInvites ?? [];
        const members = data.members.filter((member) => {
          if (!normalizedQuery) return true;
          return `${member.name} ${member.email} ${member.profile?.name ?? ''} ${member.governance.owner ? 'owner' : ''} ${member.governance.admin ? 'admin' : ''}`
            .toLowerCase()
            .includes(normalizedQuery);
        });
        const sections: Array<Readonly<{ id: UsersSection; label: string; count?: number }>> = [
          { id: 'members', label: 'Members', count: data.members.length },
          ...(data.invitations !== undefined
            ? [{ id: 'invitations' as const, label: 'Invitations', count: invitations.length }]
            : []),
          ...(data.acceptedInvites !== undefined
            ? [{ id: 'accepted-invites' as const, label: 'Accepted', count: acceptedInvites.length }]
            : []),
          ...(data.profiles !== undefined
            ? [{ id: 'profiles' as const, label: 'Profiles', count: profiles.length }]
            : []),
          ...(data.permissions !== undefined
            ? [{ id: 'permissions' as const, label: 'Permissions', count: permissions.length }]
            : []),
          ...(data.defaultPermissionIds !== undefined
            ? [{ id: 'defaults' as const, label: 'Defaults' }]
            : [])
        ];
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

        const changeSection = (value: string) => {
          const nextSection = value as UsersSection;
          if (!sections.some((candidate) => candidate.id === nextSection)) return;
          if (controlledSection === undefined) setInternalSection(nextSection);
          onSectionChange?.(nextSection);
        };

        return (
          <div className='flex flex-col gap-6'>
            <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
              <div className='min-w-0'>
                <h1 className='text-balance text-lg font-semibold lg:text-xl'>{title}</h1>
                <p className='text-muted-foreground mt-1 text-pretty text-sm'>
                  {description ?? (
                    <>
                      <span className='tabular-nums'>{data.members.length}</span>{' '}
                      {data.members.length === 1 ? 'application member' : 'application members'}
                      {activeCount !== data.members.length ? (
                        <>{' · '}<span className='tabular-nums'>{activeCount}</span>{' active'}</>
                      ) : null}
                    </>
                  )}
                </p>
              </div>
              {activeSection === 'invitations' && invitations.length > 0
                ? inviteAction
                : null}
            </header>

            <Tabs onValueChange={changeSection} value={activeSection}>
              <div className='flex flex-col gap-4'>
                <TabsList
                  aria-label='App access sections'
                  className='h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border/60 bg-transparent p-0'
                >
                  {sections.map((candidate) => (
                    <TabsTrigger className={sectionTriggerClass} key={candidate.id} value={candidate.id}>
                      {candidate.label}
                      {candidate.count !== undefined ? (
                        <span className='text-muted-foreground ml-1.5 tabular-nums text-xs'>
                          {candidate.count}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {activeSection === 'members' ? (
                  <label className='block w-full self-end sm:max-w-xs'>
                    <span className='sr-only'>Search application members</span>
                    <InputGroup>
                      <InputGroupAddon><SearchIcon aria-hidden='true' /></InputGroupAddon>
                      <InputGroupInput
                        onChange={(event) => setQuery(event.currentTarget.value)}
                        placeholder='Search application members'
                        type='search'
                        value={query}
                      />
                    </InputGroup>
                  </label>
                ) : null}
              </div>

              <TabsContent className='mt-5 outline-none' value='members'>
                <MembersDirectory
                  actions={actions}
                  emptyAction={inviteAction}
                  members={members}
                  onClearSearch={() => setQuery('')}
                  onError={onError}
                  permissions={permissions}
                  policy={policy}
                  profiles={profiles}
                  query={query}
                />
              </TabsContent>
              {data.invitations !== undefined ? (
                <TabsContent className='mt-5 outline-none' value='invitations'>
                  <InvitationsDirectory
                    actions={actions}
                    canInvite={canInvite}
                    invitations={invitations}
                    inviteAction={inviteAction}
                    onError={onError}
                    policy={policy}
                  />
                </TabsContent>
              ) : null}
              {data.acceptedInvites !== undefined ? (
                <TabsContent className='mt-5 outline-none' value='accepted-invites'>
                  <AcceptedInvitesDirectory invitations={acceptedInvites} />
                </TabsContent>
              ) : null}
              {data.profiles !== undefined ? (
                <TabsContent className='mt-5 outline-none' value='profiles'>
                  <ProfilesDirectory
                    actions={actions}
                    onError={onError}
                    permissions={permissions}
                    policy={policy}
                    profiles={profiles}
                  />
                </TabsContent>
              ) : null}
              {data.permissions !== undefined ? (
                <TabsContent className='mt-5 outline-none' value='permissions'>
                  <PermissionsCatalog permissions={permissions} />
                </TabsContent>
              ) : null}
              {data.defaultPermissionIds !== undefined ? (
                <TabsContent className='mt-5 outline-none' value='defaults'>
                  <PermissionDefaults
                    actions={actions}
                    defaultPermissionIds={data.defaultPermissionIds}
                    onError={onError}
                    permissions={permissions}
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

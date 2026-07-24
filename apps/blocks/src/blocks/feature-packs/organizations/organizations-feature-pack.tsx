'use client';

import * as React from 'react';
import {
  Building2Icon,
  CheckIcon,
  CopyIcon,
  MailPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UserMinusIcon
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@constructive-io/ui/avatar';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
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
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
import {
  Empty,
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
import { Switch } from '@constructive-io/ui/switch';
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
import { cn } from '@/lib/utils';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionResult,
  type FeaturePackError
} from '../shared/feature-pack-contracts';
import {
  FeaturePackBoundary,
  FeaturePackFilteredEmpty,
  FeaturePackLimitations,
  FeaturePackPageHeader,
  FeatureStatusBadge,
  FeaturePackTimestamp
} from '../shared/feature-pack-ui';
import type {
  OrganizationInvite,
  OrganizationMember,
  OrganizationAccessProfile,
  OrganizationsFeatureActions,
  OrganizationsFeaturePackProps,
  OrganizationsSection
} from './organizations-contracts';
import {
  OrganizationDefaultsPanel,
  OrganizationMemberAccessDialog,
  OrganizationPermissionsPanel,
  OrganizationProfilesPanel
} from './organizations-access-panels';
import {
  OrganizationApiKeysPanel,
  OrganizationHierarchyPanel,
  OrganizationPrincipalsPanel,
  OrganizationSettingsPanel
} from './organizations-operation-panels';

export * from './organizations-contracts';

const NO_PROFILE_VALUE = '__no_profile__';
const focusedRecordClass =
  'bg-muted/60 outline outline-2 outline-offset-[-2px] outline-ring';

function initials(value: string): string {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function CreateOrganizationDialog({
  open: controlledOpen,
  onOpenChange,
  onSubmit
}: Readonly<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: { value: string; role?: string }) => Promise<
    | Readonly<{ ok: true }>
    | Readonly<{ ok: false; error: FeaturePackError }>
  >;
}>) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();
  const open = controlledOpen ?? internalOpen;
  const changeOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await onSubmit({
        value: value.trim()
      });
      if (result.ok) {
        setValue('');
        changeOpen(false);
      } else if ('error' in result) {
        setError(result.error.message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        changeOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
    >
      <DialogTrigger render={<Button variant='outline' />}>
        <PlusIcon data-icon='inline-start' />
        New organization
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Create an organization</DialogTitle>
            <DialogDescription>
              Create a tenant boundary for memberships and organization-owned resources.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className='flex flex-col gap-4'>
            <Field
              error={error}
              htmlFor={`${fieldId}-value`}
              label='Organization name'
              required
            >
              <Input
                aria-invalid={error ? true : undefined}
                id={`${fieldId}-value`}
                onChange={(event) => setValue(event.currentTarget.value)}
                required
                type='text'
                value={value}
              />
            </Field>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !value.trim()} type='submit'>
              {pending ? 'Creating…' : 'Create organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrganizationInviteDialog({
  profiles,
  assignableProfileIds,
  onSubmit
}: Readonly<{
  profiles: readonly OrganizationAccessProfile[];
  assignableProfileIds: readonly string[];
  onSubmit: (input: {
    channel: 'email' | 'sms' | 'link';
    recipient?: string;
    profileId?: string;
    expiresAt?: string;
    multiple?: boolean;
    inviteLimit?: number;
    isReadOnly?: boolean;
  }) => Promise<Readonly<{ ok: true }> | Readonly<{ ok: false; error: FeaturePackError }>>;
}>) {
  const [open, setOpen] = React.useState(false);
  const [channel, setChannel] = React.useState<'email' | 'sms' | 'link'>('email');
  const [recipient, setRecipient] = React.useState('');
  const [profileId, setProfileId] = React.useState('');
  const [expiresAt, setExpiresAt] = React.useState('');
  const [multiple, setMultiple] = React.useState(false);
  const [inviteLimit, setInviteLimit] = React.useState('');
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();
  const assignableProfiles = React.useMemo(
    () => profiles.filter((profile) => assignableProfileIds.includes(profile.id)),
    [assignableProfileIds, profiles]
  );
  const needsRecipient = channel !== 'link';
  const canAssignProfile = channel === 'email' && !multiple;

  React.useEffect(() => {
    setProfileId((current) => assignableProfiles.some((profile) => profile.id === current)
      ? current
      : '');
  }, [assignableProfiles]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (needsRecipient && !recipient.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await onSubmit({
        channel,
        recipient: needsRecipient ? recipient.trim() : undefined,
        profileId: canAssignProfile && assignableProfiles.some(
          (profile) => profile.id === profileId
        ) ? profileId : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        multiple: channel === 'link' ? multiple : false,
        inviteLimit: channel === 'link' && inviteLimit ? Number(inviteLimit) : undefined,
        isReadOnly
      });
      if (result.ok) {
        setOpen(false);
        setRecipient('');
        setProfileId('');
        setExpiresAt('');
        setMultiple(false);
        setInviteLimit('');
        setIsReadOnly(false);
      } else if ('error' in result) {
        setError(result.error.message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
      open={open}
    >
      <DialogTrigger render={<Button />}>
        <MailPlusIcon data-icon='inline-start' />Invite member
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Invite an organization member</DialogTitle>
            <DialogDescription>
              Email and SMS invites target one recipient. Reusable links require a verified email when redeemed.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FieldGroup>
              <Field htmlFor={`${fieldId}-channel`} label='Delivery channel'>
                <Select
                  onValueChange={(value) => {
                    const nextChannel = value as typeof channel;
                    setChannel(nextChannel);
                    if (nextChannel !== 'email') setProfileId('');
                    if (nextChannel !== 'link') {
                      setMultiple(false);
                      setInviteLimit('');
                    }
                  }}
                  value={channel}
                >
                  <SelectTrigger id={`${fieldId}-channel`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value='email'>Email</SelectItem>
                    <SelectItem value='sms'>SMS</SelectItem>
                    <SelectItem value='link'>Reusable link</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              {needsRecipient ? (
                <Field
                  error={error}
                  htmlFor={`${fieldId}-recipient`}
                  label={channel === 'sms' ? 'Phone number' : 'Email address'}
                  required
                >
                  <Input
                    aria-invalid={error ? true : undefined}
                    id={`${fieldId}-recipient`}
                    onChange={(event) => setRecipient(event.currentTarget.value)}
                    placeholder={channel === 'sms' ? '+15551234567' : 'person@example.com'}
                    required
                    type={channel === 'email' ? 'email' : 'tel'}
                    value={recipient}
                  />
                </Field>
              ) : error ? <p className='text-destructive text-sm' role='alert'>{error}</p> : null}
              {assignableProfiles.length > 0 ? (
                <Field
                  data-disabled={!canAssignProfile}
                  htmlFor={`${fieldId}-profile`}
                  label='Access profile'
                >
                  <Select
                    disabled={!canAssignProfile}
                    onValueChange={(value) => setProfileId(
                      value === NO_PROFILE_VALUE ? '' : value
                    )}
                    value={profileId || NO_PROFILE_VALUE}
                  >
                    <SelectTrigger id={`${fieldId}-profile`}>
                      <SelectValue>
                        {(value: string | null) => value === NO_PROFILE_VALUE
                          ? 'No profile'
                          : assignableProfiles.find((profile) => profile.id === value)?.name ?? value}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem value={NO_PROFILE_VALUE}>No profile</SelectItem>
                      {assignableProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                      ))}
                    </SelectGroup></SelectContent>
                  </Select>
                  <FieldDescription>
                    Access profiles can be attached only to single-use email invitations.
                  </FieldDescription>
                </Field>
              ) : null}
              <Field htmlFor={`${fieldId}-expires`} label='Expires at'>
                <Input
                  id={`${fieldId}-expires`}
                  onChange={(event) => setExpiresAt(event.currentTarget.value)}
                  type='datetime-local'
                  value={expiresAt}
                />
              </Field>
              <Field orientation='horizontal'>
                <div className='min-w-0 flex-1'>
                  <FieldLabel htmlFor={`${fieldId}-read-only`}>Read-only membership</FieldLabel>
                  <FieldDescription>The membership is created with its read-only scope enabled.</FieldDescription>
                </div>
                <Switch
                  checked={isReadOnly}
                  id={`${fieldId}-read-only`}
                  onCheckedChange={setIsReadOnly}
                />
              </Field>
              {channel === 'link' ? (
                <>
                  <Field orientation='horizontal'>
                    <div className='min-w-0 flex-1'>
                      <FieldLabel htmlFor={`${fieldId}-multiple`}>Allow multiple claims</FieldLabel>
                      <FieldDescription>Keep the link valid until its claim limit or expiry.</FieldDescription>
                    </div>
                    <Switch
                      checked={multiple}
                      id={`${fieldId}-multiple`}
                      onCheckedChange={(checked) => {
                        setMultiple(checked);
                        if (checked) setProfileId('');
                      }}
                    />
                  </Field>
                  {multiple ? (
                    <Field htmlFor={`${fieldId}-limit`} label='Claim limit'>
                      <Input
                        id={`${fieldId}-limit`}
                        min={1}
                        onChange={(event) => setInviteLimit(event.currentTarget.value)}
                        type='number'
                        value={inviteLimit}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}
            </FieldGroup>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || (needsRecipient && !recipient.trim())} type='submit'>
              {pending ? 'Creating…' : channel === 'link' ? 'Create invite link' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrganizationMemberActions({
  member,
  organizationId,
  removeMember,
  onError
}: Readonly<{
  member: OrganizationMember;
  organizationId: string;
  removeMember: NonNullable<OrganizationsFeatureActions['removeMember']>;
  onError?: OrganizationsFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const remove = async () => {
    setPending(true);
    setError(undefined);
    try {
      await removeMember({ organizationId, membershipId: member.id });
      setOpen(false);
    } catch (cause) {
      const normalized = normalizeFeaturePackError(
        cause,
        'The organization member could not be removed.'
      );
      setError(normalized.message);
      onError?.(normalized);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`Actions for ${member.name}`} render={<Button size='icon' variant='ghost' />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => setOpen(true)} variant='destructive'>
            <UserMinusIcon />
            Remove membership
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (!pending) {
            setOpen(nextOpen);
            if (!nextOpen) setError(undefined);
          }
        }}
        open={open}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This revokes the member&apos;s access to this organization. Their personal account remains intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button disabled={pending} onClick={() => void remove()} variant='destructive'>
              {pending ? 'Removing…' : 'Remove membership'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CancelOrganizationInviteAction({
  invite,
  organizationId,
  cancelInvite,
  onError
}: Readonly<{
  invite: OrganizationInvite;
  organizationId: string;
  cancelInvite: NonNullable<OrganizationsFeatureActions['cancelInvite']>;
  onError?: OrganizationsFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const cancel = async () => {
    setPending(true);
    setError(undefined);
    try {
      await cancelInvite({ organizationId, inviteId: invite.id });
      setOpen(false);
    } catch (cause) {
      const normalized = normalizeFeaturePackError(
        cause,
        'The invitation could not be canceled.'
      );
      setError(normalized.message);
      onError?.(normalized);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
          if (!nextOpen) setError(undefined);
        }
      }}
      open={open}
    >
      <AlertDialogTrigger render={<Button size='sm' variant='outline' />}>
        Cancel
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel invitation for {invite.recipient}?</AlertDialogTitle>
          <AlertDialogDescription>
            The organization invitation link will stop working. You can invite this person again later.
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

function CopyOrganizationInviteTokenAction({ token }: Readonly<{ token: string }>) {
  const [state, setState] = React.useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const copy = async () => {
    setState('copying');
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable.');
      }
      await navigator.clipboard.writeText(token);
      setState('copied');
    } catch {
      setState('error');
    }
  };

  return (
    <div className='flex flex-col items-end gap-1'>
      <Button
        disabled={state === 'copying'}
        onClick={() => void copy()}
        size='sm'
        variant='outline'
      >
        <CopyIcon data-icon='inline-start' />
        {state === 'copying' ? 'Copying…' : state === 'copied' ? 'Copied' : 'Copy token'}
      </Button>
      {state === 'copied' ? (
        <span className='text-muted-foreground text-pretty text-xs' role='status'>
          Invitation token copied.
        </span>
      ) : null}
      {state === 'error' ? (
        <span className='text-destructive text-pretty text-xs' role='alert'>
          The invitation token could not be copied.
        </span>
      ) : null}
    </div>
  );
}

export function OrganizationsFeaturePack({
  resource,
  policy,
  actions,
  section: controlledSection,
  defaultSection = 'members',
  onSectionChange,
  createOrganizationOpen,
  onCreateOrganizationOpenChange,
  focusedMemberId,
  focusedInvitationId,
  focusedProfileId,
  developerView = 'all',
  onError
}: OrganizationsFeaturePackProps) {
  const [query, setQuery] = React.useState('');
  const [selectionError, setSelectionError] = React.useState<string>();
  const [internalSection, setInternalSection] = React.useState<OrganizationsSection>(
    defaultSection
  );
  const focusedMemberRef = React.useCallback(
    (element: HTMLTableRowElement | null) => {
      if (!element || !focusedMemberId) return;
      element.focus({ preventScroll: true });
      element.scrollIntoView?.({ block: 'nearest' });
    },
    [focusedMemberId]
  );
  const focusedInvitationRef = React.useRef<HTMLTableRowElement>(null);
  const focusedInvitationPresent = resource.status === 'ready' && Boolean(
    focusedInvitationId && resource.data.invites?.some(
      (invite) => invite.id === focusedInvitationId
    )
  );

  React.useEffect(() => {
    if (focusedMemberId) setQuery('');
  }, [focusedMemberId]);

  React.useEffect(() => {
    if (!focusedInvitationPresent) return;
    const element = focusedInvitationRef.current;
    element?.focus({ preventScroll: true });
    element?.scrollIntoView?.({ block: 'nearest' });
  }, [focusedInvitationId, focusedInvitationPresent]);

  const run = async (
    action: () => FeatureActionResult,
    fallback: string
  ): Promise<Readonly<{ ok: true }> | Readonly<{ ok: false; error: FeaturePackError }>> => {
    try {
      await action();
      return { ok: true };
    } catch (cause) {
      const error = normalizeFeaturePackError(cause, fallback);
      onError?.(error);
      return { ok: false, error };
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <FeaturePackPageHeader
        actions={
          resource.status === 'ready' && canPerform(policy, 'createOrganization') && actions?.createOrganization ? (
            <CreateOrganizationDialog
              onOpenChange={onCreateOrganizationOpenChange}
              onSubmit={({ value }) => run(() => actions.createOrganization!({ name: value }), 'The organization could not be created.')}
              open={createOrganizationOpen}
            />
          ) : null
        }
        title='Organizations'
      />
      <FeaturePackLimitations
        limitations={resource.status === 'ready' ? resource.limitations : undefined}
      />
      <FeaturePackBoundary
        emptyAction={
          canPerform(policy, 'createOrganization') && actions?.createOrganization ? (
            <CreateOrganizationDialog
              onOpenChange={onCreateOrganizationOpenChange}
              onSubmit={({ value }) => run(() => actions.createOrganization!({ name: value }), 'The organization could not be created.')}
              open={createOrganizationOpen}
            />
          ) : null
        }
        emptyDescription='Create the first organization when this app needs tenant-owned data.'
        emptyTitle='No organizations yet'
        resource={resource}
      >
        {(data) => {
          const active = data.organizations.find((organization) => organization.id === data.activeOrganizationId)
            ?? data.organizations[0];
          const normalized = query.trim().toLowerCase();
          const members = data.members.filter((member) =>
            !normalized || `${member.name} ${member.email} ${member.governance} ${member.profileName ?? ''}`.toLowerCase().includes(normalized)
          );
          const sections: Array<Readonly<{
            id: OrganizationsSection;
            label: string;
            count?: number;
          }>> = [
            { id: 'members', label: 'Members', count: data.members.length },
            ...(data.invites === undefined && data.claimedInvites === undefined
              ? []
              : [{
                  id: 'invitations' as const,
                  label: 'Invitations',
                  count: (data.invites?.length ?? 0) + (data.claimedInvites?.length ?? 0)
                }]),
            ...(data.profiles === undefined
              ? []
              : [{ id: 'profiles' as const, label: 'Profiles', count: data.profiles.length }]),
            ...(data.permissions === undefined
              ? []
              : [{ id: 'permissions' as const, label: 'Permissions', count: data.permissions.length }]),
            ...(data.membershipDefault === undefined
              ? []
              : [{ id: 'defaults' as const, label: 'Defaults' }]),
            ...(data.hierarchy === undefined
              ? []
              : [{ id: 'hierarchy' as const, label: 'Hierarchy', count: data.hierarchy.length }]),
            { id: 'settings', label: 'Settings' },
            ...(data.apiKeys === undefined && data.principals === undefined
              ? []
              : [{
                  id: 'developer' as const,
                  label: 'Developer',
                  count: (data.apiKeys?.length ?? 0) + (data.principals?.length ?? 0)
                }])
          ];
          const requestedSection = controlledSection ?? internalSection;
          const activeSection = sections.some((candidate) => candidate.id === requestedSection)
            ? requestedSection
            : 'members';
          const changeSection = (value: string) => {
            const nextSection = value as OrganizationsSection;
            if (!sections.some((candidate) => candidate.id === nextSection)) return;
            if (controlledSection === undefined) setInternalSection(nextSection);
            onSectionChange?.(nextSection);
          };

          return (
            <div className='grid min-h-[32rem] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]'>
              <Card className='h-fit' variant='flat'>
                <CardHeader>
                  <CardTitle className='text-sm'>Your organizations</CardTitle>
                  <CardDescription>Select the tenant whose membership policy you want to manage.</CardDescription>
                </CardHeader>
                <CardContent className='flex flex-col gap-1'>
                  {data.organizations.map((organization) => {
                    const selected = organization.id === active?.id;
                    return (
                      <Button
                        className='h-auto justify-start px-2 py-2 text-left'
                        disabled={!selected && !(canPerform(policy, 'selectOrganization') && actions?.selectOrganization)}
                        key={organization.id}
                        onClick={() => {
                          if (!selected && canPerform(policy, 'selectOrganization') && actions?.selectOrganization) {
                            setSelectionError(undefined);
                            void run(
                              () => actions.selectOrganization!({ organizationId: organization.id }),
                              'The organization could not be selected.'
                            ).then((result) => {
                              if ('error' in result) {
                                setSelectionError(result.error.message);
                              }
                            });
                          }
                        }}
                        variant={selected ? 'secondary' : 'ghost'}
                      >
                        <Avatar className='size-8'>
                          {organization.avatarUrl ? <AvatarImage alt='' src={organization.avatarUrl} /> : null}
                          <AvatarFallback>{initials(organization.name) || <Building2Icon />}</AvatarFallback>
                        </Avatar>
                        <span className='min-w-0 flex-1'>
                          <span className='block truncate'>{organization.name}</span>
                          <span className='text-muted-foreground block truncate text-xs'>
                            {organization.memberCount === undefined ? organization.slug : `${organization.memberCount} members`}
                          </span>
                        </span>
                        {selected ? <CheckIcon aria-hidden='true' /> : null}
                      </Button>
                    );
                  })}
                  {selectionError ? (
                    <p className='text-destructive px-2 pt-2 text-pretty text-xs' role='alert'>
                      {selectionError}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <div className='min-w-0'>
                <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                  <div>
                    <h2 className='text-balance text-lg font-semibold'>{active?.name ?? 'Organization'}</h2>
                    <p className='text-muted-foreground text-pretty text-sm'>
                      Tenant memberships, access policy, hierarchy, and machine credentials.
                    </p>
                  </div>
                  {active &&
                  activeSection === 'invitations' &&
                  canPerform(policy, 'inviteMember') &&
                  actions?.inviteMember ? (
                    <OrganizationInviteDialog
                      assignableProfileIds={canPerform(policy, 'assignInviteProfile')
                        ? data.assignableInviteProfileIds ?? []
                        : []}
                      onSubmit={(input) => run(
                        () => actions.inviteMember!({ organizationId: active.id, ...input }),
                        'The invitation could not be created.'
                      )}
                      profiles={data.profiles ?? []}
                    />
                  ) : null}
                </div>
                <Tabs onValueChange={changeSection} value={activeSection}>
                  <div className='flex flex-col gap-4'>
                    <TabsList
                      aria-label='Organization management sections'
                      className='h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border/60 bg-transparent p-0'
                    >
                      {sections.map((candidate) => (
                        <TabsTrigger
                          className='text-muted-foreground data-[active]:text-foreground data-[active]:border-foreground h-10 shrink-0 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 data-[active]:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring'
                          key={candidate.id}
                          value={candidate.id}
                        >
                          {candidate.label}
                          {candidate.count === undefined ? null : (
                            <span className='text-muted-foreground ml-1.5 text-xs tabular-nums'>
                              {candidate.count}
                            </span>
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {activeSection === 'members' ? (
                      <label className='relative block w-full self-end sm:max-w-xs'>
                        <span className='sr-only'>Search organization members</span>
                        <SearchIcon className='text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2' />
                        <Input
                          className='pl-10'
                          onChange={(event) => setQuery(event.currentTarget.value)}
                          placeholder='Search organization members'
                          type='search'
                          value={query}
                        />
                      </label>
                    ) : null}
                  </div>

                  <TabsContent className='mt-5' value='members'>
                    {members.length === 0 && normalized ? (
                      <FeaturePackFilteredEmpty
                        clearLabel='Clear search'
                        description='Try a different name, email, profile, or governance role.'
                        onClear={() => setQuery('')}
                        query={query}
                        title='No members match'
                      />
                    ) : (
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Governance</TableHead>
                          <TableHead>Access profile</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='w-24'><span className='sr-only'>Actions</span></TableHead>
                        </TableRow></TableHeader>
                        <TableBody>{members.map((member) => {
                          const focused = member.id === focusedMemberId;
                          return (
                          <TableRow
                            aria-current={focused ? 'true' : undefined}
                            className={cn(focused && focusedRecordClass)}
                            key={member.id}
                            ref={focused ? focusedMemberRef : undefined}
                            tabIndex={focused ? -1 : undefined}
                          >
                            <TableCell>
                              <div className='flex min-w-48 items-center gap-3'>
                                <Avatar>
                                  {member.avatarUrl ? <AvatarImage alt='' src={member.avatarUrl} /> : null}
                                  <AvatarFallback>{initials(member.name)}</AvatarFallback>
                                </Avatar>
                                <div className='min-w-0'>
                                  <p className='truncate font-medium'>{member.name}</p>
                                  <p className='text-muted-foreground truncate text-sm'>{member.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className='capitalize'>{member.governance}</TableCell>
                            <TableCell>{member.profileName ?? 'No profile'}</TableCell>
                            <TableCell><FeatureStatusBadge status={member.status} /></TableCell>
                            <TableCell>
                              {active ? (
                                <div className='flex items-center justify-end gap-1'>
                                  <OrganizationMemberAccessDialog
                                    actions={actions}
                                    member={member}
                                    onError={onError}
                                    organizationId={active.id}
                                    permissions={data.permissions ?? []}
                                    policy={policy}
                                    profiles={data.profiles ?? []}
                                  />
                                  {canPerform(policy, 'removeMember') &&
                                  member.actionPolicy?.removeMember &&
                                  actions?.removeMember ? (
                                    <OrganizationMemberActions
                                      member={member}
                                      onError={onError}
                                      organizationId={active.id}
                                      removeMember={actions.removeMember}
                                    />
                                  ) : null}
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                          );
                        })}</TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  {data.invites !== undefined || data.claimedInvites !== undefined ? (
                    <TabsContent className='mt-5' value='invitations'>
                      {(data.invites?.length ?? 0) === 0 && (data.claimedInvites?.length ?? 0) === 0 ? (
                        <Empty className='min-h-52 border' role='status'>
                          <EmptyHeader>
                            <EmptyMedia variant='icon'><MailPlusIcon aria-hidden='true' /></EmptyMedia>
                            <EmptyTitle>No active invitations</EmptyTitle>
                            <EmptyDescription>Invite by email, SMS, or a reusable link.</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      ) : (
                        <div className='flex flex-col gap-8'>
                          {(data.invites?.length ?? 0) > 0 ? (
                            <section className='flex flex-col gap-3'>
                              <div>
                                <h3 className='text-sm font-medium'>Active invitations</h3>
                                <p className='text-muted-foreground text-sm'>Pending delivery and reusable links that can still be claimed.</p>
                              </div>
                              <Table>
                                <TableHeader><TableRow>
                                  <TableHead>Recipient</TableHead><TableHead>Profile</TableHead>
                                  <TableHead>Status</TableHead><TableHead>Claims</TableHead>
                                  <TableHead>Expires</TableHead><TableHead className='text-right'>Actions</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>{data.invites?.map((invite) => {
                                  const focused = invite.id === focusedInvitationId;
                                  return (
                                  <TableRow
                                    aria-current={focused ? 'true' : undefined}
                                    className={cn(focused && focusedRecordClass)}
                                    key={invite.id}
                                    ref={focused ? focusedInvitationRef : undefined}
                                    tabIndex={focused ? -1 : undefined}
                                  >
                                    <TableCell>
                                      <div className='flex items-center gap-2'>
                                        <span className='font-medium'>{invite.recipient || 'Reusable link'}</span>
                                        <span className='text-muted-foreground text-xs uppercase'>{invite.channel}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>{invite.profileName ?? 'No profile'}</TableCell>
                                    <TableCell><FeatureStatusBadge status={invite.status} /></TableCell>
                                    <TableCell className='tabular-nums'>
                                      {invite.inviteCount ?? 0}{invite.inviteLimit ? ` / ${invite.inviteLimit}` : ''}
                                    </TableCell>
                                    <TableCell><FeaturePackTimestamp value={invite.expiresAt} /></TableCell>
                                    <TableCell>
                                      <div className='flex justify-end gap-2'>
                                        {invite.token ? (
                                          <CopyOrganizationInviteTokenAction token={invite.token} />
                                        ) : null}
                                        {active &&
                                        canPerform(policy, 'cancelInvite') &&
                                        invite.actionPolicy?.cancelInvite &&
                                        actions?.cancelInvite ? (
                                          <CancelOrganizationInviteAction
                                            cancelInvite={actions.cancelInvite}
                                            invite={invite}
                                            onError={onError}
                                            organizationId={active.id}
                                          />
                                        ) : null}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  );
                                })}</TableBody>
                              </Table>
                            </section>
                          ) : null}
                          {(data.claimedInvites?.length ?? 0) > 0 ? (
                            <section className='flex flex-col gap-3'>
                              <div>
                                <h3 className='text-sm font-medium'>Claim history</h3>
                                <p className='text-muted-foreground text-sm'>Accepted invitations retained by Constructive for membership audit history.</p>
                              </div>
                              <Table>
                                <TableHeader><TableRow>
                                  <TableHead>Sender</TableHead>
                                  <TableHead>Receiver</TableHead>
                                  <TableHead>Claimed</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>{data.claimedInvites?.map((invite) => (
                                  <TableRow key={invite.id}>
                                    <TableCell className='font-mono text-xs'>{invite.senderId}</TableCell>
                                    <TableCell className='font-mono text-xs'>{invite.receiverId}</TableCell>
                                    <TableCell><FeaturePackTimestamp value={invite.createdAt} /></TableCell>
                                  </TableRow>
                                ))}</TableBody>
                              </Table>
                            </section>
                          ) : null}
                        </div>
                      )}
                    </TabsContent>
                  ) : null}

                  {active && data.profiles !== undefined ? (
                    <TabsContent className='mt-5' value='profiles'>
                      <OrganizationProfilesPanel
                        actions={actions}
                        onError={onError}
                        focusedProfileId={focusedProfileId}
                        organizationId={active.id}
                        permissions={data.permissions ?? []}
                        policy={policy}
                        profiles={data.profiles}
                      />
                    </TabsContent>
                  ) : null}
                  {data.permissions !== undefined ? (
                    <TabsContent className='mt-5' value='permissions'>
                      <OrganizationPermissionsPanel
                        members={data.members}
                        permissions={data.permissions}
                        profiles={data.profiles ?? []}
                      />
                    </TabsContent>
                  ) : null}
                  {active && data.membershipDefault ? (
                    <TabsContent className='mt-5' value='defaults'>
                      <OrganizationDefaultsPanel
                        actions={actions}
                        membershipDefault={data.membershipDefault}
                        onError={onError}
                        organizationId={active.id}
                        policy={policy}
                      />
                    </TabsContent>
                  ) : null}
                  {active && data.hierarchy !== undefined ? (
                    <TabsContent className='mt-5' value='hierarchy'>
                      <OrganizationHierarchyPanel
                        actions={actions}
                        edges={data.hierarchy}
                        members={data.members}
                        onError={onError}
                        organizationId={active.id}
                        policy={policy}
                      />
                    </TabsContent>
                  ) : null}
                  {active ? (
                    <TabsContent className='mt-5' value='settings'>
                      <OrganizationSettingsPanel
                        actions={actions}
                        currentMembership={data.members.find(
                          (member) => member.userId === data.currentActorId
                        )}
                        onError={onError}
                        organization={active}
                        policy={policy}
                        settings={data.membershipSettings}
                      />
                    </TabsContent>
                  ) : null}
                  {active && (data.apiKeys !== undefined || data.principals !== undefined) ? (
                    <TabsContent className='mt-5' value='developer'>
                      <div className='flex flex-col gap-10'>
                        {data.principals !== undefined && developerView !== 'api-keys' ? (
                          <OrganizationPrincipalsPanel
                            actions={actions}
                            onError={onError}
                            organizationId={active.id}
                            policy={policy}
                            principals={data.principals}
                          />
                        ) : null}
                        {data.apiKeys !== undefined && developerView !== 'principals' ? (
                          <OrganizationApiKeysPanel
                            actions={actions}
                            apiKeys={data.apiKeys}
                            onError={onError}
                            organizationId={active.id}
                            policy={policy}
                            principals={data.principals ?? []}
                          />
                        ) : null}
                      </div>
                    </TabsContent>
                  ) : null}
                </Tabs>
              </div>
            </div>
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}

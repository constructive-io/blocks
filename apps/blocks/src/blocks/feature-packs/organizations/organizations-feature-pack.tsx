'use client';

import * as React from 'react';
import {
  Building2Icon,
  CheckIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  LoaderCircleIcon,
  MailPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UserMinusIcon,
  UsersRoundIcon
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
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
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
import { Tabs, TabsContent } from '@constructive-io/ui/tabs';
import { focusRingClass, pressClass, SearchField, ToneBadge } from '@/components/ui/workspace-kit/primitives';
import { SectionHeading, TableSurface, tableHeadClass, tableRowClass } from '@/components/ui/workspace-kit/surface';
import { cn } from '@/lib/utils';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionResult,
  type FeaturePackError
} from '../shared/feature-pack-contracts';
import {
  FeaturePackBoundary,
  FeaturePackEmpty,
  FeaturePackFilteredEmpty,
  FeaturePackLimitations,
  FeaturePackPageHeader,
  FeaturePackPerson,
  FeaturePackTabList,
  FeatureStatusBadge,
  FeaturePackTimestamp,
  focusedRecordClass
} from '../shared/feature-pack-ui';
import type {
  OrganizationInvite,
  OrganizationMember,
  OrganizationAccessProfile,
  OrganizationCapability,
  OrganizationSummary,
  OrganizationsFeatureActions,
  OrganizationsFeaturePackProps,
  OrganizationsSection
} from './organizations-contracts';
import {
  OrganizationDefaultsPanel,
  OrganizationMemberAccessDialog,
  OrganizationCapabilitiesPanel,
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
  onSubmit,
  showTrigger = true
}: Readonly<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
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
      {showTrigger ? (
        <DialogTrigger render={<Button size='sm' variant='outline' />}>
          <PlusIcon data-icon='inline-start' />
          New organization
        </DialogTrigger>
      ) : null}
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
                autoComplete='organization'
                id={`${fieldId}-value`}
                name='organization-name'
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
  // A profile the backend no longer lets this actor assign drops out of the selection.
  const selectedProfileId = assignableProfiles.some((profile) => profile.id === profileId) ? profileId : '';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (needsRecipient && !recipient.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await onSubmit({
        channel,
        recipient: needsRecipient ? recipient.trim() : undefined,
        profileId: canAssignProfile && selectedProfileId ? selectedProfileId : undefined,
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
      <DialogTrigger render={<Button size='sm' />}>
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
                  <SelectTrigger id={`${fieldId}-channel`}>
                    <SelectValue>
                      {(value: string | null) => value === 'sms' ? 'SMS' : value === 'link' ? 'Reusable link' : 'Email'}
                    </SelectValue>
                  </SelectTrigger>
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
                    autoCapitalize='none'
                    autoComplete={channel === 'sms' ? 'tel' : 'email'}
                    id={`${fieldId}-recipient`}
                    name={channel === 'sms' ? 'invite-phone' : 'invite-email'}
                    onChange={(event) => setRecipient(event.currentTarget.value)}
                    placeholder={channel === 'sms' ? '+15551234567' : 'person@example.com'}
                    required
                    spellCheck={false}
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
                    value={selectedProfileId || NO_PROFILE_VALUE}
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
                  autoComplete='off'
                  id={`${fieldId}-expires`}
                  name='invite-expires-at'
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
                        inputMode='numeric'
                        min={1}
                        name='invite-claim-limit'
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
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuItem className='gap-2 [&_svg]:size-3.5' onClick={() => setOpen(true)} variant='destructive'>
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

function OrganizationMemberControls({
  actions,
  member,
  onError,
  organizationId,
  capabilities,
  policy,
  profiles
}: Readonly<{
  actions?: OrganizationsFeatureActions;
  member: OrganizationMember;
  onError?: OrganizationsFeaturePackProps['onError'];
  organizationId: string;
  capabilities: readonly OrganizationCapability[];
  policy?: OrganizationsFeaturePackProps['policy'];
  profiles: readonly OrganizationAccessProfile[];
}>) {
  return (
    <div className='flex items-center justify-end gap-0.5'>
      <OrganizationMemberAccessDialog
        actions={actions}
        member={member}
        onError={onError}
        organizationId={organizationId}
        capabilities={capabilities}
        policy={policy}
        profiles={profiles}
      />
      {canPerform(policy, 'removeMember') &&
      member.actionPolicy?.removeMember &&
      actions?.removeMember ? (
        <OrganizationMemberActions
          member={member}
          onError={onError}
          organizationId={organizationId}
          removeMember={actions.removeMember}
        />
      ) : <span aria-hidden='true' className='size-7' />}
    </div>
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
      <AlertDialogTrigger render={<Button className='h-7' size='sm' variant='outline' />}>
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
        className='h-7'
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

/** The active organization as the view's title, with a menu to switch to another one. */
function OrganizationSwitcher({
  organizations,
  active,
  canSelect,
  selectingId,
  onSelect
}: Readonly<{
  organizations: readonly OrganizationSummary[];
  active: OrganizationSummary;
  canSelect: boolean;
  selectingId?: string;
  onSelect: (organization: OrganizationSummary) => void;
}>) {
  const meta = [
    active.memberCount === undefined ? null : `${active.memberCount} ${active.memberCount === 1 ? 'member' : 'members'}`,
    active.slug
  ].filter(Boolean).join(' · ');
  return (
    <div className='flex min-w-0 items-center gap-3'>
      <Avatar className='size-9 shrink-0 rounded-[10px] ring-1 ring-foreground/[0.06]'>
        {active.avatarUrl ? <AvatarImage alt='' src={active.avatarUrl} /> : null}
        <AvatarFallback className='rounded-[10px] bg-foreground text-[11px] font-semibold text-background'>
          {initials(active.name) || <Building2Icon aria-hidden='true' className='size-4' />}
        </AvatarFallback>
      </Avatar>
      <div className='min-w-0'>
        <div className='flex min-w-0 items-center gap-1'>
          <h2 className='truncate text-lg font-medium tracking-tight' title={active.name}>{active.name}</h2>
          {organizations.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-busy={Boolean(selectingId)}
                aria-label='Switch organization'
                className={cn(
                  'text-muted-foreground hover:bg-overlay-hover hover:text-foreground data-[popup-open]:bg-overlay-hover grid size-7 shrink-0 cursor-pointer place-items-center rounded-md disabled:cursor-not-allowed disabled:opacity-50',
                  pressClass,
                  focusRingClass
                )}
                disabled={Boolean(selectingId)}
              >
                {selectingId
                  ? <LoaderCircleIcon aria-hidden='true' className='size-3.5 animate-spin motion-reduce:animate-none' />
                  : <ChevronsUpDownIcon aria-hidden='true' className='size-3.5' />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-64'>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className='text-muted-foreground text-xs font-normal'>Your organizations</DropdownMenuLabel>
                  {organizations.map((organization) => {
                    const selected = organization.id === active.id;
                    return (
                      <DropdownMenuItem
                        className='gap-2.5'
                        disabled={!selected && !canSelect}
                        key={organization.id}
                        onClick={() => {
                          if (!selected) onSelect(organization);
                        }}
                      >
                        <Avatar className='size-6 shrink-0 rounded-md'>
                          {organization.avatarUrl ? <AvatarImage alt='' src={organization.avatarUrl} /> : null}
                          <AvatarFallback className='rounded-md bg-muted text-[10px] font-medium'>{initials(organization.name)}</AvatarFallback>
                        </Avatar>
                        <span className='min-w-0 flex-1'>
                          <span className='block truncate text-[13px]'>{organization.name}</span>
                          {organization.memberCount === undefined ? null : (
                            <span className='text-muted-foreground block text-xs tabular-nums'>
                              {organization.memberCount} {organization.memberCount === 1 ? 'member' : 'members'}
                            </span>
                          )}
                        </span>
                        {selected ? <CheckIcon aria-label='Current organization' className='size-3.5' /> : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {meta ? <p className='text-muted-foreground truncate text-[13px] tabular-nums'>{meta}</p> : null}
      </div>
    </div>
  );
}

function OrganizationRole({ governance }: Readonly<{ governance: OrganizationMember['governance'] }>) {
  if (governance === 'owner') return <ToneBadge tone='primary'>Owner</ToneBadge>;
  if (governance === 'admin') return <ToneBadge tone='info'>Admin</ToneBadge>;
  return <span className='text-muted-foreground text-[13px]'>Member</span>;
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
  const [selectingOrganizationId, setSelectingOrganizationId] = React.useState<string>();
  const [internalSection, setInternalSection] = React.useState<OrganizationsSection>(
    defaultSection
  );
  const focusedMemberRef = React.useCallback(
    (element: HTMLElement | null) => {
      if (!element || !focusedMemberId) return;
      element.focus({ preventScroll: true });
      element.scrollIntoView?.({ block: 'nearest' });
    },
    [focusedMemberId]
  );
  const focusedInvitationRef = React.useCallback(
    (element: HTMLElement | null) => {
      if (!element || !focusedInvitationId) return;
      element.focus({ preventScroll: true });
      element.scrollIntoView?.({ block: 'nearest' });
    },
    [focusedInvitationId]
  );
  // A route-selected member must be visible, so a hiding search clears (adjusted during render, not in an effect).
  const [clearedFor, setClearedFor] = React.useState(focusedMemberId);
  if (focusedMemberId !== clearedFor) {
    setClearedFor(focusedMemberId);
    if (focusedMemberId) setQuery('');
  }

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

  const canCreateOrganization = canPerform(policy, 'createOrganization') && Boolean(actions?.createOrganization);
  const createDialog = (showTrigger: boolean) => canCreateOrganization && actions?.createOrganization ? (
    <CreateOrganizationDialog
      onOpenChange={onCreateOrganizationOpenChange}
      onSubmit={({ value }) => run(() => actions.createOrganization!({ name: value }), 'The organization could not be created.')}
      open={createOrganizationOpen}
      showTrigger={showTrigger}
    />
  ) : null;

  return (
    <div className='flex flex-col gap-5'>
      {resource.status === 'ready' ? null : (
        <FeaturePackPageHeader actions={null} title='Organizations' />
      )}
      <FeaturePackLimitations
        limitations={resource.status === 'ready' ? resource.limitations : undefined}
      />
      <FeaturePackBoundary
        emptyAction={createDialog(true)}
        emptyDescription={canCreateOrganization
          ? 'Create the first organization when this app needs tenant-owned data.'
          : 'No organizations are visible to this session, and the current access policy does not allow organization creation.'}
        emptyTitle={canCreateOrganization ? 'No organizations yet' : 'No organizations available'}
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
            { id: 'members', label: 'Members', count: data.members.length }
          ];
          if (data.invites !== undefined || data.claimedInvites !== undefined) {
            sections.push({
              id: 'invitations',
              label: 'Invitations',
              count: (data.invites?.length ?? 0) + (data.claimedInvites?.length ?? 0)
            });
          }
          if (data.profiles !== undefined) {
            sections.push({ id: 'profiles', label: 'Profiles', count: data.profiles.length });
          }
          if (data.capabilities !== undefined) {
            sections.push({ id: 'capabilities', label: 'Capabilities', count: data.capabilities.length });
          }
          if (data.membershipDefault !== undefined) {
            sections.push({ id: 'defaults', label: 'Defaults' });
          }
          if (data.hierarchy !== undefined) {
            sections.push({ id: 'hierarchy', label: 'Hierarchy', count: data.hierarchy.length });
          }
          sections.push({ id: 'settings', label: 'Settings' });
          if (data.apiKeys !== undefined || data.principals !== undefined) {
            sections.push({
              id: 'developer',
              label: 'Developer',
              count: (data.apiKeys?.length ?? 0) + (data.principals?.length ?? 0)
            });
          }
          const requestedSection = controlledSection ?? internalSection;
          const activeSection = sections.some((candidate) => candidate.id === requestedSection)
            ? requestedSection
            : 'members';
          const changeSection = (value: unknown) => {
            const nextSection = value as OrganizationsSection;
            if (!sections.some((candidate) => candidate.id === nextSection)) return;
            if (controlledSection === undefined) setInternalSection(nextSection);
            onSectionChange?.(nextSection);
          };
          const canSelect = canPerform(policy, 'selectOrganization') && Boolean(actions?.selectOrganization);

          return (
            <div className='flex min-w-0 flex-col gap-5' key={active?.id ?? 'no-active-organization'}>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                {active ? (
                  <OrganizationSwitcher
                    active={active}
                    canSelect={canSelect}
                    onSelect={(organization) => {
                      if (!canSelect || !actions?.selectOrganization) return;
                      setSelectionError(undefined);
                      setSelectingOrganizationId(organization.id);
                      void run(
                        () => actions.selectOrganization!({ organizationId: organization.id }),
                        'The organization could not be selected.'
                      ).then((result) => {
                        if ('error' in result) setSelectionError(result.error.message);
                      }).finally(() => setSelectingOrganizationId(undefined));
                    }}
                    organizations={data.organizations}
                    selectingId={selectingOrganizationId}
                  />
                ) : <h2 className='text-lg font-medium'>Organization</h2>}
                <div className='flex shrink-0 flex-wrap items-center gap-2'>
                  {createDialog(true)}
                  {active &&
                  canPerform(policy, 'inviteMember') &&
                  actions?.inviteMember ? (
                    <OrganizationInviteDialog
                      assignableProfileIds={canPerform(policy, 'assignInviteProfile')
                        ? data.assignableInviteProfileIds ?? []
                        : []}
                      onSubmit={(input) => run(
                        () => actions.inviteMember!({
                          organizationId: active.id,
                          channel: input.channel,
                          recipient: input.recipient,
                          profileId: input.profileId,
                          expiresAt: input.expiresAt,
                          multiple: input.multiple,
                          inviteLimit: input.inviteLimit,
                          isReadOnly: input.isReadOnly
                        }),
                        'The invitation could not be created.'
                      )}
                      profiles={data.profiles ?? []}
                    />
                  ) : null}
                </div>
              </div>
              {selectionError ? (
                <p className='text-destructive text-pretty text-sm' role='alert'>{selectionError}</p>
              ) : null}

              <Tabs className='gap-4' onValueChange={changeSection} value={activeSection}>
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                  <FeaturePackTabList label='Organization management sections' sections={sections} />
                  {activeSection === 'members' ? (
                    <SearchField
                      autoComplete='off'
                      className='w-full md:w-64'
                      label='Search organization members'
                      name='organization-member-search'
                      onChange={(event) => setQuery(event.currentTarget.value)}
                      placeholder='Search members'
                      value={query}
                    />
                  ) : null}
                </div>

                <TabsContent value='members'>
                  {members.length === 0 && normalized ? (
                    <FeaturePackFilteredEmpty
                      clearLabel='Clear search'
                      description='Try a different name, email, profile, or governance role.'
                      onClear={() => setQuery('')}
                      query={query}
                      title='No members match'
                    />
                  ) : members.length === 0 ? (
                    <FeaturePackEmpty icon={UsersRoundIcon} title='No members to show' />
                  ) : (
                    <TableSurface className='@container/table' minWidth='0'>
                      <caption className='sr-only'>Organization members</caption>
                      <thead className={tableHeadClass}>
                        <tr>
                          <th scope='col'>Member</th>
                          <th className='hidden w-24 @lg/table:table-cell' scope='col'>Governance</th>
                          <th className='hidden @xl/table:table-cell' scope='col'>Access profile</th>
                          <th className='w-28' scope='col'>Status</th>
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
                                  detail={[member.email, member.isExternal ? 'External' : null, member.isReadOnly ? 'Read only' : null].filter(Boolean).join(' · ')}
                                  name={member.name}
                                />
                              </td>
                              <td className='hidden @lg/table:table-cell'><OrganizationRole governance={member.governance} /></td>
                              <td className='text-muted-foreground hidden truncate @xl/table:table-cell' title={member.profileName ?? 'No profile'}>
                                {member.profileName ?? 'No profile'}
                              </td>
                              <td><FeatureStatusBadge status={member.status} /></td>
                              <td>
                                {active ? (
                                  <OrganizationMemberControls
                                    actions={actions}
                                    capabilities={data.capabilities ?? []}
                                    member={member}
                                    onError={onError}
                                    organizationId={active.id}
                                    policy={policy}
                                    profiles={data.profiles ?? []}
                                  />
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </TableSurface>
                  )}
                </TabsContent>

                {data.invites !== undefined || data.claimedInvites !== undefined ? (
                  <TabsContent value='invitations'>
                    {(data.invites?.length ?? 0) === 0 && (data.claimedInvites?.length ?? 0) === 0 ? (
                      <FeaturePackEmpty
                        description='Invite by email, SMS, or a reusable link.'
                        icon={MailPlusIcon}
                        title='No active invitations'
                      />
                    ) : (
                      <div className='flex flex-col gap-6'>
                        {(data.invites?.length ?? 0) > 0 ? (
                          <section className='flex flex-col gap-3'>
                            <SectionHeading
                              description='Pending delivery and reusable links that can still be claimed.'
                              title='Active invitations'
                            />
                            <TableSurface className='@container/table' minWidth='0'>
                              <caption className='sr-only'>Active invitations</caption>
                              <thead className={tableHeadClass}>
                                <tr>
                                  <th scope='col'>Recipient</th>
                                  <th className='hidden @xl/table:table-cell' scope='col'>Profile</th>
                                  <th className='w-24' scope='col'>Status</th>
                                  <th className='hidden w-20 text-right @lg/table:table-cell' scope='col'>Claims</th>
                                  <th className='hidden w-40 @2xl/table:table-cell' scope='col'>Expires</th>
                                  <th className='w-40' scope='col'><span className='sr-only'>Actions</span></th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.invites?.map((invite) => {
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
                                          <span className='truncate font-medium' title={invite.recipient || 'Reusable link'}>
                                            {invite.recipient || 'Reusable link'}
                                          </span>
                                          <ToneBadge className='uppercase' tone='neutral'>{invite.channel}</ToneBadge>
                                        </span>
                                        <span className='text-muted-foreground block truncate text-xs @xl/table:hidden'>
                                          {invite.profileName ?? 'No profile'}
                                        </span>
                                      </td>
                                      <td className='text-muted-foreground hidden truncate @xl/table:table-cell' title={invite.profileName ?? 'No profile'}>
                                        {invite.profileName ?? 'No profile'}
                                      </td>
                                      <td><FeatureStatusBadge status={invite.status} /></td>
                                      <td className='hidden text-right tabular-nums @lg/table:table-cell'>
                                        {invite.inviteCount ?? 0}{invite.inviteLimit ? ` / ${invite.inviteLimit}` : ''}
                                      </td>
                                      <td className='text-muted-foreground hidden @2xl/table:table-cell'><FeaturePackTimestamp value={invite.expiresAt} /></td>
                                      <td>
                                        <div className='flex justify-end gap-1.5'>
                                          {invite.token ? <CopyOrganizationInviteTokenAction token={invite.token} /> : null}
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
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </TableSurface>
                          </section>
                        ) : null}
                        {(data.claimedInvites?.length ?? 0) > 0 ? (
                          <section className='flex flex-col gap-3'>
                            <SectionHeading
                              description='Accepted invitations retained by Constructive for membership audit history.'
                              title='Claim history'
                            />
                            <TableSurface className='@container/table' minWidth='0'>
                              <caption className='sr-only'>Claim history</caption>
                              <thead className={tableHeadClass}>
                                <tr>
                                  <th scope='col'>Sender</th>
                                  <th className='hidden @lg/table:table-cell' scope='col'>Receiver</th>
                                  <th className='w-44' scope='col'>Claimed</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.claimedInvites?.map((invite) => (
                                  <tr className={tableRowClass} key={invite.id}>
                                    <td className='max-w-0 font-mono text-xs'>
                                      <span className='block truncate' translate='no'>{invite.senderId}</span>
                                      <span className='text-muted-foreground block truncate @lg/table:hidden' translate='no'>→ {invite.receiverId}</span>
                                    </td>
                                    <td className='text-muted-foreground hidden max-w-0 truncate font-mono text-xs @lg/table:table-cell' translate='no'>
                                      {invite.receiverId}
                                    </td>
                                    <td className='text-muted-foreground'><FeaturePackTimestamp value={invite.createdAt} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </TableSurface>
                          </section>
                        ) : null}
                      </div>
                    )}
                  </TabsContent>
                ) : null}

                {active && data.profiles !== undefined ? (
                  <TabsContent value='profiles'>
                    <OrganizationProfilesPanel
                      actions={actions}
                      capabilities={data.capabilities ?? []}
                      focusedProfileId={focusedProfileId}
                      onError={onError}
                      organizationId={active.id}
                      policy={policy}
                      profiles={data.profiles}
                    />
                  </TabsContent>
                ) : null}
                {data.capabilities !== undefined ? (
                  <TabsContent value='capabilities'>
                    <OrganizationCapabilitiesPanel
                      capabilities={data.capabilities}
                      members={data.members}
                      profiles={data.profiles ?? []}
                    />
                  </TabsContent>
                ) : null}
                {active && data.membershipDefault ? (
                  <TabsContent value='defaults'>
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
                  <TabsContent value='hierarchy'>
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
                  <TabsContent value='settings'>
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
                  <TabsContent value='developer'>
                    <div className='flex flex-col gap-8'>
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
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}

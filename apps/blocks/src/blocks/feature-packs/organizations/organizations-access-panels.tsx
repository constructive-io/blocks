'use client';

import * as React from 'react';
import { PencilIcon, PlusIcon, Settings2Icon, ShieldIcon, Trash2Icon } from 'lucide-react';

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
import { Switch } from '@constructive-io/ui/switch';
import { Textarea } from '@constructive-io/ui/textarea';
import { ToneBadge, TooltipIconButton } from '@/components/ui/workspace-kit/primitives';
import { SectionHeading } from '@/components/ui/workspace-kit/surface';
import { cn } from '@/lib/utils';

import {
  canPerform,
  normalizeFeaturePackError
} from '../shared/feature-pack-contracts';
import { FeaturePackEmpty, FeaturePackOptionList, focusedRecordClass } from '../shared/feature-pack-ui';
import type {
  OrganizationAccessProfile,
  OrganizationMember,
  OrganizationMembershipDefault,
  OrganizationCapability,
  OrganizationsFeatureActions,
  OrganizationsFeaturePackProps
} from './organizations-contracts';

type AccessPanelProps = Readonly<{
  organizationId: string;
  actions?: OrganizationsFeatureActions;
  policy?: OrganizationsFeaturePackProps['policy'];
  onError?: OrganizationsFeaturePackProps['onError'];
}>;

function report(
  cause: unknown,
  fallback: string,
  onError: OrganizationsFeaturePackProps['onError'],
  setError?: (message: string | undefined) => void
) {
  const error = normalizeFeaturePackError(cause, fallback);
  setError?.(error.message);
  onError?.(error);
}

function AccessProfileDialog({
  organizationId,
  profile,
  action,
  onError
}: Readonly<{
  organizationId: string;
  profile?: OrganizationAccessProfile;
  action:
    | NonNullable<OrganizationsFeatureActions['createAccessProfile']>
    | NonNullable<OrganizationsFeatureActions['updateAccessProfile']>;
  onError?: OrganizationsFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(profile?.name ?? '');
  const [description, setDescription] = React.useState(profile?.description ?? '');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      if (profile) {
        await (action as NonNullable<OrganizationsFeatureActions['updateAccessProfile']>)({
          organizationId,
          profileId: profile.id,
          name: name.trim(),
          description: description.trim() || undefined
        });
      } else {
        await (action as NonNullable<OrganizationsFeatureActions['createAccessProfile']>)({
          organizationId,
          name: name.trim(),
          description: description.trim() || undefined
        });
      }
      setOpen(false);
      if (!profile) {
        setName('');
        setDescription('');
      }
    } catch (cause) {
      report(cause, 'The access profile could not be saved.', onError, setError);
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
      {profile ? (
        <TooltipIconButton extendHitArea={false} label={`Edit ${profile.name}`} onClick={() => setOpen(true)}>
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
              Profiles bundle organization capabilities so access remains understandable as the team grows.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FieldGroup>
              <Field error={error} htmlFor={`${fieldId}-name`} label='Name' required>
                <Input
                  aria-invalid={error ? true : undefined}
                  autoComplete='off'
                  id={`${fieldId}-name`}
                  name='access-profile-name'
                  onChange={(event) => setName(event.currentTarget.value)}
                  required
                  value={name}
                />
              </Field>
              <Field htmlFor={`${fieldId}-description`} label='Description'>
                <Textarea
                  autoComplete='off'
                  id={`${fieldId}-description`}
                  name='access-profile-description'
                  onChange={(event) => setDescription(event.currentTarget.value)}
                  value={description}
                />
              </Field>
            </FieldGroup>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !name.trim()} type='submit'>
              {pending ? 'Saving…' : 'Save profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccessProfileAction({
  organizationId,
  profile,
  action,
  onError
}: Readonly<{
  organizationId: string;
  profile: OrganizationAccessProfile;
  action: NonNullable<OrganizationsFeatureActions['deleteAccessProfile']>;
  onError?: OrganizationsFeaturePackProps['onError'];
}>) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  return (
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
            Members assigned to this profile lose its bundled capabilities. Direct grants remain unchanged.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep profile</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() => {
              setPending(true);
              setError(undefined);
              void Promise.resolve(action({ organizationId, profileId: profile.id })).catch((cause) => {
                report(cause, 'The access profile could not be deleted.', onError, setError);
              }).finally(() => setPending(false));
            }}
            variant='destructive'
          >
            {pending ? 'Deleting…' : 'Delete profile'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function OrganizationProfilesPanel({
  organizationId,
  profiles,
  capabilities,
  actions,
  policy,
  focusedProfileId,
  onError
}: AccessPanelProps & Readonly<{
  profiles: readonly OrganizationAccessProfile[];
  capabilities: readonly OrganizationCapability[];
  focusedProfileId?: string;
}>) {
  const [pendingCapability, setPendingCapability] = React.useState<string>();
  const canCreateProfile = canPerform(policy, 'createAccessProfile') && Boolean(actions?.createAccessProfile);
  const focusedProfileRef = React.useRef<HTMLElement>(null);
  const focusedProfilePresent = Boolean(
    focusedProfileId && profiles.some((profile) => profile.id === focusedProfileId)
  );

  React.useEffect(() => {
    if (!focusedProfilePresent) return;
    const element = focusedProfileRef.current;
    element?.focus({ preventScroll: true });
    element?.scrollIntoView?.({ block: 'nearest' });
  }, [focusedProfileId, focusedProfilePresent]);

  const setCapability = async (
    profile: OrganizationAccessProfile,
    capabilityId: string,
    isGrant: boolean
  ) => {
    if (!actions?.setProfileCapability) return;
    const pendingKey = `${profile.id}:${capabilityId}`;
    setPendingCapability(pendingKey);
    try {
      await actions.setProfileCapability({
        organizationId,
        profileId: profile.id,
        capabilityId,
        isGrant
      });
    } catch (cause) {
      report(cause, 'The profile capability could not be changed.', onError);
    } finally {
      setPendingCapability(undefined);
    }
  };

  return (
    <div className='@container/profiles flex flex-col gap-3'>
      <SectionHeading
        actions={canCreateProfile && actions?.createAccessProfile ? (
          <AccessProfileDialog
            action={actions.createAccessProfile}
            onError={onError}
            organizationId={organizationId}
          />
        ) : null}
        description='Assign profiles for routine access, then reserve direct grants for exceptions.'
        title='Access profiles'
      />
      {profiles.length === 0 ? (
        <FeaturePackEmpty
          description={canCreateProfile
            ? 'Create a profile to bundle organization capabilities.'
            : 'No access profiles are visible, and this session cannot create one.'}
          icon={ShieldIcon}
          title='No access profiles'
        />
      ) : (
        <div className='grid gap-3 @4xl/profiles:grid-cols-2'>
          {profiles.map((profile) => {
            const assigned = new Set(profile.capabilityIds);
            const canSet = canPerform(policy, 'setProfileCapability') &&
              profile.actionPolicy?.setProfileCapability === true &&
              Boolean(actions?.setProfileCapability);
            return (
              <section
                aria-current={profile.id === focusedProfileId ? 'true' : undefined}
                className={cn(
                  'flex flex-col overflow-hidden rounded-xl bg-card shadow-card',
                  profile.id === focusedProfileId && focusedRecordClass
                )}
                key={profile.id}
                ref={profile.id === focusedProfileId ? focusedProfileRef : undefined}
                tabIndex={profile.id === focusedProfileId ? -1 : undefined}
              >
                <div className='flex items-start justify-between gap-3 px-4 pt-3.5 pb-3'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <h4 className='truncate text-sm font-medium'>{profile.name}</h4>
                      {profile.isSystem ? <ToneBadge tone='neutral'>System</ToneBadge> : null}
                      {profile.isDefault ? <ToneBadge tone='primary'>Default</ToneBadge> : null}
                    </div>
                    <p className='text-muted-foreground mt-0.5 text-pretty text-[13px]'>
                      {profile.description ?? 'No description provided.'}
                    </p>
                    <p className='text-muted-foreground mt-1 text-xs tabular-nums'>
                      {profile.capabilityIds.length} {profile.capabilityIds.length === 1 ? 'capability' : 'capabilities'}
                    </p>
                  </div>
                  <div className='flex shrink-0 items-center gap-0.5'>
                    {canPerform(policy, 'updateAccessProfile') &&
                    profile.actionPolicy?.updateAccessProfile &&
                    actions?.updateAccessProfile ? (
                      <AccessProfileDialog
                        action={actions.updateAccessProfile}
                        onError={onError}
                        organizationId={organizationId}
                        profile={profile}
                      />
                    ) : null}
                    {canPerform(policy, 'deleteAccessProfile') &&
                    profile.actionPolicy?.deleteAccessProfile &&
                    actions?.deleteAccessProfile ? (
                      <DeleteAccessProfileAction
                        action={actions.deleteAccessProfile}
                        onError={onError}
                        organizationId={organizationId}
                        profile={profile}
                      />
                    ) : null}
                  </div>
                </div>
                {capabilities.length > 0 ? (
                  <div className='grid gap-x-4 gap-y-2.5 border-t border-dashed border-foreground/10 px-4 py-3 @lg/profiles:grid-cols-2'>
                    {capabilities.map((capability) => {
                      const key = `${profile.id}:${capability.id}`;
                      return (
                        <Field
                          data-disabled={!canSet || Boolean(pendingCapability)}
                          key={capability.id}
                          orientation='horizontal'
                        >
                          <Checkbox
                            aria-label={`${assigned.has(capability.id) ? 'Remove' : 'Add'} ${capability.name} ${assigned.has(capability.id) ? 'from' : 'to'} ${profile.name}`}
                            checked={assigned.has(capability.id)}
                            disabled={!canSet || Boolean(pendingCapability)}
                            id={key}
                            onCheckedChange={(checked) => void setCapability(
                              profile,
                              capability.id,
                              checked === true
                            )}
                          />
                          <div className='min-w-0 flex-1'>
                            <FieldLabel htmlFor={key}>{capability.name}</FieldLabel>
                            {capability.description ? (
                              <FieldDescription>{capability.description}</FieldDescription>
                            ) : null}
                          </div>
                        </Field>
                      );
                    })}
                  </div>
                ) : (
                  <p className='text-muted-foreground border-t border-dashed border-foreground/10 px-4 py-3 text-[13px]'>
                    The organization capability catalog is unavailable.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function maskIncludes(mask: string | undefined, bit: string): boolean {
  if (!mask || !bit) return false;
  const width = Math.max(mask.length, bit.length);
  const paddedMask = mask.padStart(width, '0');
  const paddedBit = bit.padStart(width, '0');
  return [...paddedBit].every((value, index) => value !== '1' || paddedMask[index] === '1');
}

function OrganizationGovernanceControl({
  id,
  label,
  checked,
  disabled,
  pending,
  onConfirm
}: Readonly<{
  id: string;
  label: 'Administrator' | 'Owner';
  checked: boolean;
  disabled: boolean;
  pending: boolean;
  onConfirm: (isGrant: boolean) => Promise<void>;
}>) {
  const [requestedGrant, setRequestedGrant] = React.useState<boolean>();
  const granting = requestedGrant === true;
  const actionLabel = granting ? `Grant ${label.toLowerCase()} access` : `Revoke ${label.toLowerCase()} access`;

  return (
    <Field data-disabled={disabled || pending} orientation='horizontal'>
      <div className='min-w-0 flex-1'>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>
          {label === 'Owner'
            ? 'Owners control organization governance and other owner grants.'
            : 'Administrators manage memberships, invitations, and tenant access.'}
        </FieldDescription>
      </div>
      <Switch
        checked={checked}
        disabled={disabled || pending}
        id={id}
        onCheckedChange={setRequestedGrant}
      />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !pending) setRequestedGrant(undefined);
        }}
        open={requestedGrant !== undefined}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              {granting
                ? `${label} access takes effect across this organization. Constructive applies the tenant’s configured authorization and step-up policy before accepting the grant.`
                : `This removes the ${label.toLowerCase()} grant while preserving the member’s account, membership, profile, and direct capabilities.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              disabled={pending}
              onClick={() => {
                if (requestedGrant === undefined) return;
                void onConfirm(requestedGrant).finally(() => setRequestedGrant(undefined));
              }}
              variant={granting ? 'default' : 'destructive'}
            >
              {pending ? 'Applying…' : actionLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Field>
  );
}

export function OrganizationMemberAccessDialog({
  organizationId,
  member,
  profiles,
  capabilities,
  actions,
  policy,
  onError
}: AccessPanelProps & Readonly<{
  member: OrganizationMember;
  profiles: readonly OrganizationAccessProfile[];
  capabilities: readonly OrganizationCapability[];
}>) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string>();
  const [displayName, setDisplayName] = React.useState(member.memberProfile?.displayName ?? member.name);
  const [email, setEmail] = React.useState(member.memberProfile?.email ?? member.email);
  const [title, setTitle] = React.useState(member.memberProfile?.title ?? '');
  const [bio, setBio] = React.useState(member.memberProfile?.bio ?? '');
  const [error, setError] = React.useState<string>();
  const [emailError, setEmailError] = React.useState<string>();
  const emailRef = React.useRef<HTMLInputElement>(null);
  const fieldId = React.useId();

  // Reload the form when the member's saved profile changes (adjusted during render, not in an effect).
  const savedProfile = [
    member.id,
    member.memberProfile?.displayName ?? member.name,
    member.memberProfile?.email ?? member.email,
    member.memberProfile?.title ?? '',
    member.memberProfile?.bio ?? ''
  ].join('\u0000');
  const [loadedProfile, setLoadedProfile] = React.useState(savedProfile);
  if (savedProfile !== loadedProfile) {
    setLoadedProfile(savedProfile);
    setDisplayName(member.memberProfile?.displayName ?? member.name);
    setEmail(member.memberProfile?.email ?? member.email);
    setTitle(member.memberProfile?.title ?? '');
    setBio(member.memberProfile?.bio ?? '');
    setEmailError(undefined);
  }

  const run = async (key: string, action: () => void | Promise<void>, fallback: string) => {
    setPending(key);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      report(cause, fallback, onError, setError);
    } finally {
      setPending(undefined);
    }
  };

  const lifecycle = [
    ['isApproved', 'approveMember', 'Approved', member.isApproved],
    ['isBanned', 'banMember', 'Banned', member.isBanned],
    ['isDisabled', 'disableMember', 'Disabled', member.isDisabled],
    ['isExternal', 'markMemberExternal', 'External member', member.isExternal],
    ['isReadOnly', 'markMemberReadOnly', 'Read-only member', member.isReadOnly]
  ] as const;

  return (
    <>
    <TooltipIconButton extendHitArea={false} label={`Manage access for ${member.name}`} onClick={() => setOpen(true)}>
      <Settings2Icon aria-hidden='true' className='size-3.5' />
    </TooltipIconButton>
    <Sheet onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)} open={open}>
      <SheetContent className='w-full gap-0 p-0 sm:max-w-lg' side='right'>
        <header className='flex flex-col gap-1 p-4 pr-12'>
          <SheetTitle className='text-sm font-medium'>Manage {member.name}</SheetTitle>
          <SheetDescription className='text-[13px]'>
            Governance, lifecycle, profile access, and direct exceptions remain separate so effective access is auditable.
          </SheetDescription>
        </header>
        <div className='min-h-0 flex-1 overflow-y-auto border-t border-dashed border-foreground/10 p-4'>
          <div className='flex flex-col gap-5'>
            <section className='flex flex-col gap-2'>
              <SectionHeading description='Owner and administrator changes use Constructive’s append-only semantic grants.' title='Governance' />
              <FeaturePackOptionList>
                {[
                  ['grantAdmin', 'Administrator', member.governance === 'admin' || member.governance === 'owner', actions?.setMemberAdmin],
                  ['grantOwner', 'Owner', member.governance === 'owner', actions?.setMemberOwner]
                ].map(([actionName, label, checked, action]) => {
                  const enabled = canPerform(policy, actionName as 'grantAdmin' | 'grantOwner') &&
                    member.actionPolicy?.[actionName as 'grantAdmin' | 'grantOwner'] === true &&
                    Boolean(action);
                  const id = `${fieldId}-${actionName}`;
                  return (
                    <OrganizationGovernanceControl
                      checked={checked as boolean}
                      disabled={!enabled}
                      id={id}
                      key={String(actionName)}
                      label={label as 'Administrator' | 'Owner'}
                      onConfirm={(isGrant) => run(
                          String(actionName),
                          () => actionName === 'grantAdmin'
                            ? actions!.setMemberAdmin!({
                                organizationId,
                                actorId: member.userId,
                                isGrant
                              })
                            : actions!.setMemberOwner!({
                                organizationId,
                                actorId: member.userId,
                                isGrant
                              }),
                          `The ${String(label).toLowerCase()} grant could not be changed.`
                        )}
                      pending={Boolean(pending)}
                    />
                  );
                })}
              </FeaturePackOptionList>
            </section>

            <section className='flex flex-col gap-2'>
              <SectionHeading description='Approval, bans, disabled access, and membership scope are independent backend flags.' title='Lifecycle' />
              <FeaturePackOptionList>
                {lifecycle.map(([field, actionName, label, checked]) => {
                  const enabled = canPerform(policy, actionName) &&
                    member.actionPolicy?.[actionName] === true &&
                    Boolean(actions?.updateMemberLifecycle);
                  const id = `${fieldId}-${field}`;
                  return (
                    <Field data-disabled={!enabled || Boolean(pending)} key={field} orientation='horizontal'>
                      <FieldLabel htmlFor={id}>{label}</FieldLabel>
                      <Switch
                        checked={checked}
                        disabled={!enabled || Boolean(pending)}
                        id={id}
                        onCheckedChange={(value) => void run(
                          field,
                          () => actions!.updateMemberLifecycle!({
                            organizationId,
                            membershipId: member.id,
                            patch: { [field]: value }
                          }),
                          `The ${label.toLowerCase()} state could not be changed.`
                        )}
                      />
                    </Field>
                  );
                })}
              </FeaturePackOptionList>
            </section>

            {profiles.length > 0 ? (
              <section className='flex flex-col gap-2'>
                <SectionHeading description='Profiles are the primary way to assign organization capabilities.' title='Access profile' />
                <Field label='Profile'>
                  <Select
                    disabled={!canPerform(policy, 'assignProfile') ||
                      member.actionPolicy?.assignProfile !== true ||
                      !actions?.setMemberProfile || Boolean(pending)}
                    onValueChange={(profileId) => void run(
                      'profile',
                      () => profileId === '__none__' && member.profileId
                        ? actions!.setMemberProfile!({
                            organizationId,
                            membershipId: member.id,
                            profileId: member.profileId,
                            isGrant: false
                          })
                        : profileId === '__none__'
                          ? Promise.resolve()
                          : actions!.setMemberProfile!({
                              organizationId,
                              membershipId: member.id,
                              profileId,
                              isGrant: true
                            }),
                      'The member access profile could not be changed.'
                    )}
                    value={member.profileId ?? '__none__'}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {(value: string | null) => value === '__none__'
                          ? 'No profile'
                          : profiles.find((profile) => profile.id === value)?.name ?? value}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem value='__none__'>No profile</SelectItem>
                      {profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>)}
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
              </section>
            ) : null}

            {capabilities.length > 0 ? (
              <section className='flex flex-col gap-2'>
                <SectionHeading description='Use direct grants only when a shared access profile would be too broad.' title='Direct capability exceptions' />
                <FeaturePackOptionList>
                  {capabilities.map((capability) => {
                    const checked = maskIncludes(member.directCapabilities, capability.bitstr);
                    const enabled = canPerform(policy, 'grantCapability') &&
                      member.actionPolicy?.grantCapability === true &&
                      Boolean(actions?.setMemberCapability);
                    const id = `${fieldId}-capability-${capability.id}`;
                    return (
                      <Field data-disabled={!enabled || Boolean(pending)} key={capability.id} orientation='horizontal'>
                        <Checkbox
                          checked={checked}
                          disabled={!enabled || Boolean(pending)}
                          id={id}
                          onCheckedChange={(value) => void run(
                            `capability:${capability.id}`,
                            () => actions!.setMemberCapability!({
                              organizationId,
                              actorId: member.userId,
                              capabilities: capability.bitstr,
                              isGrant: value === true
                            }),
                            'The direct capability could not be changed.'
                          )}
                        />
                        <div className='min-w-0 flex-1'>
                          <FieldLabel htmlFor={id}>{capability.name}</FieldLabel>
                          {capability.description ? <FieldDescription>{capability.description}</FieldDescription> : null}
                        </div>
                      </Field>
                    );
                  })}
                </FeaturePackOptionList>
              </section>
            ) : null}

            <section className='flex flex-col gap-3'>
              <SectionHeading description='This tenant-specific profile is separate from the member’s global account.' title='Organization profile' />
              <FieldGroup>
                <Field htmlFor={`${fieldId}-display-name`} label='Display name'>
                  <Input autoComplete='name' id={`${fieldId}-display-name`} name='member-display-name' onChange={(event) => setDisplayName(event.currentTarget.value)} value={displayName} />
                </Field>
                <Field error={emailError} htmlFor={`${fieldId}-email`} label='Email'>
                  <Input
                    aria-invalid={emailError ? true : undefined}
                    autoCapitalize='none'
                    autoComplete='email'
                    id={`${fieldId}-email`}
                    name='member-email'
                    onChange={(event) => {
                      setEmail(event.currentTarget.value);
                      if (emailError) setEmailError(undefined);
                    }}
                    ref={emailRef}
                    spellCheck={false}
                    type='email'
                    value={email}
                  />
                </Field>
                <Field htmlFor={`${fieldId}-title`} label='Title'>
                  <Input autoComplete='organization-title' id={`${fieldId}-title`} name='member-title' onChange={(event) => setTitle(event.currentTarget.value)} value={title} />
                </Field>
                <Field htmlFor={`${fieldId}-bio`} label='Bio'>
                  <Textarea autoComplete='off' id={`${fieldId}-bio`} name='member-bio' onChange={(event) => setBio(event.currentTarget.value)} value={bio} />
                </Field>
              </FieldGroup>
              {canPerform(policy, 'updateMemberProfile') &&
              member.actionPolicy?.updateMemberProfile &&
              actions?.upsertMemberProfile ? (
                <Button
                  className='self-start'
                  size='sm'
                  disabled={Boolean(pending)}
                  onClick={() => {
                    const emailInput = emailRef.current;
                    if (emailInput && !emailInput.checkValidity()) {
                      setEmailError('Enter a valid email address.');
                      emailInput.focus();
                      return;
                    }
                    setEmailError(undefined);
                    void run(
                      'member-profile',
                      () => actions.upsertMemberProfile!({
                        organizationId,
                        membershipId: member.id,
                        profile: {
                          displayName,
                          email,
                          title,
                          bio
                        }
                      }),
                      'The organization member profile could not be saved.'
                    );
                  }}
                  type='button'
                >
                  Save member profile
                </Button>
              ) : null}
            </section>
            {error ? <p className='text-destructive text-sm' role='alert'>{error}</p> : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}

export function OrganizationCapabilitiesPanel({
  members,
  profiles,
  capabilities
}: Readonly<{
  members: readonly OrganizationMember[];
  profiles: readonly OrganizationAccessProfile[];
  capabilities: readonly OrganizationCapability[];
}>) {
  return (
    <div className='@container/capabilities flex flex-col gap-3'>
      <SectionHeading
        description='Effective access combines profile capabilities with the direct grants shown here as exceptions.'
        title='Capability catalog'
      />
      <div className='grid gap-3 @3xl/capabilities:grid-cols-2'>
        {capabilities.map((capability) => {
          const profileCount = profiles.filter((profile) =>
            profile.capabilityIds.includes(capability.id)
          ).length;
          const directCount = members.filter((member) =>
            maskIncludes(member.directCapabilities, capability.bitstr)
          ).length;
          return (
            <section className='rounded-xl bg-card px-4 py-3.5 shadow-card' key={capability.id}>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <h4 className='text-sm font-medium'>{capability.name}</h4>
                  {capability.description ? (
                    <p className='text-muted-foreground mt-0.5 text-pretty text-[13px]'>
                      {capability.description}
                    </p>
                  ) : null}
                </div>
                <ToneBadge tone='neutral'>Tenant</ToneBadge>
              </div>
              <p className='text-muted-foreground mt-2.5 text-xs tabular-nums'>
                {profileCount} {profileCount === 1 ? 'profile' : 'profiles'} · {directCount}{' '}
                {directCount === 1 ? 'direct grant' : 'direct grants'}
              </p>
            </section>
          );
        })}
      </div>
      {capabilities.length === 0 ? (
        <FeaturePackEmpty icon={ShieldIcon} title='No organization capabilities are visible.' />
      ) : null}
    </div>
  );
}

export function OrganizationDefaultsPanel({
  organizationId,
  membershipDefault,
  actions,
  policy,
  onError
}: AccessPanelProps & Readonly<{
  membershipDefault: OrganizationMembershipDefault;
}>) {
  const [pending, setPending] = React.useState(false);
  const fieldId = React.useId();
  const canUpdate = canPerform(policy, 'updateMembershipDefault') &&
    Boolean(actions?.updateMembershipDefault);

  return (
    <FeaturePackOptionList className='max-w-2xl'>
      <Field data-disabled={!canUpdate || pending} orientation='horizontal'>
        <div className='min-w-0 flex-1'>
          <FieldLabel htmlFor={fieldId}>Approve new memberships automatically</FieldLabel>
          <FieldDescription>
            When disabled, invited members remain pending until an organization manager approves them.
          </FieldDescription>
        </div>
        <Switch
          checked={membershipDefault.isApproved}
          disabled={!canUpdate || pending}
          id={fieldId}
          onCheckedChange={(isApproved) => {
            if (!actions?.updateMembershipDefault) return;
            setPending(true);
            void Promise.resolve(actions.updateMembershipDefault({
              organizationId,
              defaultId: membershipDefault.id,
              isApproved
            })).catch((cause) => {
              report(cause, 'The membership default could not be changed.', onError);
            }).finally(() => setPending(false));
          }}
        />
      </Field>
    </FeaturePackOptionList>
  );
}

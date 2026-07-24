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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import { Switch } from '@constructive-io/ui/switch';
import { Textarea } from '@constructive-io/ui/textarea';

import {
  canPerform,
  normalizeFeaturePackError
} from '../shared/feature-pack-contracts';
import type {
  OrganizationAccessProfile,
  OrganizationMember,
  OrganizationMembershipDefault,
  OrganizationPermission,
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
      <DialogTrigger render={<Button size={profile ? 'icon-sm' : 'sm'} variant='outline' />}>
        {profile ? <PencilIcon aria-hidden='true' /> : <PlusIcon data-icon='inline-start' />}
        {profile ? <span className='sr-only'>Edit {profile.name}</span> : 'New profile'}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>{profile ? `Edit ${profile.name}` : 'Create an access profile'}</DialogTitle>
            <DialogDescription>
              Profiles bundle organization permissions so access remains understandable as the team grows.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FieldGroup>
              <Field error={error} htmlFor={`${fieldId}-name`} label='Name' required>
                <Input
                  aria-invalid={error ? true : undefined}
                  id={`${fieldId}-name`}
                  onChange={(event) => setName(event.currentTarget.value)}
                  required
                  value={name}
                />
              </Field>
              <Field htmlFor={`${fieldId}-description`} label='Description'>
                <Textarea
                  id={`${fieldId}-description`}
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
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size='icon-sm' variant='ghost' />}>
        <Trash2Icon aria-hidden='true' />
        <span className='sr-only'>Delete {profile.name}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {profile.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Members assigned to this profile lose its bundled permissions. Direct grants remain unchanged.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep profile</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() => {
              setPending(true);
              void Promise.resolve(action({ organizationId, profileId: profile.id })).catch((cause) => {
                report(cause, 'The access profile could not be deleted.', onError);
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
  permissions,
  actions,
  policy,
  onError
}: AccessPanelProps & Readonly<{
  profiles: readonly OrganizationAccessProfile[];
  permissions: readonly OrganizationPermission[];
}>) {
  const [pendingPermission, setPendingPermission] = React.useState<string>();

  const setPermission = async (
    profile: OrganizationAccessProfile,
    permissionId: string,
    isGrant: boolean
  ) => {
    if (!actions?.setProfilePermission) return;
    const pendingKey = `${profile.id}:${permissionId}`;
    setPendingPermission(pendingKey);
    try {
      await actions.setProfilePermission({
        organizationId,
        profileId: profile.id,
        permissionId,
        isGrant
      });
    } catch (cause) {
      report(cause, 'The profile permission could not be changed.', onError);
    } finally {
      setPendingPermission(undefined);
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h3 className='text-sm font-medium'>Access profiles</h3>
          <p className='text-muted-foreground text-pretty text-sm'>
            Assign profiles for routine access, then reserve direct grants for exceptions.
          </p>
        </div>
        {canPerform(policy, 'createAccessProfile') && actions?.createAccessProfile ? (
          <AccessProfileDialog
            action={actions.createAccessProfile}
            onError={onError}
            organizationId={organizationId}
          />
        ) : null}
      </div>
      {profiles.length === 0 ? (
        <Empty className='min-h-52 border' role='status'>
          <EmptyHeader>
            <EmptyMedia variant='icon'><ShieldIcon aria-hidden='true' /></EmptyMedia>
            <EmptyTitle>No access profiles</EmptyTitle>
            <EmptyDescription>Create a profile to bundle organization permissions.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='grid gap-4 xl:grid-cols-2'>
          {profiles.map((profile) => {
            const assigned = new Set(profile.permissionIds);
            const canSet = canPerform(policy, 'setProfilePermission') &&
              profile.actionPolicy?.setProfilePermission === true &&
              Boolean(actions?.setProfilePermission);
            return (
              <section className='border-border/70 rounded-xl border p-4' key={profile.id}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h4 className='truncate font-medium'>{profile.name}</h4>
                      {profile.isSystem ? <Badge variant='secondary'>System</Badge> : null}
                      {profile.isDefault ? <Badge>Default</Badge> : null}
                    </div>
                    <p className='text-muted-foreground mt-1 text-pretty text-sm'>
                      {profile.description ?? 'No description provided.'}
                    </p>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
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
                {permissions.length > 0 ? (
                  <FieldGroup className='mt-4'>
                    {permissions.map((permission) => {
                      const key = `${profile.id}:${permission.id}`;
                      return (
                        <Field
                          data-disabled={!canSet || Boolean(pendingPermission)}
                          key={permission.id}
                          orientation='horizontal'
                        >
                          <Checkbox
                            aria-label={`${assigned.has(permission.id) ? 'Remove' : 'Add'} ${permission.name} ${assigned.has(permission.id) ? 'from' : 'to'} ${profile.name}`}
                            checked={assigned.has(permission.id)}
                            disabled={!canSet || Boolean(pendingPermission)}
                            id={key}
                            onCheckedChange={(checked) => void setPermission(
                              profile,
                              permission.id,
                              checked === true
                            )}
                          />
                          <div className='min-w-0 flex-1'>
                            <FieldLabel htmlFor={key}>{permission.name}</FieldLabel>
                            {permission.description ? (
                              <FieldDescription>{permission.description}</FieldDescription>
                            ) : null}
                          </div>
                        </Field>
                      );
                    })}
                  </FieldGroup>
                ) : (
                  <p className='text-muted-foreground mt-4 text-sm'>
                    The organization permission catalog is unavailable.
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
                : `This removes the ${label.toLowerCase()} grant while preserving the member’s account, membership, profile, and direct permissions.`}
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
  permissions,
  actions,
  policy,
  onError
}: AccessPanelProps & Readonly<{
  member: OrganizationMember;
  profiles: readonly OrganizationAccessProfile[];
  permissions: readonly OrganizationPermission[];
}>) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string>();
  const [displayName, setDisplayName] = React.useState(member.memberProfile?.displayName ?? member.name);
  const [email, setEmail] = React.useState(member.memberProfile?.email ?? member.email);
  const [title, setTitle] = React.useState(member.memberProfile?.title ?? '');
  const [bio, setBio] = React.useState(member.memberProfile?.bio ?? '');
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();

  React.useEffect(() => {
    setDisplayName(member.memberProfile?.displayName ?? member.name);
    setEmail(member.memberProfile?.email ?? member.email);
    setTitle(member.memberProfile?.title ?? '');
    setBio(member.memberProfile?.bio ?? '');
  }, [member]);

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
    <Dialog onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)} open={open}>
      <DialogTrigger render={<Button size='icon-sm' variant='ghost' />}>
        <Settings2Icon aria-hidden='true' />
        <span className='sr-only'>Manage access for {member.name}</span>
      </DialogTrigger>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Manage {member.name}</DialogTitle>
          <DialogDescription>
            Governance, lifecycle, profile access, and direct exceptions remain separate so effective access is auditable.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className='max-h-[65vh] overflow-y-auto'>
          <div className='flex flex-col gap-6'>
            <section className='flex flex-col gap-3'>
              <div><h4 className='text-sm font-medium'>Governance</h4><p className='text-muted-foreground text-xs'>Owner and administrator changes use Constructive&apos;s append-only semantic grants.</p></div>
              <FieldGroup>
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
              </FieldGroup>
            </section>

            <section className='flex flex-col gap-3'>
              <div><h4 className='text-sm font-medium'>Lifecycle</h4><p className='text-muted-foreground text-xs'>Approval, bans, disabled access, and membership scope are independent backend flags.</p></div>
              <FieldGroup>
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
              </FieldGroup>
            </section>

            {profiles.length > 0 ? (
              <section className='flex flex-col gap-3'>
                <div><h4 className='text-sm font-medium'>Access profile</h4><p className='text-muted-foreground text-xs'>Profiles are the primary way to assign organization permissions.</p></div>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem value='__none__'>No profile</SelectItem>
                      {profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>)}
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
              </section>
            ) : null}

            {permissions.length > 0 ? (
              <section className='flex flex-col gap-3'>
                <div><h4 className='text-sm font-medium'>Direct permission exceptions</h4><p className='text-muted-foreground text-xs'>Use direct grants only when a shared access profile would be too broad.</p></div>
                <FieldGroup>
                  {permissions.map((permission) => {
                    const checked = maskIncludes(member.directPermissions, permission.bitstr);
                    const enabled = canPerform(policy, 'grantPermission') &&
                      member.actionPolicy?.grantPermission === true &&
                      Boolean(actions?.setMemberPermission);
                    const id = `${fieldId}-permission-${permission.id}`;
                    return (
                      <Field data-disabled={!enabled || Boolean(pending)} key={permission.id} orientation='horizontal'>
                        <Checkbox
                          checked={checked}
                          disabled={!enabled || Boolean(pending)}
                          id={id}
                          onCheckedChange={(value) => void run(
                            `permission:${permission.id}`,
                            () => actions!.setMemberPermission!({
                              organizationId,
                              actorId: member.userId,
                              permissions: permission.bitstr,
                              isGrant: value === true
                            }),
                            'The direct permission could not be changed.'
                          )}
                        />
                        <div className='min-w-0 flex-1'>
                          <FieldLabel htmlFor={id}>{permission.name}</FieldLabel>
                          {permission.description ? <FieldDescription>{permission.description}</FieldDescription> : null}
                        </div>
                      </Field>
                    );
                  })}
                </FieldGroup>
              </section>
            ) : null}

            <section className='flex flex-col gap-3'>
              <div><h4 className='text-sm font-medium'>Organization profile</h4><p className='text-muted-foreground text-xs'>This tenant-specific profile is separate from the member&apos;s global account.</p></div>
              <FieldGroup>
                <Field htmlFor={`${fieldId}-display-name`} label='Display name'><Input id={`${fieldId}-display-name`} onChange={(event) => setDisplayName(event.currentTarget.value)} value={displayName} /></Field>
                <Field htmlFor={`${fieldId}-email`} label='Email'><Input id={`${fieldId}-email`} onChange={(event) => setEmail(event.currentTarget.value)} type='email' value={email} /></Field>
                <Field htmlFor={`${fieldId}-title`} label='Title'><Input id={`${fieldId}-title`} onChange={(event) => setTitle(event.currentTarget.value)} value={title} /></Field>
                <Field htmlFor={`${fieldId}-bio`} label='Bio'><Textarea id={`${fieldId}-bio`} onChange={(event) => setBio(event.currentTarget.value)} value={bio} /></Field>
              </FieldGroup>
              {canPerform(policy, 'updateMemberProfile') &&
              member.actionPolicy?.updateMemberProfile &&
              actions?.upsertMemberProfile ? (
                <Button
                  className='self-start'
                  disabled={Boolean(pending)}
                  onClick={() => void run(
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
                  )}
                  type='button'
                >
                  Save member profile
                </Button>
              ) : null}
            </section>
            {error ? <p className='text-destructive text-sm' role='alert'>{error}</p> : null}
          </div>
        </DialogPanel>
      </DialogContent>
    </Dialog>
  );
}

export function OrganizationPermissionsPanel({
  members,
  profiles,
  permissions
}: Readonly<{
  members: readonly OrganizationMember[];
  profiles: readonly OrganizationAccessProfile[];
  permissions: readonly OrganizationPermission[];
}>) {
  return (
    <div className='flex flex-col gap-4'>
      <div>
        <h3 className='text-sm font-medium'>Permission catalog</h3>
        <p className='text-muted-foreground text-pretty text-sm'>
          Effective access combines profile permissions with the direct grants shown here as exceptions.
        </p>
      </div>
      <div className='grid gap-3 xl:grid-cols-2'>
        {permissions.map((permission) => {
          const profileCount = profiles.filter((profile) =>
            profile.permissionIds.includes(permission.id)
          ).length;
          const directCount = members.filter((member) =>
            maskIncludes(member.directPermissions, permission.bitstr)
          ).length;
          return (
            <section className='border-border/70 rounded-xl border p-4' key={permission.id}>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h4 className='font-medium'>{permission.name}</h4>
                  {permission.description ? (
                    <p className='text-muted-foreground mt-1 text-pretty text-sm'>
                      {permission.description}
                    </p>
                  ) : null}
                </div>
                <Badge variant='outline'>Tenant</Badge>
              </div>
              <p className='text-muted-foreground mt-3 text-xs tabular-nums'>
                {profileCount} {profileCount === 1 ? 'profile' : 'profiles'} · {directCount}{' '}
                {directCount === 1 ? 'direct grant' : 'direct grants'}
              </p>
            </section>
          );
        })}
      </div>
      {permissions.length === 0 ? (
        <p className='text-muted-foreground text-sm'>No organization permissions are visible.</p>
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
    <div className='max-w-2xl'>
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
    </div>
  );
}

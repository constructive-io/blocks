'use client';

import * as React from 'react';
import {
  Building2Icon,
  CheckIcon,
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
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
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
  FeaturePackLimitations,
  FeaturePackPageHeader,
  FeatureStatusBadge,
  FeaturePackTimestamp
} from '../shared/feature-pack-ui';

const NO_ROLE_VALUE = '__no_role__';

export type OrganizationSummary = Readonly<{
  id: string;
  name: string;
  slug?: string;
  avatarUrl?: string;
  memberCount?: number;
}>;

export type OrganizationMember = Readonly<{
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  status: string;
}>;

export type OrganizationInvite = Readonly<{
  id: string;
  email: string;
  role?: string;
  status: string;
  expiresAt?: string;
  actionPolicy?: FeatureActionPolicy<'cancelInvite'>;
}>;

export type OrganizationsFeatureData = Readonly<{
  organizations: readonly OrganizationSummary[];
  activeOrganizationId?: string;
  members: readonly OrganizationMember[];
  invites?: readonly OrganizationInvite[];
  roles?: readonly string[];
  inviteRoles?: readonly string[];
}>;

export type OrganizationsFeatureAction =
  | 'createOrganization'
  | 'selectOrganization'
  | 'inviteMember'
  | 'assignInviteRole'
  | 'updateMemberRole'
  | 'removeMember'
  | 'cancelInvite';

export type OrganizationsFeatureActions = Readonly<{
  createOrganization?: (input: { name: string }) => FeatureActionResult;
  selectOrganization?: (input: { organizationId: string }) => FeatureActionResult;
  inviteMember?: (input: {
    organizationId: string;
    email: string;
    role?: string;
  }) => FeatureActionResult;
  updateMemberRole?: (input: {
    organizationId: string;
    membershipId: string;
    role: string;
  }) => FeatureActionResult;
  removeMember?: (input: {
    organizationId: string;
    membershipId: string;
  }) => FeatureActionResult;
  cancelInvite?: (input: {
    organizationId: string;
    inviteId: string;
  }) => FeatureActionResult;
}>;

export type OrganizationsFeaturePackProps = Readonly<{
  resource: FeaturePackResource<OrganizationsFeatureData>;
  policy?: FeatureActionPolicy<OrganizationsFeatureAction>;
  actions?: OrganizationsFeatureActions;
  onError?: (error: FeaturePackError) => void;
}>;

function initials(value: string): string {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function TextActionDialog({
  kind,
  roles = [],
  onSubmit
}: Readonly<{
  kind: 'organization' | 'invitation';
  roles?: readonly string[];
  onSubmit: (input: { value: string; role?: string }) => Promise<
    | Readonly<{ ok: true }>
    | Readonly<{ ok: false; error: FeaturePackError }>
  >;
}>) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [role, setRole] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();

  React.useEffect(() => {
    setRole((currentRole) => roles.includes(currentRole) ? currentRole : '');
  }, [roles]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await onSubmit({
        value: value.trim(),
        role: roles.includes(role) ? role : undefined
      });
      if (result.ok) {
        setValue('');
        setOpen(false);
      } else if ('error' in result) {
        setError(result.error.message);
      }
    } finally {
      setPending(false);
    }
  };

  const invitation = kind === 'invitation';
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
    >
      <DialogTrigger render={<Button variant={invitation ? 'default' : 'outline'} />}>
        {invitation ? <MailPlusIcon data-icon='inline-start' /> : <PlusIcon data-icon='inline-start' />}
        {invitation ? 'Invite member' : 'New organization'}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>{invitation ? 'Invite an organization member' : 'Create an organization'}</DialogTitle>
            <DialogDescription>
              {invitation
                ? 'Membership grants access within the selected organization.'
                : 'Create a tenant boundary for memberships and organization-owned resources.'}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className='flex flex-col gap-4'>
            <Field
              error={error}
              htmlFor={`${fieldId}-value`}
              label={invitation ? 'Email address' : 'Organization name'}
              required
            >
              <Input
                aria-invalid={Boolean(error)}
                id={`${fieldId}-value`}
                onChange={(event) => setValue(event.currentTarget.value)}
                required
                type={invitation ? 'email' : 'text'}
                value={value}
              />
            </Field>
            {invitation && roles.length > 0 ? (
              <Field htmlFor={`${fieldId}-role`} label='Role'>
                <Select
                  onValueChange={(nextRole) => setRole(
                    nextRole === NO_ROLE_VALUE ? '' : nextRole
                  )}
                  value={role || NO_ROLE_VALUE}
                >
                  <SelectTrigger id={`${fieldId}-role`}>
                    <SelectValue>
                      {(value: string | null) => value === NO_ROLE_VALUE ? 'No role' : value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NO_ROLE_VALUE}>No role</SelectItem>
                      {roles.map((candidate) => <SelectItem key={candidate} value={candidate}>{candidate}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !value.trim()} type='submit'>
              {pending ? 'Working…' : invitation ? 'Send invitation' : 'Create organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrganizationMemberRoleSelect({
  member,
  organizationId,
  roles,
  updateRole,
  onError
}: Readonly<{
  member: OrganizationMember;
  organizationId: string;
  roles: readonly string[];
  updateRole: NonNullable<OrganizationsFeatureActions['updateMemberRole']>;
  onError?: OrganizationsFeaturePackProps['onError'];
}>) {
  const [pending, setPending] = React.useState(false);
  const options = roles.includes(member.role) ? roles : [member.role, ...roles];

  const changeRole = async (role: string) => {
    if (role === member.role) return;
    setPending(true);
    try {
      await updateRole({ organizationId, membershipId: member.id, role });
    } catch (cause) {
      onError?.(normalizeFeaturePackError(cause, 'The organization member role could not be changed.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Select disabled={pending} onValueChange={(role) => void changeRole(role)} value={member.role}>
      <SelectTrigger aria-label={`Role for ${member.name}`} className='min-w-32' size='sm'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
        </SelectGroup>
      </SelectContent>
    </Select>
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

  const remove = async () => {
    setPending(true);
    try {
      await removeMember({ organizationId, membershipId: member.id });
      setOpen(false);
    } catch (cause) {
      onError?.(normalizeFeaturePackError(cause, 'The organization member could not be removed.'));
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
          if (!pending) setOpen(nextOpen);
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

  const cancel = async () => {
    setPending(true);
    try {
      await cancelInvite({ organizationId, inviteId: invite.id });
      setOpen(false);
    } catch (cause) {
      onError?.(normalizeFeaturePackError(cause, 'The invitation could not be canceled.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
      open={open}
    >
      <AlertDialogTrigger render={<Button size='sm' variant='outline' />}>
        Cancel
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel invitation for {invite.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            The organization invitation link will stop working. You can invite this person again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
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

export function OrganizationsFeaturePack({
  resource,
  policy,
  actions,
  onError
}: OrganizationsFeaturePackProps) {
  const [query, setQuery] = React.useState('');

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
            <TextActionDialog
              kind='organization'
              onSubmit={({ value }) => run(() => actions.createOrganization!({ name: value }), 'The organization could not be created.')}
            />
          ) : null
        }
        description='Switch tenant context and manage organization memberships without bypassing database policy.'
        eyebrow='Tenant access'
        title='Organizations'
      />
      <FeaturePackLimitations
        limitations={resource.status === 'ready' ? resource.limitations : undefined}
      />
      <FeaturePackBoundary
        emptyAction={
          canPerform(policy, 'createOrganization') && actions?.createOrganization ? (
            <TextActionDialog
              kind='organization'
              onSubmit={({ value }) => run(() => actions.createOrganization!({ name: value }), 'The organization could not be created.')}
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
            !normalized || `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(normalized)
          );

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
                            void run(
                              () => actions.selectOrganization!({ organizationId: organization.id }),
                              'The organization could not be selected.'
                            );
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
                </CardContent>
              </Card>

              <div className='min-w-0'>
                <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <h2 className='text-lg font-semibold'>{active?.name ?? 'Organization'}</h2>
                    <p className='text-muted-foreground text-sm'>Membership and invitations for this tenant.</p>
                  </div>
                  {active && canPerform(policy, 'inviteMember') && actions?.inviteMember ? (
                    <TextActionDialog
                      kind='invitation'
                      onSubmit={({ value, role }) =>
                        run(
                          () => actions.inviteMember!({ organizationId: active.id, email: value, role }),
                          'The invitation could not be sent.'
                        )
                      }
                      roles={canPerform(policy, 'assignInviteRole')
                        ? data.inviteRoles ?? data.roles
                        : []}
                    />
                  ) : null}
                </div>
                <Tabs defaultValue='members'>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <TabsList>
                      <TabsTrigger value='members'>Members ({data.members.length})</TabsTrigger>
                      {data.invites ? <TabsTrigger value='invites'>Invitations ({data.invites.length})</TabsTrigger> : null}
                    </TabsList>
                    <label className='relative block w-full sm:max-w-xs'>
                      <span className='sr-only'>Search organization members</span>
                      <SearchIcon className='text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2' />
                      <Input className='pl-10' onChange={(event) => setQuery(event.currentTarget.value)} placeholder='Search members' value={query} />
                    </label>
                  </div>
                  <TabsContent value='members'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='w-12'><span className='sr-only'>Actions</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
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
                            <TableCell>
                              {active && canPerform(policy, 'updateMemberRole') && actions?.updateMemberRole && (data.roles?.length ?? 0) > 0 ? (
                                <OrganizationMemberRoleSelect
                                  member={member}
                                  onError={onError}
                                  organizationId={active.id}
                                  roles={data.roles ?? []}
                                  updateRole={actions.updateMemberRole}
                                />
                              ) : member.role}
                            </TableCell>
                            <TableCell><FeatureStatusBadge status={member.status} /></TableCell>
                            <TableCell>
                              {active && canPerform(policy, 'removeMember') && actions?.removeMember ? (
                                <OrganizationMemberActions
                                  member={member}
                                  onError={onError}
                                  organizationId={active.id}
                                  removeMember={actions.removeMember}
                                />
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  {data.invites ? (
                    <TabsContent value='invites'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className='text-right'>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.invites.map((invite) => (
                            <TableRow key={invite.id}>
                              <TableCell className='font-medium'>{invite.email}</TableCell>
                              <TableCell>{invite.role ?? 'Member'}</TableCell>
                              <TableCell><FeatureStatusBadge status={invite.status} /></TableCell>
                              <TableCell><FeaturePackTimestamp value={invite.expiresAt} /></TableCell>
                              <TableCell className='text-right'>
                                {active &&
                                canPerform(policy, 'cancelInvite') &&
                                canPerform(invite.actionPolicy, 'cancelInvite') &&
                                actions?.cancelInvite ? (
                                  <CancelOrganizationInviteAction
                                    cancelInvite={actions.cancelInvite}
                                    invite={invite}
                                    onError={onError}
                                    organizationId={active.id}
                                  />
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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

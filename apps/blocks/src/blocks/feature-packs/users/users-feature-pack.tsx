'use client';

import * as React from 'react';
import {
  MailPlusIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
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
  AlertDialogTitle
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
  FeaturePackPageHeader,
  FeatureStatusBadge
} from '../shared/feature-pack-ui';

const NO_ROLE_VALUE = '__no_role__';

export type AppMember = Readonly<{
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status: string;
  role?: string;
  profile?: string;
  joinedAt?: string;
}>;

export type AppInvite = Readonly<{
  id: string;
  email: string;
  status: string;
  role?: string;
  expiresAt?: string;
}>;

export type UsersFeatureData = Readonly<{
  members: readonly AppMember[];
  invites?: readonly AppInvite[];
  roles?: readonly string[];
}>;

export type UsersFeatureAction =
  | 'invite'
  | 'assignInviteRole'
  | 'updateRole'
  | 'toggleActive'
  | 'remove'
  | 'cancelInvite'
  | 'extendInvite';

export type UsersFeatureActions = Readonly<{
  invite?: (input: { email: string; role?: string }) => FeatureActionResult;
  updateRole?: (input: { membershipId: string; role: string }) => FeatureActionResult;
  toggleActive?: (input: { membershipId: string; active: boolean }) => FeatureActionResult;
  remove?: (input: { membershipId: string }) => FeatureActionResult;
  cancelInvite?: (input: { inviteId: string }) => FeatureActionResult;
  extendInvite?: (input: { inviteId: string }) => FeatureActionResult;
}>;

export type UsersFeaturePackProps = Readonly<{
  resource: FeaturePackResource<UsersFeatureData>;
  policy?: FeatureActionPolicy<UsersFeatureAction>;
  actions?: UsersFeatureActions;
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

function InviteMemberDialog({
  roles,
  onInvite,
  onError
}: Readonly<{
  roles: readonly string[];
  onInvite: NonNullable<UsersFeatureActions['invite']>;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setPending(true);
    setError(undefined);
    try {
      await onInvite({
        email: email.trim(),
        role: roles.includes(role) ? role : undefined
      });
      setEmail('');
      setOpen(false);
    } catch (cause) {
      const normalized = normalizeFeaturePackError(cause, 'The invitation could not be sent.');
      setError(normalized.message);
      onError?.(normalized);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <MailPlusIcon data-icon='inline-start' />
        Invite member
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Invite an app member</DialogTitle>
            <DialogDescription>
              The invitation grants app membership only. Each person owns their account credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className='flex flex-col gap-4'>
              <Field error={error} htmlFor={`${fieldId}-email`} label='Email address' required>
                <Input
                  aria-invalid={Boolean(error)}
                  autoComplete='email'
                  id={`${fieldId}-email`}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  placeholder='member@example.com'
                  type='email'
                  value={email}
                />
              </Field>
              {roles.length > 0 ? (
                <Field htmlFor={`${fieldId}-role`} label='Role'>
                  <Select
                    onValueChange={(value) => setRole(value === NO_ROLE_VALUE ? '' : value)}
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
                        {roles.map((candidate) => (
                          <SelectItem key={candidate} value={candidate}>
                            {candidate}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !email.trim()} type='submit'>
              {pending ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [removePending, setRemovePending] = React.useState(false);

  const run = async (action: () => FeatureActionResult, fallback: string): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (cause) {
      onError?.(normalizeFeaturePackError(cause, fallback));
      return false;
    }
  };

  const hasActions =
    (canPerform(policy, 'toggleActive') && actions?.toggleActive) ||
    (canPerform(policy, 'remove') && actions?.remove);

  if (!hasActions) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${member.name}`}
          render={<Button size='icon' variant='ghost' />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            {canPerform(policy, 'toggleActive') && actions?.toggleActive ? (
              <DropdownMenuItem
                onClick={() =>
                  void run(
                    () =>
                      actions.toggleActive?.({
                        membershipId: member.id,
                        active: member.status !== 'active'
                      }),
                    'The membership status could not be changed.'
                  )
                }
              >
                <ShieldCheckIcon />
                {member.status === 'active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            ) : null}
            {canPerform(policy, 'remove') && actions?.remove ? (
              <DropdownMenuItem onClick={() => setRemoveOpen(true)} variant='destructive'>
                <UserMinusIcon />
                Remove membership
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {canPerform(policy, 'remove') && actions?.remove ? (
        <AlertDialog
          onOpenChange={(nextOpen) => {
            if (!removePending) setRemoveOpen(nextOpen);
          }}
          open={removeOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This revokes the member&apos;s access to this application. Their personal account remains intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removePending}>Cancel</AlertDialogCancel>
              <Button
                disabled={removePending}
                onClick={() => {
                  setRemovePending(true);
                  void run(
                    () => actions.remove!({ membershipId: member.id }),
                    'The member could not be removed.'
                  ).then((succeeded) => {
                    if (succeeded) setRemoveOpen(false);
                  }).finally(() => setRemovePending(false));
                }}
                variant='destructive'
              >
                {removePending ? 'Removing…' : 'Remove membership'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}

function MemberRoleSelect({
  member,
  roles,
  updateRole,
  onError
}: Readonly<{
  member: AppMember;
  roles: readonly string[];
  updateRole: NonNullable<UsersFeatureActions['updateRole']>;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [pending, setPending] = React.useState(false);
  const options = member.role && !roles.includes(member.role)
    ? [member.role, ...roles]
    : roles;

  const changeRole = async (role: string) => {
    if (role === member.role) return;
    setPending(true);
    try {
      await updateRole({ membershipId: member.id, role });
    } catch (cause) {
      onError?.(normalizeFeaturePackError(cause, 'The member role could not be changed.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Select
      disabled={pending}
      onValueChange={(role) => void changeRole(role)}
      value={member.role ?? ''}
    >
      <SelectTrigger aria-label={`Role for ${member.name}`} className='min-w-32' size='sm'>
        <SelectValue placeholder='Choose a role' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((role) => (
            <SelectItem key={role} value={role}>{role}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function UsersFeaturePack({
  resource,
  policy,
  actions,
  title = 'Users',
  description = 'Review application members and profiles, then manage invitations, roles, and access status without taking ownership of personal credentials.',
  onError
}: UsersFeaturePackProps) {
  const [query, setQuery] = React.useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const canInvite = canPerform(policy, 'invite') && Boolean(actions?.invite);
  const inviteRoles = resource.status === 'ready' && canPerform(policy, 'assignInviteRole')
    ? resource.data.roles ?? []
    : [];

  return (
    <div className='flex flex-col gap-6'>
      <FeaturePackPageHeader
        actions={
          canInvite && actions?.invite && resource.status === 'ready' ? (
            <InviteMemberDialog
              onError={onError}
              onInvite={actions.invite}
              roles={inviteRoles}
            />
          ) : null
        }
        description={description}
        eyebrow='Application access'
        title={title}
      />
      <FeaturePackBoundary
        emptyDescription='Invite the first person when the app is ready for collaborators.'
        emptyAction={
          canInvite && actions?.invite ? (
            <InviteMemberDialog onError={onError} onInvite={actions.invite} roles={inviteRoles} />
          ) : null
        }
        emptyTitle='No app members yet'
        resource={resource}
      >
        {(data) => {
          const members = data.members.filter((member) => {
            if (!normalizedQuery) return true;
            return `${member.name} ${member.email} ${member.role ?? ''}`
              .toLowerCase()
              .includes(normalizedQuery);
          });
          const invites = data.invites ?? [];

          return (
            <Tabs defaultValue='members'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <TabsList>
                  <TabsTrigger value='members'>Members ({data.members.length})</TabsTrigger>
                  {data.invites ? (
                    <TabsTrigger value='invites'>Invitations ({invites.length})</TabsTrigger>
                  ) : null}
                </TabsList>
                <label className='relative block w-full sm:max-w-xs'>
                  <span className='sr-only'>Search members</span>
                  <SearchIcon
                    aria-hidden='true'
                    className='text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2'
                  />
                  <Input
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder='Search members'
                    type='search'
                    value={query}
                  />
                </label>
              </div>
              <TabsContent value='members'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='w-12'><span className='sr-only'>Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className='flex min-w-52 items-center gap-3'>
                            <Avatar>
                              {member.avatarUrl ? <AvatarImage alt='' src={member.avatarUrl} /> : null}
                              <AvatarFallback>{initials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div className='min-w-0'>
                              <div className='truncate font-medium'>{member.name}</div>
                              <div className='text-muted-foreground truncate text-sm'>{member.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {canPerform(policy, 'updateRole') && actions?.updateRole && (data.roles?.length ?? 0) > 0 ? (
                            <MemberRoleSelect
                              member={member}
                              onError={onError}
                              roles={data.roles ?? []}
                              updateRole={actions.updateRole}
                            />
                          ) : member.role ?? 'Member'}
                        </TableCell>
                        <TableCell>{member.profile ?? '—'}</TableCell>
                        <TableCell><FeatureStatusBadge status={member.status} /></TableCell>
                        <TableCell>
                          <MemberActions actions={actions} member={member} onError={onError} policy={policy} />
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
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className='font-medium'>{invite.email}</TableCell>
                          <TableCell>{invite.role ?? 'Member'}</TableCell>
                          <TableCell><FeatureStatusBadge status={invite.status} /></TableCell>
                          <TableCell>{invite.expiresAt ?? '—'}</TableCell>
                          <TableCell>
                            <div className='flex justify-end gap-2'>
                              {canPerform(policy, 'extendInvite') && actions?.extendInvite ? (
                                <Button
                                  aria-label={`Extend invitation for ${invite.email}`}
                                  onClick={() => {
                                    void (async () => {
                                      try {
                                        await actions.extendInvite!({ inviteId: invite.id });
                                      } catch (cause) {
                                        onError?.(normalizeFeaturePackError(cause, 'The invitation could not be extended.'));
                                      }
                                    })();
                                  }}
                                  size='icon'
                                  variant='ghost'
                                >
                                  <RefreshCwIcon />
                                </Button>
                              ) : null}
                              {canPerform(policy, 'cancelInvite') && actions?.cancelInvite ? (
                                <Button
                                  onClick={() => {
                                    void (async () => {
                                      try {
                                        await actions.cancelInvite!({ inviteId: invite.id });
                                      } catch (cause) {
                                        onError?.(normalizeFeaturePackError(cause, 'The invitation could not be canceled.'));
                                      }
                                    })();
                                  }}
                                  size='sm'
                                  variant='outline'
                                >
                                  Cancel
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ) : null}
            </Tabs>
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}

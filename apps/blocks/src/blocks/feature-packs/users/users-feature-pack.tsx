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
import { Field } from '@constructive-io/ui/field';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
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
  FeatureStatusBadge,
  FeaturePackTimestamp
} from '../shared/feature-pack-ui';

type UsersSection = 'members' | 'invites';

const sectionTriggerClass = cn(
  'relative h-10 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3',
  'text-muted-foreground shadow-none',
  'hover:text-foreground data-[active]:text-foreground',
  'data-[active]:border-foreground data-[active]:bg-transparent data-[active]:shadow-none',
  'focus-visible:ring-0 focus-visible:outline-none'
);

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
  actionPolicy?: FeatureActionPolicy<'cancelInvite' | 'extendInvite'>;
}>;

export type UsersFeatureData = Readonly<{
  members: readonly AppMember[];
  invites?: readonly AppInvite[];
  roles?: readonly string[];
  inviteRoles?: readonly string[];
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

  React.useEffect(() => {
    setRole((currentRole) => roles.includes(currentRole) ? currentRole : '');
  }, [roles]);

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
                  aria-invalid={error ? true : undefined}
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

function CancelAppInviteAction({
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

  const cancel = async () => {
    setPending(true);
    try {
      await cancelInvite({ inviteId: invite.id });
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
            The invitation link will stop working. You can send a new invitation later.
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

/**
 * People directory: hero + underline sections + open list rows.
 * Same principles as the account identity hub — no nested tab/card chrome.
 */
export function UsersFeaturePack({
  resource,
  policy,
  actions,
  title = 'Users',
  description,
  onError
}: UsersFeaturePackProps) {
  const [query, setQuery] = React.useState('');
  const [section, setSection] = React.useState<UsersSection>('members');
  const normalizedQuery = query.trim().toLowerCase();
  const canInvite = canPerform(policy, 'invite') && Boolean(actions?.invite);
  const inviteRoles = resource.status === 'ready' && canPerform(policy, 'assignInviteRole')
    ? resource.data.inviteRoles ?? resource.data.roles ?? []
    : [];

  return (
    <div className='flex flex-col gap-6'>
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
          const showInvites = data.invites !== undefined;
          const activeCount = data.members.filter(
            (member) => member.status.trim().toLowerCase() === 'active'
          ).length;
          const multiSection = showInvites;
          const activeSection =
            multiSection && section === 'invites' ? 'invites' : 'members';

          const inviteAction =
            canInvite && actions?.invite ? (
              <InviteMemberDialog
                onError={onError}
                onInvite={actions.invite}
                roles={inviteRoles}
              />
            ) : null;

          return (
            <div className='flex flex-col gap-6'>
              <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
                <div className='min-w-0'>
                  <h1 className='text-balance text-lg font-semibold tracking-tight lg:text-xl'>
                    {title}
                  </h1>
                  <p className='text-muted-foreground mt-1 text-pretty text-sm'>
                    {description ?? (
                      <>
                        <span className='tabular-nums'>{data.members.length}</span>
                        {' '}
                        {data.members.length === 1 ? 'member' : 'members'}
                        {activeCount !== data.members.length ? (
                          <>
                            {' · '}
                            <span className='tabular-nums'>{activeCount}</span>
                            {' active'}
                          </>
                        ) : null}
                        {showInvites && invites.length > 0 ? (
                          <>
                            {' · '}
                            <span className='tabular-nums'>{invites.length}</span>
                            {' pending'}
                          </>
                        ) : null}
                      </>
                    )}
                  </p>
                </div>
                {inviteAction ? (
                  <div className='flex shrink-0 items-center gap-2'>{inviteAction}</div>
                ) : null}
              </header>

              {multiSection ? (
                <Tabs
                  onValueChange={(value) => setSection(value as UsersSection)}
                  value={activeSection}
                >
                  <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <TabsList
                      aria-label='People sections'
                      className='bg-transparent h-auto w-full justify-start gap-1 rounded-none border-b border-border/60 p-0 sm:w-auto'
                    >
                      <TabsTrigger className={sectionTriggerClass} value='members'>
                        Members
                        <span className='text-muted-foreground ml-1.5 tabular-nums text-xs'>
                          {data.members.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger className={sectionTriggerClass} value='invites'>
                        Invitations
                        <span className='text-muted-foreground ml-1.5 tabular-nums text-xs'>
                          {invites.length}
                        </span>
                      </TabsTrigger>
                    </TabsList>
                    {activeSection === 'members' ? (
                      <label className='block w-full sm:max-w-xs'>
                        <span className='sr-only'>Search members</span>
                        <InputGroup>
                          <InputGroupAddon>
                            <SearchIcon aria-hidden='true' />
                          </InputGroupAddon>
                          <InputGroupInput
                            onChange={(event) => setQuery(event.currentTarget.value)}
                            placeholder='Search members'
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
                      members={members}
                      onClearSearch={() => setQuery('')}
                      onError={onError}
                      policy={policy}
                      query={query}
                      roles={data.roles ?? []}
                    />
                  </TabsContent>

                  <TabsContent className='mt-5 outline-none' value='invites'>
                    <InvitationsDirectory
                      actions={actions}
                      canInvite={canInvite}
                      inviteAction={inviteAction}
                      invites={invites}
                      onError={onError}
                      policy={policy}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <div className='flex flex-col gap-4'>
                  <div className='flex justify-end'>
                    <label className='block w-full sm:max-w-xs'>
                      <span className='sr-only'>Search members</span>
                      <InputGroup>
                        <InputGroupAddon>
                          <SearchIcon aria-hidden='true' />
                        </InputGroupAddon>
                        <InputGroupInput
                          onChange={(event) => setQuery(event.currentTarget.value)}
                          placeholder='Search members'
                          type='search'
                          value={query}
                        />
                      </InputGroup>
                    </label>
                  </div>
                  <MembersDirectory
                    actions={actions}
                    members={members}
                    onClearSearch={() => setQuery('')}
                    onError={onError}
                    policy={policy}
                    query={query}
                    roles={data.roles ?? []}
                  />
                </div>
              )}
            </div>
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}

function MembersDirectory({
  members,
  query,
  onClearSearch,
  roles,
  policy,
  actions,
  onError
}: Readonly<{
  members: readonly AppMember[];
  query: string;
  onClearSearch: () => void;
  roles: readonly string[];
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  if (members.length === 0 && query.trim()) {
    return (
      <FeaturePackFilteredEmpty
        clearLabel='Clear search'
        description='Try a different name, email, or role, or clear the search to see every member.'
        onClear={onClearSearch}
        query={query}
        title='No members match'
      />
    );
  }

  if (members.length === 0) {
    return (
      <Empty className='min-h-40 border border-dashed'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <SearchIcon aria-hidden='true' />
          </EmptyMedia>
          <EmptyTitle>No members to show</EmptyTitle>
          <EmptyDescription>People with access to this app will appear here.</EmptyDescription>
        </EmptyHeader>
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
              {member.profile ? (
                <p className='text-muted-foreground mt-0.5 truncate text-xs'>{member.profile}</p>
              ) : null}
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            {canPerform(policy, 'updateRole') && actions?.updateRole && roles.length > 0 ? (
              <MemberRoleSelect
                member={member}
                onError={onError}
                roles={roles}
                updateRole={actions.updateRole}
              />
            ) : (
              <span className='text-muted-foreground text-sm'>{member.role ?? 'Member'}</span>
            )}
            <FeatureStatusBadge status={member.status} />
            <MemberActions
              actions={actions}
              member={member}
              onError={onError}
              policy={policy}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function InvitationsDirectory({
  invites,
  canInvite,
  inviteAction,
  policy,
  actions,
  onError
}: Readonly<{
  invites: readonly AppInvite[];
  canInvite: boolean;
  inviteAction: React.ReactNode;
  policy?: UsersFeaturePackProps['policy'];
  actions?: UsersFeatureActions;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  if (invites.length === 0) {
    return (
      <Empty className='min-h-48 border border-dashed'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <MailPlusIcon aria-hidden='true' />
          </EmptyMedia>
          <EmptyTitle>No pending invitations</EmptyTitle>
          <EmptyDescription>
            Invite a collaborator when they are ready to join this application.
          </EmptyDescription>
        </EmptyHeader>
        {canInvite && inviteAction ? <EmptyContent>{inviteAction}</EmptyContent> : null}
      </Empty>
    );
  }

  return (
    <ul
      aria-label='Application invitations'
      className='border-border/70 divide-border/60 divide-y overflow-hidden rounded-xl border'
    >
      {invites.map((invite) => (
        <li
          className='flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4'
          key={invite.id}
        >
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-medium'>{invite.email}</p>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {invite.role ?? 'Member'}
              {invite.expiresAt ? (
                <>
                  {' · Expires '}
                  <FeaturePackTimestamp value={invite.expiresAt} />
                </>
              ) : null}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            <FeatureStatusBadge status={invite.status} />
            {canPerform(policy, 'extendInvite') &&
            canPerform(invite.actionPolicy, 'extendInvite') &&
            actions?.extendInvite ? (
              <Button
                aria-label={`Extend invitation for ${invite.email}`}
                onClick={() => {
                  void (async () => {
                    try {
                      await actions.extendInvite!({ inviteId: invite.id });
                    } catch (cause) {
                      onError?.(
                        normalizeFeaturePackError(cause, 'The invitation could not be extended.')
                      );
                    }
                  })();
                }}
                size='icon-sm'
                variant='ghost'
              >
                <RefreshCwIcon />
              </Button>
            ) : null}
            {canPerform(policy, 'cancelInvite') &&
            canPerform(invite.actionPolicy, 'cancelInvite') &&
            actions?.cancelInvite ? (
              <CancelAppInviteAction
                cancelInvite={actions.cancelInvite}
                invite={invite}
                onError={onError}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

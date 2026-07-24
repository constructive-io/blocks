'use client';

import * as React from 'react';
import {
  CopyIcon,
  KeyRoundIcon,
  NetworkIcon,
  PlusIcon,
  Trash2Icon,
  UserCogIcon
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';

import {
  canPerform,
  normalizeFeaturePackError
} from '../shared/feature-pack-contracts';
import { FeaturePackTimestamp } from '../shared/feature-pack-ui';
import type {
  OrganizationApiKey,
  OrganizationChartEdge,
  OrganizationMember,
  OrganizationMembershipSettings,
  OrganizationPrincipal,
  OrganizationSummary,
  OrganizationsFeatureActions,
  OrganizationsFeaturePackProps
} from './organizations-contracts';

type OperationPanelProps = Readonly<{
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

function ConfirmAction({
  title,
  description,
  trigger,
  confirmLabel,
  onConfirm,
  onError,
  fallback
}: Readonly<{
  title: string;
  description: string;
  trigger: React.ReactElement;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onError?: OrganizationsFeaturePackProps['onError'];
  fallback: string;
}>) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
      open={open}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() => {
              setPending(true);
              setError(undefined);
              void Promise.resolve()
                .then(onConfirm)
                .then(() => {
                  setOpen(false);
                })
                .catch((cause) => {
                  report(cause, fallback, onError, setError);
                })
                .finally(() => setPending(false));
            }}
            variant='destructive'
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function OrganizationSettingsPanel({
  organization,
  currentMembership,
  settings,
  actions,
  policy,
  onError
}: Omit<OperationPanelProps, 'organizationId'> & Readonly<{
  organization: OrganizationSummary;
  currentMembership?: OrganizationMember;
  settings?: OrganizationMembershipSettings;
}>) {
  const organizationId = organization.id;
  const [name, setName] = React.useState(organization.name);
  const [slug, setSlug] = React.useState(organization.slug ?? '');
  const [pendingGeneral, setPendingGeneral] = React.useState(false);
  const [pendingSetting, setPendingSetting] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [settingError, setSettingError] = React.useState<string>();
  const fieldId = React.useId();
  const canUpdateOrganization = canPerform(policy, 'updateOrganization') &&
    Boolean(actions?.updateOrganization);
  const canUpdateSettings = canPerform(policy, 'updateMembershipSettings') &&
    Boolean(actions?.updateMembershipSettings) && Boolean(settings);

  React.useEffect(() => {
    setName(organization.name);
    setSlug(organization.slug ?? '');
  }, [organization.id, organization.name, organization.slug]);

  const updateSetting = async (
    field: keyof Omit<OrganizationMembershipSettings, 'id'>,
    value: boolean | string
  ) => {
    if (!actions?.updateMembershipSettings || !settings) return;
    setPendingSetting(field);
    setSettingError(undefined);
    try {
      await actions.updateMembershipSettings({
        organizationId,
        settingsId: settings.id,
        patch: { [field]: value }
      });
    } catch (cause) {
      report(cause, 'The membership setting could not be changed.', onError, setSettingError);
    } finally {
      setPendingSetting(undefined);
    }
  };

  const toggles: Array<Readonly<{
    field: keyof Omit<OrganizationMembershipSettings, 'id'>;
    label: string;
    description: string;
    checked: boolean;
  }>> = settings ? [
    {
      field: 'allowExternalMembers',
      label: 'Allow external members',
      description: 'Permits memberships flagged as external for contractor and partner access.',
      checked: settings.allowExternalMembers
    },
    {
      field: 'populateMemberEmail',
      label: 'Populate member email',
      description: 'Copies the account email into the organization member profile when available.',
      checked: settings.populateMemberEmail
    },
    {
      field: 'deleteMemberCascadeChildren',
      label: 'Cascade member removal through reports',
      description: 'Removes subordinate chart relationships when their manager membership is deleted.',
      checked: settings.deleteMemberCascadeChildren
    },
    {
      field: 'createChildCascadeOwners',
      label: 'Cascade owners to child organizations',
      description: 'New child organizations inherit owner memberships from the parent.',
      checked: settings.createChildCascadeOwners
    },
    {
      field: 'createChildCascadeAdmins',
      label: 'Cascade admins to child organizations',
      description: 'New child organizations inherit administrator memberships from the parent.',
      checked: settings.createChildCascadeAdmins
    },
    {
      field: 'createChildCascadeMembers',
      label: 'Cascade members to child organizations',
      description: 'New child organizations inherit ordinary memberships from the parent.',
      checked: settings.createChildCascadeMembers
    }
  ] : [];

  return (
    <div className='flex max-w-3xl flex-col gap-8'>
      <section className='flex flex-col gap-4'>
        <div>
          <h3 className='text-sm font-medium'>General</h3>
          <p className='text-muted-foreground text-pretty text-sm'>
            The organization identity is the tenant boundary used by Constructive memberships.
          </p>
        </div>
        <form
          className='flex flex-col gap-4'
          onSubmit={(event) => {
            event.preventDefault();
            if (!actions?.updateOrganization) return;
            setPendingGeneral(true);
            setError(undefined);
            void Promise.resolve(actions.updateOrganization({
              organizationId,
              name: name.trim(),
              slug: slug.trim() || undefined
            })).catch((cause) => {
              report(cause, 'The organization could not be updated.', onError, setError);
            }).finally(() => setPendingGeneral(false));
          }}
        >
          <FieldGroup>
            <Field error={error} htmlFor={`${fieldId}-name`} label='Organization name' required>
              <Input
                disabled={!canUpdateOrganization}
                id={`${fieldId}-name`}
                onChange={(event) => setName(event.currentTarget.value)}
                required
                value={name}
              />
            </Field>
            <Field htmlFor={`${fieldId}-slug`} label='Slug'>
              <Input
                disabled={!canUpdateOrganization}
                id={`${fieldId}-slug`}
                onChange={(event) => setSlug(event.currentTarget.value)}
                value={slug}
              />
            </Field>
          </FieldGroup>
          {canUpdateOrganization ? (
            <Button className='self-start' disabled={pendingGeneral || !name.trim()} type='submit'>
              {pendingGeneral ? 'Saving…' : 'Save organization'}
            </Button>
          ) : null}
        </form>
      </section>

      {settings ? (
        <section className='flex flex-col gap-4'>
          <div>
            <h3 className='text-sm font-medium'>Membership policy</h3>
            <p className='text-muted-foreground text-pretty text-sm'>
              These controls govern invitations, child organizations, and membership lifecycle defaults.
            </p>
          </div>
          <FieldGroup>
            {toggles.map((setting) => {
              const id = `${fieldId}-${setting.field}`;
              return (
                <Field
                  data-disabled={!canUpdateSettings || Boolean(pendingSetting)}
                  key={setting.field}
                  orientation='horizontal'
                >
                  <div className='min-w-0 flex-1'>
                    <FieldLabel htmlFor={id}>{setting.label}</FieldLabel>
                    <FieldDescription>{setting.description}</FieldDescription>
                  </div>
                  <Switch
                    checked={setting.checked}
                    disabled={!canUpdateSettings || Boolean(pendingSetting)}
                    id={id}
                    onCheckedChange={(checked) => void updateSetting(setting.field, checked)}
                  />
                </Field>
              );
            })}
            <Field orientation='responsive'>
              <div className='min-w-0 flex-1'>
                <FieldLabel htmlFor={`${fieldId}-profile-mode`}>Invite profile assignment</FieldLabel>
                <FieldDescription>
                  Controls whether inviters need assignment permission, a subset of their own access, or both.
                </FieldDescription>
              </div>
              <Select
                disabled={!canUpdateSettings || Boolean(pendingSetting)}
                onValueChange={(value) => void updateSetting(
                  'inviteProfileAssignmentMode',
                  value
                )}
                value={settings.inviteProfileAssignmentMode}
              >
                <SelectTrigger id={`${fieldId}-profile-mode`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value='strict'>Permission and subset</SelectItem>
                    <SelectItem value='permission_only'>Permission only</SelectItem>
                    <SelectItem value='subset_only'>Subset only</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation='responsive'>
              <div className='min-w-0 flex-1'>
                <FieldLabel htmlFor={`${fieldId}-allocation-mode`}>Child limit allocation</FieldLabel>
                <FieldDescription>
                  Pooled children share the parent cap; budgeted children receive explicit allocations.
                </FieldDescription>
              </div>
              <Select
                disabled={!canUpdateSettings || Boolean(pendingSetting)}
                onValueChange={(value) => void updateSetting('limitAllocationMode', value)}
                value={settings.limitAllocationMode}
              >
                <SelectTrigger id={`${fieldId}-allocation-mode`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value='pooled'>Pooled</SelectItem>
                    <SelectItem value='budgeted'>Budgeted</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          {settingError ? (
            <p className='text-destructive text-pretty text-sm' role='alert'>{settingError}</p>
          ) : null}
        </section>
      ) : null}

      <section className='border-destructive/30 flex flex-col gap-4 rounded-xl border p-4'>
        <div>
          <h3 className='text-destructive text-sm font-medium'>Danger zone</h3>
          <p className='text-muted-foreground text-pretty text-sm'>
            Leaving removes only your membership. Deleting removes the organization identity and may cascade tenant data.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {currentMembership && canPerform(policy, 'leaveOrganization') && actions?.leaveOrganization ? (
            <ConfirmAction
              confirmLabel='Leave organization'
              description='Your organization membership and tenant access will be removed. Another owner must remain when other members exist.'
              fallback='The organization could not be left.'
              onConfirm={() => actions.leaveOrganization!({
                organizationId,
                membershipId: currentMembership.id
              })}
              onError={onError}
              title={`Leave ${organization.name}?`}
              trigger={<Button variant='outline'>Leave organization</Button>}
            />
          ) : null}
          {canPerform(policy, 'deleteOrganization') && actions?.deleteOrganization ? (
            <ConfirmAction
              confirmLabel='Delete organization'
              description='This deletes the organization identity. The operation cannot be undone from Console Kit.'
              fallback='The organization could not be deleted.'
              onConfirm={() => actions.deleteOrganization!({ organizationId })}
              onError={onError}
              title={`Delete ${organization.name}?`}
              trigger={<Button variant='destructive'>Delete organization</Button>}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function OrganizationHierarchyPanel({
  organizationId,
  members,
  edges,
  actions,
  policy,
  onError
}: OperationPanelProps & Readonly<{
  members: readonly OrganizationMember[];
  edges: readonly OrganizationChartEdge[];
}>) {
  const [childId, setChildId] = React.useState('');
  const [parentId, setParentId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [level, setLevel] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const memberByActor = new Map(members.map((member) => [member.userId, member]));
  const canSet = canPerform(policy, 'setHierarchyEdge') && Boolean(actions?.setHierarchyEdge);

  return (
    <div className='flex flex-col gap-5'>
      <div>
        <h3 className='text-sm font-medium'>Organization chart</h3>
        <p className='text-muted-foreground text-pretty text-sm'>
          Reporting edges are append-only grants; Console Kit rejects self-links and cycles before submission.
        </p>
      </div>
      {canSet && actions?.setHierarchyEdge ? (
        <form
          className='border-border/70 grid gap-3 rounded-xl border p-4 md:grid-cols-2 xl:grid-cols-5'
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(undefined);
            void Promise.resolve(actions.setHierarchyEdge!({
              organizationId,
              childId,
              parentId,
              positionTitle: title.trim() || undefined,
              positionLevel: level ? Number(level) : undefined
            })).then(() => {
              setChildId('');
              setParentId('');
              setTitle('');
              setLevel('');
            }).catch((cause) => {
              report(cause, 'The reporting edge could not be saved.', onError, setError);
            }).finally(() => setPending(false));
          }}
        >
          <Field label='Member'>
            <Select onValueChange={setChildId} value={childId}>
              <SelectTrigger><SelectValue placeholder='Select member' /></SelectTrigger>
              <SelectContent><SelectGroup>{members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>
              ))}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field label='Reports to'>
            <Select onValueChange={setParentId} value={parentId}>
              <SelectTrigger><SelectValue placeholder='Select manager' /></SelectTrigger>
              <SelectContent><SelectGroup>{members.filter((member) => member.userId !== childId).map((member) => (
                <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>
              ))}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field label='Position title'>
            <Input onChange={(event) => setTitle(event.currentTarget.value)} value={title} />
          </Field>
          <Field label='Level'>
            <Input min={0} onChange={(event) => setLevel(event.currentTarget.value)} type='number' value={level} />
          </Field>
          <div className='flex items-end'>
            <Button className='w-full' disabled={pending || !childId || !parentId} type='submit'>
              {pending ? 'Saving…' : 'Save reporting line'}
            </Button>
          </div>
          {error ? <p className='text-destructive md:col-span-2 xl:col-span-5' role='alert'>{error}</p> : null}
        </form>
      ) : null}
      {edges.length === 0 ? (
        <Empty className='min-h-52 border' role='status'>
          <EmptyHeader>
            <EmptyMedia variant='icon'><NetworkIcon aria-hidden='true' /></EmptyMedia>
            <EmptyTitle>No reporting lines</EmptyTitle>
            <EmptyDescription>Add a manager relationship to begin the organization chart.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Member</TableHead><TableHead>Manager</TableHead>
            <TableHead>Position</TableHead><TableHead className='w-12'><span className='sr-only'>Actions</span></TableHead>
          </TableRow></TableHeader>
          <TableBody>{edges.map((edge) => (
            <TableRow key={edge.id}>
              <TableCell className='font-medium'>{memberByActor.get(edge.childId)?.name ?? edge.childId}</TableCell>
              <TableCell>{memberByActor.get(edge.parentId)?.name ?? edge.parentId}</TableCell>
              <TableCell>{edge.positionTitle ?? (edge.positionLevel === undefined ? '—' : `Level ${edge.positionLevel}`)}</TableCell>
              <TableCell>
                {canPerform(policy, 'removeHierarchyEdge') &&
                edge.actionPolicy?.removeHierarchyEdge &&
                actions?.removeHierarchyEdge ? (
                  <ConfirmAction
                    confirmLabel='Remove reporting line'
                    description='The member remains in the organization; only this reporting relationship is revoked.'
                    fallback='The reporting edge could not be removed.'
                    onConfirm={() => actions.removeHierarchyEdge!({ organizationId, edge })}
                    onError={onError}
                    title='Remove reporting line?'
                    trigger={<Button size='icon-sm' variant='ghost'><Trash2Icon aria-hidden='true' /><span className='sr-only'>Remove reporting line</span></Button>}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </div>
  );
}

function CreatePrincipalDialog({
  organizationId,
  action,
  onError
}: Readonly<{
  organizationId: string;
  action: NonNullable<OrganizationsFeatureActions['createOrganizationPrincipal']>;
  onError?: OrganizationsFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [useAdminOwner, setUseAdminOwner] = React.useState(false);
  const [isReadOnly, setIsReadOnly] = React.useState(true);
  const [bypassStepUp, setBypassStepUp] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();
  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (pending) return;
        if (nextOpen) {
          setUseAdminOwner(false);
          setIsReadOnly(true);
          setBypassStepUp(false);
          setError(undefined);
        }
        setOpen(nextOpen);
      }}
      open={open}
    >
      <DialogTrigger render={<Button size='sm' variant='outline' />}>
        <PlusIcon data-icon='inline-start' />New principal
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setError(undefined);
          void action({
            organizationId,
            name: name.trim(),
            useAdminOwner,
            isReadOnly,
            bypassStepUp
          }).then(() => {
            setOpen(false);
            setName('');
          }).catch((cause) => {
            report(cause, 'The organization principal could not be created.', onError, setError);
          }).finally(() => setPending(false));
        }}>
          <DialogHeader>
            <DialogTitle>Create an organization principal</DialogTitle>
            <DialogDescription>
              Principals scope machine access to this organization and can own separately revocable API keys.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FieldGroup>
              <Field error={error} htmlFor={`${fieldId}-name`} label='Name' required>
                <Input id={`${fieldId}-name`} onChange={(event) => setName(event.currentTarget.value)} required value={name} />
              </Field>
              {[
                ['use-admin-owner', 'Use administrator/owner access', useAdminOwner, setUseAdminOwner],
                ['read-only', 'Restrict to read-only access', isReadOnly, setIsReadOnly],
                ['bypass-step-up', 'Allow this principal to bypass user step-up', bypassStepUp, setBypassStepUp]
              ].map(([id, label, checked, setter]) => (
                <Field key={String(id)} orientation='horizontal'>
                  <FieldLabel htmlFor={`${fieldId}-${id}`}>{String(label)}</FieldLabel>
                  <Switch
                    checked={checked as boolean}
                    id={`${fieldId}-${id}`}
                    onCheckedChange={setter as (checked: boolean) => void}
                  />
                </Field>
              ))}
            </FieldGroup>
          </DialogPanel>
          <DialogFooter><Button disabled={pending || !name.trim()} type='submit'>{pending ? 'Creating…' : 'Create principal'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateApiKeyDialog({
  organizationId,
  principals,
  action,
  onError
}: Readonly<{
  organizationId: string;
  principals: readonly OrganizationPrincipal[];
  action: NonNullable<OrganizationsFeatureActions['createOrganizationApiKey']>;
  onError?: OrganizationsFeaturePackProps['onError'];
}>) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [principalId, setPrincipalId] = React.useState(principals[0]?.id ?? '');
  const [accessLevel, setAccessLevel] = React.useState<'full_access' | 'read_only'>('read_only');
  const [mfaLevel, setMfaLevel] = React.useState<'none' | 'verified'>('verified');
  const [expiresIn, setExpiresIn] = React.useState('30 days');
  const [created, setCreated] = React.useState<Readonly<{ token: string; id?: string; expiresAt?: string }>>();
  const [copied, setCopied] = React.useState(false);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();

  React.useEffect(() => {
    if (!principals.some((principal) => principal.id === principalId)) {
      setPrincipalId(principals[0]?.id ?? '');
    }
  }, [principalId, principals]);

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (pending) return;
        if (created && !nextOpen) return;
        if (nextOpen) {
          setName('');
          setAccessLevel('read_only');
          setMfaLevel('verified');
          setExpiresIn('30 days');
          setError(undefined);
        }
        setOpen(nextOpen);
        if (!nextOpen) {
          setCreated(undefined);
          setCopied(false);
          setAcknowledged(false);
          setError(undefined);
        }
      }}
      open={open}
    >
      <DialogTrigger render={<Button size='sm' />}>
        <KeyRoundIcon data-icon='inline-start' />Create API key
      </DialogTrigger>
      <DialogContent showCloseButton={!created}>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy the API key now</DialogTitle>
              <DialogDescription>
                Console Kit cannot retrieve this token again. Closing is disabled until you confirm that it is stored safely.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <Field htmlFor={`${fieldId}-created-key`} label='API key'>
                <div className='flex gap-2'>
                  <Input id={`${fieldId}-created-key`} readOnly value={created.token} />
                  <Button
                    onClick={() => {
                      if (!navigator.clipboard) {
                        setError('Clipboard access is unavailable. Copy the key manually, then confirm storage.');
                        return;
                      }
                      void navigator.clipboard.writeText(created.token).then(() => {
                        setCopied(true);
                        setError(undefined);
                      }).catch(() => {
                        setError('The key could not be copied. Copy it manually, then confirm storage.');
                      });
                    }}
                    type='button'
                    variant='outline'
                  >
                    <CopyIcon data-icon='inline-start' />{copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </Field>
              {created.expiresAt ? <p className='text-muted-foreground text-sm'>Expires <FeaturePackTimestamp value={created.expiresAt} /></p> : null}
              <Field orientation='horizontal'>
                <Checkbox
                  checked={acknowledged}
                  id={`${fieldId}-stored`}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                />
                <div className='min-w-0 flex-1'>
                  <FieldLabel htmlFor={`${fieldId}-stored`}>I stored this API key securely</FieldLabel>
                  <FieldDescription>
                    {copied ? 'The key was copied from Console Kit.' : 'Confirm only after copying the key manually.'}
                  </FieldDescription>
                </div>
              </Field>
              {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
            </DialogPanel>
            <DialogFooter>
              <Button
                disabled={!acknowledged}
                onClick={() => {
                  setCreated(undefined);
                  setCopied(false);
                  setAcknowledged(false);
                  setError(undefined);
                  setOpen(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(undefined);
            void action({
              organizationId,
              principalId,
              name: name.trim(),
              accessLevel,
              mfaLevel,
              expiresIn: expiresIn.trim() || undefined
            }).then((result) => {
              setCreated(result);
              setCopied(false);
              setAcknowledged(false);
            }).catch((cause) => {
              report(cause, 'The organization API key could not be created.', onError, setError);
            }).finally(() => setPending(false));
          }}>
            <DialogHeader>
              <DialogTitle>Create an organization API key</DialogTitle>
              <DialogDescription>
                The key inherits the selected principal and can be revoked independently.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <FieldGroup>
                <Field error={error} htmlFor={`${fieldId}-key-name`} label='Key name' required>
                  <Input id={`${fieldId}-key-name`} onChange={(event) => setName(event.currentTarget.value)} required value={name} />
                </Field>
                <Field htmlFor={`${fieldId}-principal`} label='Principal'>
                  <Select onValueChange={setPrincipalId} value={principalId}>
                    <SelectTrigger id={`${fieldId}-principal`}><SelectValue placeholder='Select principal' /></SelectTrigger>
                    <SelectContent><SelectGroup>{principals.map((principal) => (
                      <SelectItem key={principal.id} value={principal.id}>{principal.name}</SelectItem>
                    ))}</SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field htmlFor={`${fieldId}-access-level`} label='Access level'>
                  <Select onValueChange={(value) => setAccessLevel(value as typeof accessLevel)} value={accessLevel}>
                    <SelectTrigger id={`${fieldId}-access-level`}>
                      <SelectValue>
                        {(value: string | null) => value === 'full_access' ? 'Full access' : 'Read only'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem value='full_access'>Full access</SelectItem>
                      <SelectItem value='read_only'>Read only</SelectItem>
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field htmlFor={`${fieldId}-mfa-level`} label='MFA requirement'>
                  <Select onValueChange={(value) => setMfaLevel(value as typeof mfaLevel)} value={mfaLevel}>
                    <SelectTrigger id={`${fieldId}-mfa-level`}>
                      <SelectValue>
                        {(value: string | null) => value === 'verified' ? 'Verified' : 'None'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem value='none'>None</SelectItem>
                      <SelectItem value='verified'>Verified</SelectItem>
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field htmlFor={`${fieldId}-expires`} label='Expires in'>
                  <Input id={`${fieldId}-expires`} onChange={(event) => setExpiresIn(event.currentTarget.value)} placeholder='30 days' value={expiresIn} />
                </Field>
              </FieldGroup>
            </DialogPanel>
            <DialogFooter><Button disabled={pending || !name.trim() || !principalId} type='submit'>{pending ? 'Creating…' : 'Create API key'}</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OrganizationPrincipalsPanel({
  organizationId,
  principals,
  actions,
  policy,
  onError
}: OperationPanelProps & Readonly<{ principals: readonly OrganizationPrincipal[] }>) {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h3 className='text-sm font-medium'>Machine principals</h3>
          <p className='text-muted-foreground text-pretty text-sm'>Create one principal per integration so access and keys can be revoked independently.</p>
        </div>
        {canPerform(policy, 'createOrganizationPrincipal') && actions?.createOrganizationPrincipal ? (
          <CreatePrincipalDialog action={actions.createOrganizationPrincipal} onError={onError} organizationId={organizationId} />
        ) : null}
      </div>
      {principals.length === 0 ? (
        <Empty className='min-h-52 border' role='status'>
          <EmptyHeader><EmptyMedia variant='icon'><UserCogIcon aria-hidden='true' /></EmptyMedia><EmptyTitle>No machine principals</EmptyTitle><EmptyDescription>Create a principal before issuing an organization API key.</EmptyDescription></EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Access</TableHead><TableHead>Step-up</TableHead><TableHead className='w-12'><span className='sr-only'>Actions</span></TableHead></TableRow></TableHeader>
          <TableBody>{principals.map((principal) => (
            <TableRow key={principal.id}>
              <TableCell className='font-medium'>{principal.name}</TableCell>
              <TableCell><Badge variant='secondary'>{principal.type ?? 'Custom'}</Badge></TableCell>
              <TableCell>{principal.bypassStepUp ? 'Bypassed' : 'Required'}</TableCell>
              <TableCell>{canPerform(policy, 'revokeOrganizationPrincipal') && principal.actionPolicy?.revokeOrganizationPrincipal && actions?.revokeOrganizationPrincipal ? (
                <ConfirmAction
                  confirmLabel='Revoke principal'
                  description='The principal and every key attached to it will stop authenticating.'
                  fallback='The organization principal could not be revoked.'
                  onConfirm={() => actions.revokeOrganizationPrincipal!({ organizationId, principalId: principal.id })}
                  onError={onError}
                  title={`Revoke ${principal.name}?`}
                  trigger={<Button size='icon-sm' variant='ghost'><Trash2Icon aria-hidden='true' /><span className='sr-only'>Revoke {principal.name}</span></Button>}
                />
              ) : null}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </div>
  );
}

export function OrganizationApiKeysPanel({
  organizationId,
  principals,
  apiKeys,
  actions,
  policy,
  onError
}: OperationPanelProps & Readonly<{
  principals: readonly OrganizationPrincipal[];
  apiKeys: readonly OrganizationApiKey[];
}>) {
  const principalNames = new Map(principals.map((principal) => [principal.id, principal.name]));
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div><h3 className='text-sm font-medium'>Organization API keys</h3><p className='text-muted-foreground text-pretty text-sm'>Keys are shown once at creation and remain independently revocable.</p></div>
        {canPerform(policy, 'createOrganizationApiKey') && actions?.createOrganizationApiKey && principals.length > 0 ? (
          <CreateApiKeyDialog action={actions.createOrganizationApiKey} onError={onError} organizationId={organizationId} principals={principals} />
        ) : null}
      </div>
      {apiKeys.length === 0 ? (
        <Empty className='min-h-52 border' role='status'>
          <EmptyHeader><EmptyMedia variant='icon'><KeyRoundIcon aria-hidden='true' /></EmptyMedia><EmptyTitle>No active API keys</EmptyTitle><EmptyDescription>{principals.length > 0 ? 'Create a key for one of this organization’s principals.' : 'Create a machine principal before issuing a key.'}</EmptyDescription></EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Principal</TableHead><TableHead>Last used</TableHead><TableHead>Expires</TableHead><TableHead className='w-12'><span className='sr-only'>Actions</span></TableHead></TableRow></TableHeader>
          <TableBody>{apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              <TableCell className='font-medium'>{apiKey.name ?? 'Unnamed key'}</TableCell>
              <TableCell>{principalNames.get(apiKey.principalId) ?? apiKey.principalId}</TableCell>
              <TableCell><FeaturePackTimestamp value={apiKey.lastUsedAt} /></TableCell>
              <TableCell><FeaturePackTimestamp value={apiKey.expiresAt} /></TableCell>
              <TableCell>{canPerform(policy, 'revokeOrganizationApiKey') && apiKey.actionPolicy?.revokeOrganizationApiKey && actions?.revokeOrganizationApiKey ? (
                <ConfirmAction
                  confirmLabel='Revoke API key'
                  description='Requests using this key will stop authenticating immediately.'
                  fallback='The organization API key could not be revoked.'
                  onConfirm={() => actions.revokeOrganizationApiKey!({ organizationId, apiKeyId: apiKey.id })}
                  onError={onError}
                  title={`Revoke ${apiKey.name ?? 'this API key'}?`}
                  trigger={<Button size='icon-sm' variant='ghost'><Trash2Icon aria-hidden='true' /><span className='sr-only'>Revoke {apiKey.name ?? 'API key'}</span></Button>}
                />
              ) : null}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </div>
  );
}

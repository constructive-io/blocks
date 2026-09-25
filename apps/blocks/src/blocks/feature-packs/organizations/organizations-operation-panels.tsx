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
import { Switch } from '@constructive-io/ui/switch';
import { OrgChart } from '@/components/ui/org-chart/org-chart';
import type { OrgChartEdge } from '@/components/ui/org-chart/org-chart.types';
import { ToneBadge } from '@/components/ui/workspace-kit/primitives';
import { SectionHeading, TableSurface, tableHeadClass, tableRowClass } from '@/components/ui/workspace-kit/surface';

import {
  canPerform,
  normalizeFeaturePackError
} from '../shared/feature-pack-contracts';
import { FeaturePackEmpty, FeaturePackOptionList, FeaturePackTimestamp } from '../shared/feature-pack-ui';
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

const PROFILE_MODE_LABELS: Readonly<Record<string, string>> = {
  strict: 'Capability and subset',
  capability_only: 'Capability only',
  subset_only: 'Subset only'
};

const ALLOCATION_MODE_LABELS: Readonly<Record<string, string>> = {
  pooled: 'Pooled',
  budgeted: 'Budgeted'
};

const REVOKE_BUTTON = 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 cursor-pointer place-items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

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
  fallback,
  open: controlledOpen,
  onOpenChange
}: Readonly<{
  title: string;
  description: string;
  /** Opens the confirmation; omit it and pass `open` to open it from elsewhere. */
  trigger?: React.ReactElement;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onError?: OrganizationsFeaturePackProps['onError'];
  fallback: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
      open={open}
    >
      {trigger ? <AlertDialogTrigger render={trigger} /> : null}
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
    canPerform(organization.actionPolicy, 'updateOrganization') &&
    Boolean(actions?.updateOrganization);
  const canLeaveOrganization = canPerform(policy, 'leaveOrganization') &&
    canPerform(organization.actionPolicy, 'leaveOrganization') &&
    Boolean(currentMembership) &&
    Boolean(actions?.leaveOrganization);
  const canDeleteOrganization = canPerform(policy, 'deleteOrganization') &&
    canPerform(organization.actionPolicy, 'deleteOrganization') &&
    Boolean(actions?.deleteOrganization);
  const canUpdateSettings = canPerform(policy, 'updateMembershipSettings') &&
    Boolean(actions?.updateMembershipSettings) && Boolean(settings);

  // Reload the identity fields when the saved organization changes (adjusted during render, not in an effect).
  const savedIdentity = `${organization.id}\u0000${organization.name}\u0000${organization.slug ?? ''}`;
  const [loadedIdentity, setLoadedIdentity] = React.useState(savedIdentity);
  if (savedIdentity !== loadedIdentity) {
    setLoadedIdentity(savedIdentity);
    setName(organization.name);
    setSlug(organization.slug ?? '');
  }

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
    <div className='flex max-w-3xl flex-col gap-6'>
      <section className='flex flex-col gap-3'>
        <SectionHeading
          description='The organization identity is the tenant boundary used by Constructive memberships.'
          title='General'
        />
        <form
          className='flex flex-col gap-4 rounded-xl bg-card p-4 shadow-card'
          onSubmit={(event) => {
            event.preventDefault();
            if (!canUpdateOrganization || !actions?.updateOrganization) return;
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
                autoComplete='organization'
                disabled={!canUpdateOrganization}
                id={`${fieldId}-name`}
                name='organization-name'
                onChange={(event) => setName(event.currentTarget.value)}
                required
                value={name}
              />
            </Field>
            <Field htmlFor={`${fieldId}-slug`} label='Slug'>
              <Input
                autoCapitalize='none'
                autoComplete='off'
                disabled={!canUpdateOrganization}
                id={`${fieldId}-slug`}
                name='organization-slug'
                onChange={(event) => setSlug(event.currentTarget.value)}
                spellCheck={false}
                value={slug}
              />
            </Field>
          </FieldGroup>
          {canUpdateOrganization ? (
            <Button className='self-start' disabled={pendingGeneral || !name.trim()} size='sm' type='submit'>
              {pendingGeneral ? 'Saving…' : 'Save organization'}
            </Button>
          ) : null}
        </form>
      </section>

      {settings ? (
        <section className='flex flex-col gap-3'>
          <SectionHeading
            description='These controls govern invitations, child organizations, and membership lifecycle defaults.'
            title='Membership policy'
          />
          <FeaturePackOptionList className='@container/field-group'>
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
                  Controls whether inviters need assignment capability, a subset of their own access, or both.
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
                <SelectTrigger className='sm:w-52' id={`${fieldId}-profile-mode`}>
                  <SelectValue>{(value: string | null) => PROFILE_MODE_LABELS[value ?? ''] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value='strict'>Capability and subset</SelectItem>
                    <SelectItem value='capability_only'>Capability only</SelectItem>
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
                <SelectTrigger className='sm:w-52' id={`${fieldId}-allocation-mode`}>
                  <SelectValue>{(value: string | null) => ALLOCATION_MODE_LABELS[value ?? ''] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value='pooled'>Pooled</SelectItem>
                    <SelectItem value='budgeted'>Budgeted</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FeaturePackOptionList>
          {settingError ? (
            <p className='text-destructive text-pretty text-sm' role='alert'>{settingError}</p>
          ) : null}
        </section>
      ) : null}

      <section className='border-destructive/25 bg-destructive/[0.03] flex flex-col gap-3 rounded-xl border p-4'>
        <div>
          <h3 className='text-destructive text-sm font-medium'>Danger zone</h3>
          <p className='text-muted-foreground mt-0.5 text-pretty text-[13px]'>
            Leaving removes only your membership. Deleting removes the organization identity and may cascade tenant data.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {canLeaveOrganization && currentMembership && actions?.leaveOrganization ? (
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
              trigger={<Button size='sm' variant='outline'>Leave organization</Button>}
            />
          ) : null}
          {canDeleteOrganization && actions?.deleteOrganization ? (
            <ConfirmAction
              confirmLabel='Delete organization'
              description='This deletes the organization identity. The operation cannot be undone from Console Kit.'
              fallback='The organization could not be deleted.'
              onConfirm={() => actions.deleteOrganization!({ organizationId })}
              onError={onError}
              title={`Delete ${organization.name}?`}
              trigger={<Button size='sm' variant='destructive'>Delete organization</Button>}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

type ReportingLineDraft = Readonly<{
  mode: 'add' | 'edit';
  childId: string;
  parentId: string;
  title: string;
  level: string;
}>;

function ReportingLineDialog({
  draft,
  members,
  onClose,
  onSubmit
}: Readonly<{
  draft: ReportingLineDraft | null;
  members: readonly OrganizationMember[];
  onClose: () => void;
  onSubmit: (input: { childId: string; parentId: string; title: string; level: string }) => Promise<string | undefined>;
}>) {
  const [childId, setChildId] = React.useState('');
  const [parentId, setParentId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [level, setLevel] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();
  // Load the draft each time the dialog opens (adjusted during render, not in an effect).
  const [loaded, setLoaded] = React.useState<ReportingLineDraft | null>(null);
  if (draft && draft !== loaded) {
    setLoaded(draft);
    setChildId(draft.childId);
    setParentId(draft.parentId);
    setTitle(draft.title);
    setLevel(draft.level);
    setError(undefined);
  }
  const editing = draft?.mode === 'edit';
  const nameOf = (userId: string) => members.find((member) => member.userId === userId)?.name ?? userId;

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onClose();
      }}
      open={Boolean(draft)}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(undefined);
            void onSubmit({ childId, parentId, title, level })
              .then((message) => {
                if (message) setError(message);
                else onClose();
              })
              .finally(() => setPending(false));
          }}
        >
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${nameOf(childId)}’s position` : 'Add a reporting line'}</DialogTitle>
            <DialogDescription>
              Reporting edges are append-only grants; Console Kit rejects self-links and cycles before submission.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FieldGroup>
              {editing ? null : (
                <Field htmlFor={`${fieldId}-member`} label='Member'>
                  <Select name='hierarchy-member' onValueChange={(value) => setChildId(value ?? '')} value={childId}>
                    <SelectTrigger id={`${fieldId}-member`}><SelectValue placeholder='Select member' /></SelectTrigger>
                    <SelectContent><SelectGroup>{members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>
                    ))}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              )}
              <Field htmlFor={`${fieldId}-manager`} label='Reports to'>
                <Select name='hierarchy-manager' onValueChange={(value) => setParentId(value ?? '')} value={parentId}>
                  <SelectTrigger id={`${fieldId}-manager`}><SelectValue placeholder='Select manager' /></SelectTrigger>
                  <SelectContent><SelectGroup>{members.filter((member) => member.userId !== childId).map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>
                  ))}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <div className='grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]'>
                <Field htmlFor={`${fieldId}-title`} label='Position title'>
                  <Input autoComplete='organization-title' id={`${fieldId}-title`} name='position-title' onChange={(event) => setTitle(event.currentTarget.value)} value={title} />
                </Field>
                <Field htmlFor={`${fieldId}-level`} label='Level'>
                  <Input id={`${fieldId}-level`} inputMode='numeric' min={0} name='position-level' onChange={(event) => setLevel(event.currentTarget.value)} type='number' value={level} />
                </Field>
              </div>
              {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
            </FieldGroup>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !childId || !parentId || childId === parentId} type='submit'>
              {pending ? 'Saving…' : 'Save reporting line'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The organization's reporting lines on the Org Chart canvas: drag a card onto
 * a new manager (or use "Change manager…") to move someone, edit a position,
 * or remove a reporting line. Every change goes through the host actions, and
 * the chart redraws from the next resource.
 */
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
  const [draft, setDraft] = React.useState<ReportingLineDraft | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<OrganizationChartEdge | null>(null);
  const [error, setError] = React.useState<string>();
  const setHierarchyEdge = canPerform(policy, 'setHierarchyEdge') ? actions?.setHierarchyEdge : undefined;
  const removeHierarchyEdge = canPerform(policy, 'removeHierarchyEdge') ? actions?.removeHierarchyEdge : undefined;

  // One reporting line per person; a later edge for the same person wins.
  const edgeByChild = React.useMemo(() => new Map(edges.map((edge) => [edge.childId, edge])), [edges]);
  const chartEdges = React.useMemo<OrgChartEdge[]>(() => {
    const memberByActor = new Map(members.map((member) => [member.userId, member]));
    const people = new Set<string>();
    for (const edge of edgeByChild.values()) {
      people.add(edge.childId);
      people.add(edge.parentId);
    }
    return [...people].map((id) => {
      const edge = edgeByChild.get(id);
      const member = memberByActor.get(id);
      return {
        id,
        parentId: edge?.parentId ?? null,
        displayName: member?.name ?? id,
        avatarUrl: member?.avatarUrl ?? null,
        positionTitle: edge?.positionTitle ?? member?.memberProfile?.title ?? null
      };
    });
  }, [edgeByChild, members]);

  const save = async (input: { childId: string; parentId: string; positionTitle?: string; positionLevel?: number }) => {
    if (!setHierarchyEdge) return 'This session cannot change reporting lines.';
    try {
      await setHierarchyEdge({ organizationId, ...input });
      return undefined;
    } catch (cause) {
      const normalized = normalizeFeaturePackError(cause, 'The reporting edge could not be saved.');
      onError?.(normalized);
      return normalized.message;
    }
  };

  return (
    <div className='flex flex-col gap-3'>
      <SectionHeading
        actions={setHierarchyEdge ? (
          <Button onClick={() => setDraft({ mode: 'add', childId: '', parentId: '', title: '', level: '' })} size='sm' variant='outline'>
            <PlusIcon data-icon='inline-start' />
            Add reporting line
          </Button>
        ) : null}
        description={setHierarchyEdge
          ? 'Drag a card onto someone to change who they report to, or open a person for their details.'
          : 'Who reports to whom in this organization.'}
        title='Organization chart'
      />
      {error ? <p className='text-destructive text-pretty text-sm' role='alert'>{error}</p> : null}
      {edges.length === 0 ? (
        <FeaturePackEmpty
          action={setHierarchyEdge ? (
            <Button onClick={() => setDraft({ mode: 'add', childId: '', parentId: '', title: '', level: '' })} size='sm'>
              Add reporting line
            </Button>
          ) : undefined}
          description={setHierarchyEdge
            ? 'Add a manager relationship to begin the organization chart.'
            : 'No reporting lines are visible, and this session cannot add one.'}
          icon={NetworkIcon}
          title='No reporting lines'
        />
      ) : (
        <OrgChart
          className='h-[34rem]'
          editable={Boolean(setHierarchyEdge)}
          edges={chartEdges}
          onEditNode={setHierarchyEdge ? (node) => {
            const edge = edgeByChild.get(node.id);
            setDraft({
              mode: 'edit',
              childId: node.id,
              parentId: edge?.parentId ?? '',
              title: edge?.positionTitle ?? '',
              level: edge?.positionLevel === undefined ? '' : String(edge.positionLevel)
            });
          } : undefined}
          onRemoveNode={removeHierarchyEdge ? (node) => {
            const edge = edgeByChild.get(node.id);
            if (edge?.actionPolicy?.removeHierarchyEdge) {
              setError(undefined);
              setRemoveTarget(edge);
            } else {
              setError(edge
                ? `You cannot remove ${node.displayName ?? 'this person'}’s reporting line.`
                : `${node.displayName ?? 'This person'} is at the top of the chart and has no reporting line to remove.`);
            }
          } : undefined}
          onReparent={async (childId, parentId, preserve) => {
            setError(undefined);
            const message = await save({
              childId,
              parentId,
              positionTitle: preserve.positionTitle ?? undefined,
              positionLevel: edgeByChild.get(childId)?.positionLevel
            });
            if (message) setError(message);
          }}
        />
      )}
      <ReportingLineDialog
        draft={draft}
        members={members}
        onClose={() => setDraft(null)}
        onSubmit={({ childId, parentId, title, level }) => save({
          childId,
          parentId,
          positionTitle: title.trim() || undefined,
          positionLevel: level ? Number(level) : undefined
        })}
      />
      {removeHierarchyEdge ? (
        <ConfirmAction
          confirmLabel='Remove reporting line'
          description='The member remains in the organization; only this reporting relationship is revoked.'
          fallback='The reporting edge could not be removed.'
          onConfirm={() => removeTarget ? removeHierarchyEdge({ organizationId, edge: removeTarget }) : undefined}
          onError={onError}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
          open={Boolean(removeTarget)}
          title='Remove reporting line?'
        />
      ) : null}
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
                <Input autoComplete='off' id={`${fieldId}-name`} name='principal-name' onChange={(event) => setName(event.currentTarget.value)} required value={name} />
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

  // A principal that disappears falls back to the first one still listed.
  const selectedPrincipalId = principals.some((principal) => principal.id === principalId)
    ? principalId
    : principals[0]?.id ?? '';

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
                  <Input autoComplete='off' id={`${fieldId}-created-key`} name='created-api-key' readOnly spellCheck={false} translate='no' value={created.token} />
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
              principalId: selectedPrincipalId,
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
                  <Input autoComplete='off' id={`${fieldId}-key-name`} name='api-key-name' onChange={(event) => setName(event.currentTarget.value)} required value={name} />
                </Field>
                <Field htmlFor={`${fieldId}-principal`} label='Principal'>
                  <Select name='api-key-principal' onValueChange={(value) => setPrincipalId(value ?? '')} value={selectedPrincipalId}>
                    <SelectTrigger id={`${fieldId}-principal`}><SelectValue placeholder='Select principal' /></SelectTrigger>
                    <SelectContent><SelectGroup>{principals.map((principal) => (
                      <SelectItem key={principal.id} value={principal.id}>{principal.name}</SelectItem>
                    ))}</SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field htmlFor={`${fieldId}-access-level`} label='Access level'>
                  <Select name='api-key-access-level' onValueChange={(value) => setAccessLevel(value as typeof accessLevel)} value={accessLevel}>
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
                  <Select name='api-key-mfa-level' onValueChange={(value) => setMfaLevel(value as typeof mfaLevel)} value={mfaLevel}>
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
                  <Input autoComplete='off' id={`${fieldId}-expires`} name='api-key-expires-in' onChange={(event) => setExpiresIn(event.currentTarget.value)} placeholder='30 days' value={expiresIn} />
                </Field>
              </FieldGroup>
            </DialogPanel>
            <DialogFooter><Button disabled={pending || !name.trim() || !selectedPrincipalId} type='submit'>{pending ? 'Creating…' : 'Create API key'}</Button></DialogFooter>
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
  const canCreatePrincipal = canPerform(policy, 'createOrganizationPrincipal') &&
    Boolean(actions?.createOrganizationPrincipal);

  return (
    <div className='flex flex-col gap-3'>
      <SectionHeading
        actions={canCreatePrincipal && actions?.createOrganizationPrincipal ? (
          <CreatePrincipalDialog action={actions.createOrganizationPrincipal} onError={onError} organizationId={organizationId} />
        ) : null}
        description='Create one principal per integration so access and keys can be revoked independently.'
        title='Machine principals'
      />
      {principals.length === 0 ? (
        <FeaturePackEmpty
          description={canCreatePrincipal ? 'Create a principal before issuing an organization API key.' : 'No machine principals are visible, and this session cannot create one.'}
          icon={UserCogIcon}
          title='No machine principals'
        />
      ) : (
        <TableSurface className='@container/table' minWidth='0'>
          <caption className='sr-only'>Machine principals</caption>
          <thead className={tableHeadClass}>
            <tr>
              <th scope='col'>Name</th>
              <th className='w-32' scope='col'>Access</th>
              <th className='hidden w-28 @md/table:table-cell' scope='col'>Step-up</th>
              <th className='w-12' scope='col'><span className='sr-only'>Actions</span></th>
            </tr>
          </thead>
          <tbody>{principals.map((principal) => (
            <tr className={tableRowClass} key={principal.id}>
              <td className='max-w-0'>
                <span className='flex min-w-0 items-center gap-2'>
                  <span className='truncate font-medium' title={principal.name}>{principal.name}</span>
                  {principal.isReadOnly ? <ToneBadge tone='neutral'>Read only</ToneBadge> : null}
                </span>
              </td>
              <td><ToneBadge className='max-w-full' tone={principal.useAdminOwner ? 'warning' : 'neutral'}><span className='truncate'>{principal.type ?? 'Custom'}</span></ToneBadge></td>
              <td className='text-muted-foreground hidden @md/table:table-cell'>{principal.bypassStepUp ? 'Bypassed' : 'Required'}</td>
              <td className='text-right'>{canPerform(policy, 'revokeOrganizationPrincipal') && principal.actionPolicy?.revokeOrganizationPrincipal && actions?.revokeOrganizationPrincipal ? (
                <ConfirmAction
                  confirmLabel='Revoke principal'
                  description='The principal and every key attached to it will stop authenticating.'
                  fallback='The organization principal could not be revoked.'
                  onConfirm={() => actions.revokeOrganizationPrincipal!({ organizationId, principalId: principal.id })}
                  onError={onError}
                  title={`Revoke ${principal.name}?`}
                  trigger={<button aria-label={`Revoke ${principal.name}`} className={REVOKE_BUTTON} type='button'><Trash2Icon aria-hidden='true' className='size-3.5' /></button>}
                />
              ) : null}</td>
            </tr>
          ))}</tbody>
        </TableSurface>
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
  const canCreateKey = canPerform(policy, 'createOrganizationApiKey') &&
    Boolean(actions?.createOrganizationApiKey) &&
    principals.length > 0;
  return (
    <div className='flex flex-col gap-3'>
      <SectionHeading
        actions={canCreateKey && actions?.createOrganizationApiKey ? (
          <CreateApiKeyDialog action={actions.createOrganizationApiKey} onError={onError} organizationId={organizationId} principals={principals} />
        ) : null}
        description='Keys are shown once at creation and remain independently revocable.'
        title='Organization API keys'
      />
      {apiKeys.length === 0 ? (
        <FeaturePackEmpty
          description={canCreateKey ? 'Create a key for one of this organization’s principals.' : principals.length === 0 ? 'Create a machine principal before issuing a key.' : 'No API keys are visible, and this session cannot create one.'}
          icon={KeyRoundIcon}
          title='No active API keys'
        />
      ) : (
        <TableSurface className='@container/table' minWidth='0'>
          <caption className='sr-only'>Organization API keys</caption>
          <thead className={tableHeadClass}>
            <tr>
              <th scope='col'>Name</th>
              <th className='hidden @lg/table:table-cell' scope='col'>Principal</th>
              <th className='hidden w-40 @2xl/table:table-cell' scope='col'>Last used</th>
              <th className='w-40' scope='col'>Expires</th>
              <th className='w-12' scope='col'><span className='sr-only'>Actions</span></th>
            </tr>
          </thead>
          <tbody>{apiKeys.map((apiKey) => (
            <tr className={tableRowClass} key={apiKey.id}>
              <td className='max-w-0'>
                <span className='flex min-w-0 items-center gap-2'>
                  <KeyRoundIcon aria-hidden='true' className='text-muted-foreground size-3.5 shrink-0' />
                  <span className='truncate font-medium' title={apiKey.name ?? 'Unnamed key'}>{apiKey.name ?? 'Unnamed key'}</span>
                </span>
              </td>
              <td className='text-muted-foreground hidden truncate @lg/table:table-cell'>
                {principalNames.get(apiKey.principalId) ?? (
                  <span className='font-mono text-xs' translate='no'>{apiKey.principalId}</span>
                )}
              </td>
              <td className='text-muted-foreground hidden @2xl/table:table-cell'><FeaturePackTimestamp value={apiKey.lastUsedAt} /></td>
              <td className='text-muted-foreground'><FeaturePackTimestamp value={apiKey.expiresAt} /></td>
              <td className='text-right'>{canPerform(policy, 'revokeOrganizationApiKey') && apiKey.actionPolicy?.revokeOrganizationApiKey && actions?.revokeOrganizationApiKey ? (
                <ConfirmAction
                  confirmLabel='Revoke API key'
                  description='Requests using this key will stop authenticating immediately.'
                  fallback='The organization API key could not be revoked.'
                  onConfirm={() => actions.revokeOrganizationApiKey!({ organizationId, apiKeyId: apiKey.id })}
                  onError={onError}
                  title={`Revoke ${apiKey.name ?? 'this API key'}?`}
                  trigger={<button aria-label={`Revoke ${apiKey.name ?? 'API key'}`} className={REVOKE_BUTTON} type='button'><Trash2Icon aria-hidden='true' className='size-3.5' /></button>}
                />
              ) : null}</td>
            </tr>
          ))}</tbody>
        </TableSurface>
      )}
    </div>
  );
}

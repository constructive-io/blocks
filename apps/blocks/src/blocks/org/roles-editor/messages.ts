/**
 * org-roles-editor — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localises any code by overriding a single key.
 *
 * PROCEDURE_NOT_FOUND is included because the org profile procedures
 * (`createOrgProfile`, `updateOrgProfile`, `deleteOrgProfile`) are table-CRUD
 * operations that exist in the generated SDK but may not be deployed in every
 * host — the error surfaces as PROCEDURE_NOT_FOUND until the pgpm module ships.
 */

export type OrgRolesEditorMessages = {
  title: string;
  description: string;
  addProfileButton: string;
  editButton: string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmButton: string;
  profileNameLabel: string;
  profileNamePlaceholder: string;
  profileDescriptionLabel: string;
  profileDescriptionPlaceholder: string;
  saveButton: string;
  saveButtonPending: string;
  cancelButton: string;
  emptyState: string;
  saveSuccessMessage: string;
  deleteSuccessMessage: string;
  errors: {
    PROFILE_IN_USE: string;
    PERMISSION_DENIED: string;
    DUPLICATE_NAME: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: hosts can override any top-level key OR any
 * individual error code without restating the entire catalog.
 */
export type OrgRolesEditorMessageOverrides = Partial<Omit<OrgRolesEditorMessages, 'errors'>> & {
  errors?: Partial<OrgRolesEditorMessages['errors']>;
};

export const defaultOrgRolesEditorMessages: OrgRolesEditorMessages = {
  title: 'Role profiles',
  description: 'Define named sets of permissions for org members.',
  addProfileButton: 'Add role',
  editButton: 'Edit',
  deleteButton: 'Delete',
  deleteConfirmTitle: 'Delete role profile',
  deleteConfirmDescription: 'Delete this role profile? Members with this role will be set to default.',
  deleteConfirmButton: 'Delete',
  profileNameLabel: 'Role name',
  profileNamePlaceholder: 'e.g. Billing Manager',
  profileDescriptionLabel: 'Description',
  profileDescriptionPlaceholder: 'Optional — describe what this role can do',
  saveButton: 'Save role',
  saveButtonPending: 'Saving…',
  cancelButton: 'Cancel',
  emptyState: 'No custom roles defined.',
  saveSuccessMessage: 'Role saved.',
  deleteSuccessMessage: 'Role deleted.',
  errors: {
    PROFILE_IN_USE: 'This role is assigned to members and cannot be deleted. Reassign members first.',
    PERMISSION_DENIED: 'You do not have permission to manage roles.',
    DUPLICATE_NAME: 'A role with this name already exists.',
    PROCEDURE_NOT_FOUND: 'Role management is not yet available. Contact your administrator.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

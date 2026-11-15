'use client';

import * as React from 'react';

import { Button } from '@constructive-io/ui/button';

import { normalizeFeaturePackError } from '../shared/feature-pack-contracts';
import type {
  AppAccessProfile,
  AppCapability,
  UsersFeatureActions,
  UsersFeaturePackProps
} from './users-feature-pack';

type ProfilePreset = Readonly<{ name: string; slug: string; description: string; capabilities: readonly string[] }>;

// Starting points for a scope with storage, by the platform's capability
// names. A preset is offered only when the scope has every capability it
// names, so it grants what its description says, and only while no profile
// has its slug.
const PROFILE_PRESETS: readonly ProfilePreset[] = [
  { name: 'Viewer', slug: 'viewer', description: 'Reads every file.', capabilities: ['read_files'] },
  { name: 'Editor', slug: 'editor', description: 'Reads and changes files.', capabilities: ['read_files', 'write_files'] },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Manages files, sharing, members and invitations.',
    capabilities: [
      'read_files', 'write_files', 'delete_files', 'share_files',
      'admin_members', 'create_invites', 'admin_invites', 'assign_profiles'
    ]
  }
];

/** One button per starting profile the scope can grant in full and doesn't have yet. */
export function ProfilePresets({
  profiles,
  capabilities,
  createProfile,
  onError
}: Readonly<{
  profiles: readonly AppAccessProfile[];
  capabilities: readonly AppCapability[];
  createProfile: NonNullable<UsersFeatureActions['createProfile']>;
  onError?: UsersFeaturePackProps['onError'];
}>) {
  const [pending, setPending] = React.useState<string | null>(null);
  const idByName = new Map(capabilities.map((capability) => [capability.name, capability.id] as const));
  const taken = new Set(profiles.map((profile) => profile.slug));
  const offered = PROFILE_PRESETS.filter((preset) =>
    !taken.has(preset.slug) && preset.capabilities.every((name) => idByName.has(name))
  );
  if (offered.length === 0) return null;
  return (
    <>
      {offered.map((preset) => (
        <Button
          disabled={pending !== null}
          key={preset.slug}
          onClick={async () => {
            setPending(preset.slug);
            try {
              await createProfile({
                name: preset.name,
                slug: preset.slug,
                description: preset.description,
                capabilityIds: preset.capabilities.map((name) => idByName.get(name)!)
              });
            } catch (error) {
              onError?.(normalizeFeaturePackError(error, `${preset.name} could not be added.`));
            } finally {
              setPending(null);
            }
          }}
          size='sm'
          variant='outline'
        >
          {`Add ${preset.name}`}
        </Button>
      ))}
    </>
  );
}

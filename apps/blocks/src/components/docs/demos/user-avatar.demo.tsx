'use client';

import { UserAvatar } from '@/blocks/user/user-avatar/user-avatar';

export function BlockDemo() {
  return (
    <div className="flex items-end justify-center gap-10">
      <UserAvatar
        size="sm"
        user={{ id: '1', type: 'person', displayName: 'Ada Lovelace', username: 'ada', profilePicture: null }}
      />
      <UserAvatar
        size="md"
        user={{ id: '2', type: 'person', displayName: 'Grace Hopper', username: 'grace', profilePicture: null }}
      />
      <UserAvatar
        size="lg"
        user={{
          id: '3',
          type: 'organization',
          displayName: 'Constructive',
          username: 'constructive',
          profilePicture: null,
        }}
      />
    </div>
  );
}

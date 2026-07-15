/**
 * user-avatar  (registry: user-avatar)
 *
 * Pure presentational avatar for a user or org. Renders a profile picture when
 * available; falls back to initials derived from displayName. Shape is round for
 * persons and square (rounded-sm) for orgs. Three fixed sizes: sm / md / lg.
 *
 * No data fetching, no callbacks, no SDK binding. All data passed via props.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@constructive-io/ui/avatar';

import { cn } from '@/lib/utils';

import { deriveInitials } from './user-initials';

/** The user data subset required for avatar rendering. */
export type UserAvatarUser = {
  id: string;
  /** 'person' = round avatar; 'organization' = square avatar. */
  type: 'person' | 'organization';
  displayName: string;
  username: string | null;
  /**
   * Value from `constructive_users_public.users.profile_picture`.
   * Custom `image` domain — may be a URL string or null.
   */
  profilePicture: string | null;
};

export type UserAvatarSize = 'sm' | 'md' | 'lg';

export type UserAvatarProps = {
  user: UserAvatarUser;
  /**
   * Visual size of the avatar.
   * sm = 24px (size-6), md = 32px (size-8), lg = 40px (size-10).
   * Default: 'md'
   */
  size?: UserAvatarSize;
  /** Override alt text. Default: user.displayName. */
  alt?: string;
  /** Additional CSS class names forwarded to the root <Avatar> element. */
  className?: string;
};

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10'
};

export function UserAvatar({ user, size = 'md', alt, className }: UserAvatarProps) {
  const shapeClass = user.type === 'organization' ? 'rounded-sm' : 'rounded-full';
  const sizeClass = sizeClasses[size];
  const initials = deriveInitials(user.displayName, user.username);
  const altText = alt ?? user.displayName;

  return (
    <Avatar data-slot="user-avatar" className={cn(sizeClass, shapeClass, className)}>
      {user.profilePicture && (
        <AvatarImage src={user.profilePicture} alt={altText} />
      )}
      <AvatarFallback aria-hidden="true">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

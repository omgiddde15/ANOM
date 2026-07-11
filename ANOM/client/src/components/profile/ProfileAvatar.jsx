/**
 * src/components/profile/ProfileAvatar.jsx
 *
 * Displays profileImageUrl (or legacy photo fields) when set;
 * otherwise shows initials.
 */

import { useState } from 'react';
import { resolveProfileImageUrl } from '../../lib/profileImage';

export default function ProfileAvatar({
  name = '',
  photoUrl = '',
  profileImageUrl = '',
  profilePhotoUrl = '',
  profile = null,
  size = 'lg',
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const dim =
    size === 'lg' ? 'h-24 w-24 text-2xl' :
    size === 'md' ? 'h-14 w-14 text-lg'  :
                    'h-10 w-10 text-sm';

  const imageUrl = profile
    ? resolveProfileImageUrl(profile)
    : resolveProfileImageUrl({ photoUrl, profileImageUrl, profilePhotoUrl });

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${dim} rounded-full object-cover ring-2 ring-indigo-100`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-indigo-100 text-indigo-600
        flex items-center justify-center font-semibold select-none`}
    >
      {initials || '?'}
    </div>
  );
}

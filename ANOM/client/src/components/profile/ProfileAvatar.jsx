/**
 * src/components/profile/ProfileAvatar.jsx
 *
 * Displays a photo if photoUrl is set, otherwise shows initials.
 */

export default function ProfileAvatar({ name = '', photoUrl = '', size = 'lg' }) {
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

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${dim} rounded-full object-cover ring-2 ring-indigo-100`}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
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

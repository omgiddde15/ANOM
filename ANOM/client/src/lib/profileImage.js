/**
 * Resolve the best available profile image URL for display.
 * Prefers user-supplied profileImageUrl over IBM Object Storage photoUrl.
 * Falls back to randomuser.me image if none available.
 */
export function resolveProfileImageUrl(source = {}) {
  if (typeof source === 'string') return source.trim();
  
  const userUrl = (
    source.profileImageUrl ||
    source.profilePhotoUrl ||
    source.photoUrl ||
    ''
  ).trim();
  
  if (userUrl) return userUrl;
  
  // Fallback to randomuser.me image based on user id or name
  const seed = source.id || source.name || 'default';
  const gender = source.gender || (Math.random() > 0.5 ? 'men' : 'women');
  const num = Math.abs(hashCode(seed)) % 100;
  return `https://randomuser.me/api/portraits/${gender}/${num}.jpg`;
}

// Simple hash function for consistent random images per user
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

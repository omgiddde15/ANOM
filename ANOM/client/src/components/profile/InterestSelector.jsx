/**
 * src/components/profile/InterestSelector.jsx
 *
 * Multi-select tag picker for interests.
 * Toggling a tag adds/removes it from the selected array.
 */

// Exact list as per requirements
export const PREDEFINED_INTERESTS = [
  "travel",
  "music",
  "sports",
  "cooking",
  "reading",
  "gaming",
  "art",
  "technology",
  "fitness",
  "movies",
  "photography",
  "nature",
  "fashion",
  "volunteering",
  "other"
];

// Capitalized version for display
export const ALL_INTERESTS = PREDEFINED_INTERESTS.map(
  (interest) => interest.charAt(0).toUpperCase() + interest.slice(1)
);

// Normalize interests: unique, lowercase, no empty
export const normalizeInterests = (interests = []) => {
  if (!Array.isArray(interests)) return [];
  const normalized = new Set();
  for (let interest of interests) {
    const i = (interest || '').trim().toLowerCase();
    if (!i) continue;
    normalized.add(i);
  }
  return [...normalized];
};

export default function InterestSelector({ selected = [], onChange }) {
  function toggle(interest) {
    const lower = interest.toLowerCase();
    const next = selected.includes(lower)
      ? selected.filter((i) => i !== lower)
      : [...selected, lower];
    onChange(normalizeInterests(next));
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">Interests</p>
      <div className="flex flex-wrap gap-2">
        {ALL_INTERESTS.map((interest) => {
          const lower = interest.toLowerCase();
          const active = selected.includes(lower);
          return (
            <button
              key={lower}
              type="button"
              onClick={() => toggle(interest)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition
                ${active
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
                }`}
            >
              {interest}
            </button>
          );
        })}
      </div>
    </div>
  );
}

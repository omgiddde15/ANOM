/**
 * src/components/profile/InterestSelector.jsx
 *
 * Multi-select tag picker for interests.
 * Toggling a tag adds/removes it from the selected array.
 */

const ALL_INTERESTS = [
  'Travel', 'Music', 'Sports', 'Cooking', 'Reading',
  'Gaming', 'Art', 'Technology', 'Fitness', 'Movies',
  'Photography', 'Nature', 'Fashion', 'Volunteering', 'Other',
];

export default function InterestSelector({ selected = [], onChange }) {
  function toggle(interest) {
    const lower = interest.toLowerCase();
    const next = selected.includes(lower)
      ? selected.filter((i) => i !== lower)
      : [...selected, lower];
    onChange(next);
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

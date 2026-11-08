import type { Option } from '../data/options.ts';

// A row of toggle buttons for picking games or hobbies.
// aria-pressed tells screen readers which ones are picked.
// Used by onboarding and by "edit profile" on the account page.
function TagPicker({ label, options, picked, onToggle }: {
  label: string;
  options: Option[];
  picked: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-3xl">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => {
          const on = picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.value)}
              className={`rounded-lg border-2 border-pink px-4 py-1 text-xl transition focus-visible:outline-2 focus-visible:outline-white ${
                on ? 'bg-pink text-white' : 'text-white hover:bg-pink/20'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default TagPicker;

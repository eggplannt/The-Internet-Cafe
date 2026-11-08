import { AVATARS } from '../data/avatars.ts';

// Pick one coffee-cup profile picture. Real radio buttons (visually hidden) so arrow keys
// and screen readers work for free; the picture itself is the clickable label.
// Used by onboarding and by "edit profile" on the account page.
function AvatarPicker({ picked, onPick }: { picked: string; onPick: (value: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-3xl">profile picture</legend>
      <div className="flex flex-wrap gap-4">
        {AVATARS.map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded-full border-4 border-transparent transition hover:scale-105 has-checked:border-pink has-focus-visible:outline-2 has-focus-visible:outline-white"
          >
            <input
              type="radio"
              name="avatar"
              value={o.value}
              checked={picked === o.value}
              onChange={() => onPick(o.value)}
              className="sr-only"
            />
            <img
              src={o.src}
              alt={o.label}
              // Small pixel art: keep it crisp instead of blurry when scaled up
              className="h-20 w-20 rounded-full object-cover [image-rendering:pixelated]"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default AvatarPicker;

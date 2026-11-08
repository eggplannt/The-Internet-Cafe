import { avatarSrc, isPreset } from '../data/avatars.ts';

// Someone's picked coffee-cup avatar, their Google photo, or their first initial when they have neither.
// alt / aria-label is the display name, so screen readers know whose avatar it is.
function Avatar({ name, url, className = 'h-12 w-12 text-2xl' }: { name: string; url: string | null; className?: string }) {
  const src = avatarSrc(url);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        // no-referrer: Google's avatar host sometimes refuses images requested from other sites
        referrerPolicy="no-referrer"
        // The cups are small pixel art: keep the pixels crisp instead of blurry
        className={`shrink-0 rounded-full object-cover ${isPreset(url) ? '[image-rendering:pixelated]' : ''} ${className}`}
      />
    );
  }
  return (
    <div role="img" aria-label={name} className={`flex shrink-0 items-center justify-center rounded-full bg-pink ${className}`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default Avatar;

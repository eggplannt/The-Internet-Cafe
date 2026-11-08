// The profile pictures a user can pick during onboarding (pixel-art coffee cups).
//
// We save a stable key like "preset:smiley" in profiles.avatar_url, not the image URL itself:
// Vite renames asset files on every build (smiley-a1b2c3.png), so a saved URL would break
// after the next deploy. <Avatar> turns the key back into the current image.
import smiley from '../assets/smiley.png';
import winky from '../assets/winky.png';
import silly from '../assets/silly.png';
import tongue from '../assets/tongue.png';
import sleepy from '../assets/sleepy.png';
import derpy from '../assets/derpy.png';

export type AvatarOption = { value: string; label: string; src: string };

const PREFIX = 'preset:';

export const AVATARS: AvatarOption[] = [
  { value: `${PREFIX}smiley`, label: 'smiley cup', src: smiley },
  { value: `${PREFIX}winky`, label: 'winky cup', src: winky },
  { value: `${PREFIX}silly`, label: 'silly cup', src: silly },
  { value: `${PREFIX}tongue`, label: 'tongue-out cup', src: tongue },
  { value: `${PREFIX}sleepy`, label: 'sleepy cup', src: sleepy },
  { value: `${PREFIX}derpy`, label: 'derpy cup', src: derpy },
];

// Turns a saved avatar_url into something an <img> can show.
// Preset keys become the bundled image; anything else (a Google photo URL) is used as is.
// Returns null for an unknown preset, so the caller falls back to initials.
export function avatarSrc(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (!avatarUrl.startsWith(PREFIX)) return avatarUrl;
  return AVATARS.find((a) => a.value === avatarUrl)?.src ?? null;
}

// Pixel art is only ~110px wide, so stop the browser from blurring it when scaled up
export const isPreset = (avatarUrl: string | null) => !!avatarUrl?.startsWith(PREFIX);

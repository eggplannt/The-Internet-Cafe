import { useEffect, useState, type ReactNode } from 'react';

// A dismissible banner that shows only the first time its `storageKey` is seen in this
// browser session. Use it for any one-time hint, e.g.:
//
//   <OneTimeBanner storageKey={`chat-banner-seen:${squadId}`}>say hi!</OneTimeBanner>
//
// sessionStorage (not localStorage) on purpose: it clears when the tab closes, so the
// hint comes back next visit instead of disappearing forever. No table needed.
// Pick a key per thing you want to show once (add an id to show it once per squad, etc.).
//
// If the same banner should show again for a different key on the same page,
// also pass `key={storageKey}` so React starts it fresh.

// Storage can throw (private mode, blocked site data), so treat failures as "not seen"
// for reading and ignore them for writing. The banner just shows again; nothing breaks.
function hasSeen(storageKey: string): boolean {
  try {
    return sessionStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}

function markSeen(storageKey: string) {
  try {
    sessionStorage.setItem(storageKey, '1');
  } catch {
    // ignore: see above
  }
}

function OneTimeBanner({ storageKey, children }: { storageKey: string; children: ReactNode }) {
  // Decided once when it mounts, so the banner stays up until dismissed or you leave
  const [show, setShow] = useState(() => !hasSeen(storageKey));

  // Mark it seen as soon as it's shown, so coming back in the same session skips it
  useEffect(() => {
    if (show) markSeen(storageKey);
  }, [show, storageKey]);

  if (!show) return null;

  return (
    <div role="status" className="flex items-center justify-between gap-4 rounded-lg bg-pink px-4 py-2 text-2xl text-white">
      <p>{children}</p>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="dismiss"
        className="shrink-0 rounded px-2 text-3xl leading-none transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-white"
      >
        ×
      </button>
    </div>
  );
}

export default OneTimeBanner;

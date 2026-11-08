// Someone's Google photo, or their first initial when they don't have one.
// alt / aria-label is the display name, so screen readers know whose avatar it is.
function Avatar({ name, url, className = 'h-12 w-12 text-2xl' }: { name: string; url: string | null; className?: string }) {
  if (url) {
    // no-referrer: Google's avatar host sometimes refuses images requested from other sites
    return <img src={url} alt={name} referrerPolicy="no-referrer" className={`shrink-0 rounded-full ${className}`} />;
  }
  return (
    <div role="img" aria-label={name} className={`flex shrink-0 items-center justify-center rounded-full bg-pink ${className}`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default Avatar;

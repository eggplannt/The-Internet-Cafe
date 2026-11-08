import { Link, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth.tsx";
import { useMySquads } from "../hooks/useMySquads.ts";
import { useUnreadSquads } from "../hooks/useUnreadSquads.ts";
import { signOut } from "../backend-tools/auth.ts";
import GoogleSignInButton from "./GoogleSignInButton.tsx";

function Header() {
  const { user, loading } = useAuth();
  const { squads } = useMySquads();
  const squadIds = squads?.map((s) => s.squad_id) ?? [];
  // One dot for all squads: is there anything new in any of them?
  const unread = useUnreadSquads(squadIds, user?.id ?? null).size > 0;
  // No dot while you're looking at the chat itself
  const onSquadPage = useLocation().pathname === '/squad';

  return (
    <header className="flex items-center justify-between bg-navy px-8 py-4 text-white">
      <a href="/" className="flex items-center gap-3 text-3xl">
        <img
          src="/flavicon.svg"
          alt="The Internet Café logo"
          className="h-10 w-10 object-contain"
        />
        <span>
          The <span className="text-pink">Internet</span> Café
        </span>
      </a>

      <nav className="flex items-center gap-8 text-2xl">
        <a href="/" className="transition-colors hover:text-pink ">
          home
        </a>
        {/* Hidden while auth loads too, so signed-in users never see it flash */}
        {!loading && !user && (
          <GoogleSignInButton />
        )}
        {/* Always there once signed in. The dot means something new: a new squad or a new message */}
        {!loading && user && (
          <Link to="/squad" className="relative transition-colors hover:text-pink">
            chat rooms
            {unread && !onSquadPage && (
              <span className="absolute -right-3 -top-1 h-3 w-3 rounded-full bg-pink">
                <span className="sr-only"> (new)</span>
              </span>
            )}
          </Link>
        )}
        {/* Link (not <a>) so moving between pages doesn't reload the app */}
        {!loading && user && (
          <Link to="/account" className="transition-colors hover:text-pink">
            account
          </Link>
        )}
        {/* AuthProvider hears the sign-out and flips back to the signed-out nav */}
        {!loading && user && (
          <button onClick={signOut} className="transition-colors hover:text-pink">
            sign out
          </button>
        )}
      </nav>
    </header>
  );
}

export default Header;
import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth.tsx";
import { signOut } from "../backend-tools/auth.ts";
import GoogleSignInButton from "./GoogleSignInButton.tsx";

function Header() {
  const { user, loading } = useAuth();

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
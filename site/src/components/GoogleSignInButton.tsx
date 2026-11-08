import { signInWithGoogle } from "../backend-tools/auth.ts";

// One button for both log in and sign up: Google sign-in creates the account if it's new.
// Used in the nav bar and on the home page so they always look and act the same.
function GoogleSignInButton() {
  return (
    <button
      onClick={signInWithGoogle}
      className="rounded-lg bg-pink px-6 py-2 text-white transition hover:scale-105 ease-in-out hover:brightness-110"
    >
      login/signup with google
    </button>
  );
}

export default GoogleSignInButton;

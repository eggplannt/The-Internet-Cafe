import GoogleSignInButton from "./GoogleSignInButton.tsx";
import { useAuth } from "../hooks/useAuth.tsx";

function Hero() {
  const { user, loading } = useAuth();

  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden bg-cover bg-center px-8 md:px-20"
      style={{ backgroundImage: "url('/bg.gif')" }}
    >
      <div className="absolute inset-0 bg-navy/35" />

      <div className="relative z-10 max-w-2xl text-white">

        <h1 className="mb-6 text-6xl leading-[0.9] md:text-8xl">
          hobby-based
          <br />
          matchmaking.
        </h1>

        <p className="mb-8 max-w-lg text-2xl leading-tight">
          your new community.
          a place to meet new people, play games,
          explore hobbies, and find your forever 5-stack.
        </p>

        {/* Signed-in users don't need these; hidden while auth loads to avoid a flash */}
        {!loading && !user && (
          <div className="flex flex-wrap gap-4 text-2xl">
            <GoogleSignInButton />
          </div>
        )}
      </div>
    </section>
  );
}

export default Hero;
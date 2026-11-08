import GoogleSignInButton from "./GoogleSignInButton.tsx";
import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth.tsx";
import { useMySquads } from "../hooks/useMySquads.ts";

function Hero() {
  const { user, loading } = useAuth();
  const { squads } = useMySquads();
  const hasSquad = (squads?.length ?? 0) > 0;

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

        {/* Visitors get sign-in; signed-in users in a squad get a way into their chats instead.
            Nothing while auth loads, to avoid a flash of the wrong button */}
        {!loading && !user && (
          <div className="flex flex-wrap gap-4 text-2xl">
            <GoogleSignInButton />
          </div>
        )}
        {/* Same rule as the "chat rooms" link in the header: only once you're in a squad */}
        {!loading && user && hasSquad && (
          <div className="flex flex-wrap gap-4 text-2xl">
            <Link
              to="/squad"
              className="rounded-lg bg-pink px-6 py-2 text-white transition hover:scale-105 ease-in-out hover:brightness-110 focus-visible:outline-2 focus-visible:outline-white"
            >
              chat rooms
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default Hero;
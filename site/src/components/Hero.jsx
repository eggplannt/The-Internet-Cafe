function Hero() {
  return (
    <section
      className="relative flex min-h-[650px] items-center overflow-hidden bg-cover bg-center px-8 md:px-20"
      style={{ backgroundImage: "url('/bg.gif')" }}
    >
      <div className="absolute inset-0 bg-navy/35" />

      <div className="relative z-10 max-w-2xl text-white">

        <h1 className="mb-6 text-6xl leading-[0.9] md:text-8xl">
          for gamers
          <br />
          with other hobbies.
        </h1>

        <p className="mb-8 max-w-lg text-2xl leading-tight">
          Your little corner of the internet.
          A place to play games, explore your hobbies,
          discover new interests, and meet new people.
        </p>

        <div className="flex flex-wrap gap-4 text-2xl">
          <a
            href="/login"
            className="rounded-lg bg-pink px-8 py-2 text-white transition hover:scale-105 hover:brightness-110"
          >
            log in
          </a>

          <a
            href="/signup"
            className="rounded-lg border-2 border-pink bg-navy/70 px-8 py-2 text-pink transition hover:scale-105 hover:bg-pink hover:text-white"
          >
            sign up
          </a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
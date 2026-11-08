function Header() {
  return (
    <header className="flex items-center justify-between bg-navy px-8 py-4 text-white">
      <a href="/" className="text-3xl">
        The <span className="text-pink">Internet</span> Café
      </a>

      <nav className="flex items-center gap-8 text-2xl">
        <a href="/" className="transition-colors hover:text-pink ">
          home
        </a>
        <a href="/login" className="transition-colors hover:text-pink">
          log in
        </a>
      </nav>
    </header>
  );
}

export default Header;
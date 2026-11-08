import Header from "../components/Header.tsx";
import TestChat from "../TestChat.tsx";
import Hero from "../components/Hero.tsx";
import Footer from "../components/Footer.tsx";

function App() {
  return (
    <div className="min-h-screen bg-navy">
      <Header />
      <main>
        {/* temporary, delete after testing */}
        <TestChat />
      </main>
      <Footer />
    </div>
  );
}

export default App;

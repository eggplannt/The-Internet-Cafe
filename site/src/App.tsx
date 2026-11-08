import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';

function App() {
  return (
    <div className="min-h-screen bg-navy">
      <Header />
      <main>
        <Hero />
      </main>
    </div>
  );
}

export default App;
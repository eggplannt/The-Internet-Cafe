import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import Home from './pages/home.tsx';
import Onboarding from './pages/onboarding.tsx';
import Account from './pages/account.tsx';

// Every page the app has. Unknown paths go back home.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

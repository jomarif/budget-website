import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BudgetProvider } from './context/BudgetContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AuthGate from './components/AuthGate.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BudgetProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </BudgetProvider>
    </AuthProvider>
  </StrictMode>
);

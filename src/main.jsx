import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BudgetProvider } from './context/BudgetContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import AuthGate from './components/AuthGate.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfirmProvider>
      <AuthProvider>
        <BudgetProvider>
          <AuthGate>
            <App />
          </AuthGate>
        </BudgetProvider>
      </AuthProvider>
    </ConfirmProvider>
  </StrictMode>
);

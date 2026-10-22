import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.jsx';
import { AuthProvider } from './shared/contexts/AuthContext.jsx';
import { FamilyProvider } from './shared/contexts/FamilyContext.jsx';
import { ThemeProvider } from './shared/contexts/ThemeContext.jsx';
import { useTheme } from './shared/hooks/useTheme.js';
import './index.css';
import './shared/styles/components.css';

function GlobalToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" theme={theme} richColors closeButton duration={4000} visibleToasts={4} />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <GlobalToaster />
        <AuthProvider>
          <FamilyProvider>
            <App />
          </FamilyProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

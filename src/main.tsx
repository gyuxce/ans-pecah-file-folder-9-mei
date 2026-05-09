import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfigMissing } from './components/ConfigMissing';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackMessage="The application encountered an error and could not be loaded.">
      {(!SUPABASE_URL || !SUPABASE_ANON_KEY) ? <ConfigMissing /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
);

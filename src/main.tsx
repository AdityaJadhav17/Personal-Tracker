import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// AC-40.1. Everything lives in this origin's storage and nowhere else, so ask
// the browser not to clear it under storage pressure. Chrome grants this to an
// installed app; if it says no, nothing changes and Export is still the backup.
void navigator.storage.persist();

const root = document.getElementById('root');
if (!root) throw new Error('No #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/app';
import { applyStoredThemeToDocument } from './libs/ui/theme-provider';
import './styles/app.css';

applyStoredThemeToDocument();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Target container #root not found in document');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

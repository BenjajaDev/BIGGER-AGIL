import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '@fontsource/anton';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles/tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { z } from 'zod';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

z.config(z.locales.es());

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el elemento #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

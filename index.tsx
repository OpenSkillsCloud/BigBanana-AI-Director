import '@fontsource/inter/latin-300.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AlertProvider } from './components/GlobalAlert';
import { ThemeProvider } from './contexts/ThemeContext';
import { OFFICIAL_WEBSITE_URL, APP_VERSION, COMPANY_NAME } from './constants/links';

console.log(
  `%c 慕安世界 v${APP_VERSION} %c\n` +
  `%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%c\n` +
  `  🎬 AI 漫剧生成平台\n` +
  `  🏠 官网: ${OFFICIAL_WEBSITE_URL}\n` +
  `  © ${new Date().getFullYear()} ${COMPANY_NAME}\n` +
  `%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%c`,
  'background: #7c3aed; color: #fff; font-size: 14px; font-weight: bold; padding: 4px 12px; border-radius: 4px;',
  '',
  'color: #7c3aed;', '',
  'color: #7c3aed;', ''
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

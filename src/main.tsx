import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.tsx';
import './index.css';

console.log('main.tsx starting...');

// Global error capture for non-React errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global Error:', { message, source, lineno, colno, error });
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise,
    message: event.reason?.message || 'No message provided'
  });
};

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  console.log('Mounting React app...');
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </StrictMode>,
  );
  console.log('React app mounted');
} catch (error) {
  console.error('Failed to mount React app:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 20px; background: black; color: white; font-family: sans-serif;">
        <h1 style="color: #ff4444; font-size: 1.2rem; margin-bottom: 10px;">Initialization Failed</h1>
        <p style="color: #666; font-size: 0.9rem;">${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: white; color: black; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">Retry</button>
      </div>
    `;
  }
}

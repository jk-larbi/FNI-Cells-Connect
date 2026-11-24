import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// Register the app-shell service worker on every web install, not only after
// a user enables push notifications. This enables reliable app updates and
// the cached offline shell when FNI is added to an iPhone Home Screen.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerFniServiceWorker = () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    void navigator.serviceWorker.register(`${baseUrl}sw.js`, {
      scope: baseUrl,
      updateViaCache: 'none',
    }).catch(error => {
      console.warn('[FNI] Service worker registration was not available:', error);
    });
  };

  if (document.readyState === 'complete') {
    registerFniServiceWorker();
  } else {
    window.addEventListener('load', registerFniServiceWorker, { once: true });
  }
}

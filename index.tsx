import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { GoogleOAuthProvider } from '@react-oauth/google';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "257425560798-5ltn6vsrj4l5dl59t86j1sun05p6f6rf.apps.googleusercontent.com";

import { Analytics } from "@vercel/analytics/react";

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
      <Analytics />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

defineCustomElements(window);

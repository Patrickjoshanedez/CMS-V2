import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { getGoogleAuthRuntimeConfig } from './utils/googleAuth';
import { appQueryClient } from './lib/queryClient';
import './index.css';

const googleAuth = getGoogleAuthRuntimeConfig();

const appTree = (
  <React.StrictMode>
    <QueryClientProvider client={appQueryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

if (!googleAuth.hasClientId) {
  console.warn('VITE_GOOGLE_CLIENT_ID is missing. Google Sign-In will be disabled.');
}

if (googleAuth.isDisabledByDevPolicy) {
  console.warn(
    'Google Sign-In is disabled in development by default. Set VITE_ENABLE_GOOGLE_LOGIN=true after configuring Google OAuth authorized origins.',
  );
}

if (googleAuth.hasClientId && !googleAuth.isOriginAllowed) {
  console.warn(
    `Google Sign-In disabled for origin ${window.location.origin}. Add this origin to VITE_GOOGLE_ALLOWED_ORIGINS or Google OAuth Authorized JavaScript origins.`,
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  googleAuth.isEnabled ? (
    <GoogleOAuthProvider clientId={googleAuth.clientId}>{appTree}</GoogleOAuthProvider>
  ) : (
    appTree
  ),
);

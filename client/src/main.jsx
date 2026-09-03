import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { getGoogleAuthRuntimeConfig } from './utils/googleAuth';
import { appQueryClient } from './lib/queryClient';
import { applyTheme } from './stores/themeStore';
import './index.css';

// ─── Flash-free theme bootstrap ───────────────────────────────────────────────
// Apply the persisted theme class BEFORE React mounts to eliminate the white
// flash on hard refresh when the user is in dark or system-dark mode.
(function () {
  try {
    const stored = localStorage.getItem('cms-accessibility-settings');
    const parsed = stored ? JSON.parse(stored) : {};
    applyTheme(parsed?.state?.theme ?? 'dark');
  } catch {
    // Fallback: default dark if localStorage is inaccessible
    document.documentElement.classList.add('dark');
  }
})();

const googleAuth = getGoogleAuthRuntimeConfig();

const appTree = (
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
);

if (!googleAuth.hasClientId) {
  console.warn('VITE_GOOGLE_CLIENT_ID is missing. Google Sign-In will be disabled.');
}

if (googleAuth.isDisabledByDevPolicy) {
  console.warn(
    'Google Sign-In is disabled in development by default. Set VITE_ENABLE_GOOGLE_LOGIN=true after configuring Google OAuth authorized origins.',
  );
}

if (googleAuth.isMissingAllowedOriginsInDev) {
  if (googleAuth.isUsingDevLoopbackFallback) {
    console.warn(
      'Google Sign-In is using the local loopback fallback because VITE_GOOGLE_ALLOWED_ORIGINS is not set. Configure VITE_GOOGLE_ALLOWED_ORIGINS explicitly to keep strict origin checks and avoid OAuth origin mismatch on non-loopback hosts.',
    );
  } else {
    console.warn(
      'Google Sign-In requires VITE_GOOGLE_ALLOWED_ORIGINS in development when VITE_ENABLE_GOOGLE_LOGIN=true. Add your exact frontend origin and Google OAuth Authorized JavaScript origins.',
    );
  }
}

if (googleAuth.hasClientId && !googleAuth.isOriginAllowed) {
  console.warn(
    `Google Sign-In disabled for origin ${window.location.origin}. Add this origin to VITE_GOOGLE_ALLOWED_ORIGINS or Google OAuth Authorized JavaScript origins.`,
  );
}

const rootTree = googleAuth.hasClientId ? (
  <GoogleOAuthProvider clientId={googleAuth.clientId}>{appTree}</GoogleOAuthProvider>
) : (
  appTree
);

ReactDOM.createRoot(document.getElementById('root')).render(rootTree);

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function parseAllowedOrigins(rawOrigins) {
  if (!rawOrigins || typeof rawOrigins !== 'string') {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  const values = rawOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : DEFAULT_ALLOWED_ORIGINS;
}

export function getGoogleAuthRuntimeConfig() {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const allowedOrigins = parseAllowedOrigins(import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS);
  const isDevelopment = import.meta.env.DEV;
  const isExplicitlyEnabledInDev = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true';

  const hasClientId = Boolean(clientId);
  const isOriginAllowed = currentOrigin ? allowedOrigins.includes(currentOrigin) : true;
  const isDisabledByDevPolicy = isDevelopment && !isExplicitlyEnabledInDev;

  return {
    clientId,
    allowedOrigins,
    hasClientId,
    isOriginAllowed,
    isEnabled: hasClientId && isOriginAllowed && !isDisabledByDevPolicy,
    isDisabledByDevPolicy,
  };
}

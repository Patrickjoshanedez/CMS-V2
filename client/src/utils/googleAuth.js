function parseAllowedOrigins(rawOrigins) {
  if (!rawOrigins || typeof rawOrigins !== 'string') {
    return [];
  }

  const values = rawOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return values;
}

export function isLoopbackOrigin(origin) {
  if (!origin || typeof origin !== 'string') {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    return (
      parsedOrigin.hostname === 'localhost' ||
      parsedOrigin.hostname === '127.0.0.1' ||
      parsedOrigin.hostname === '[::1]' ||
      parsedOrigin.hostname === '::1'
    );
  } catch {
    return false;
  }
}

export function getGoogleAuthRuntimeConfig(overrides = {}) {
  const env = overrides.env || import.meta.env;
  const clientId = (env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const currentOrigin =
    overrides.currentOrigin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const rawAllowedOrigins = env.VITE_GOOGLE_ALLOWED_ORIGINS;
  const allowedOrigins = parseAllowedOrigins(rawAllowedOrigins);
  const isDevelopment = Boolean(env.DEV);
  const isExplicitlyEnabledInDev = env.VITE_ENABLE_GOOGLE_LOGIN === 'true';

  const hasClientId = Boolean(clientId);
  const hasExplicitAllowedOrigins =
    typeof rawAllowedOrigins === 'string' && rawAllowedOrigins.trim().length > 0;
  const isDevLoopback = isDevelopment && isLoopbackOrigin(currentOrigin);
  const isOriginAllowed = !currentOrigin
    ? true
    : hasExplicitAllowedOrigins
      ? allowedOrigins.includes(currentOrigin)
      : isDevLoopback;
  const isDisabledByDevPolicy = isDevelopment && !isExplicitlyEnabledInDev;
  const isMissingAllowedOriginsInDev =
    isDevelopment && isExplicitlyEnabledInDev && !hasExplicitAllowedOrigins;
  const isUsingDevLoopbackFallback = isMissingAllowedOriginsInDev && isDevLoopback;

  return {
    clientId,
    allowedOrigins,
    hasClientId,
    hasExplicitAllowedOrigins,
    isOriginAllowed,
    isEnabled: hasClientId && isOriginAllowed && !isDisabledByDevPolicy,
    isDisabledByDevPolicy,
    isMissingAllowedOriginsInDev,
    isUsingDevLoopbackFallback,
  };
}

import { describe, expect, it } from 'vitest';
import { getGoogleAuthRuntimeConfig } from './googleAuth';

describe('getGoogleAuthRuntimeConfig', () => {
  it('enables Google auth for loopback origin in development when allowed origins are missing', () => {
    const config = getGoogleAuthRuntimeConfig({
      env: {
        DEV: true,
        VITE_GOOGLE_CLIENT_ID: 'test-client-id',
        VITE_ENABLE_GOOGLE_LOGIN: 'true',
      },
      currentOrigin: 'http://localhost:43211',
    });

    expect(config.hasClientId).toBe(true);
    expect(config.isDisabledByDevPolicy).toBe(false);
    expect(config.isMissingAllowedOriginsInDev).toBe(true);
    expect(config.isUsingDevLoopbackFallback).toBe(true);
    expect(config.isOriginAllowed).toBe(true);
    expect(config.isEnabled).toBe(true);
  });

  it('still disables Google auth for non-loopback origin when allowed origins are missing', () => {
    const config = getGoogleAuthRuntimeConfig({
      env: {
        DEV: true,
        VITE_GOOGLE_CLIENT_ID: 'test-client-id',
        VITE_ENABLE_GOOGLE_LOGIN: 'true',
      },
      currentOrigin: 'https://example.com',
    });

    expect(config.isMissingAllowedOriginsInDev).toBe(true);
    expect(config.isUsingDevLoopbackFallback).toBe(false);
    expect(config.isOriginAllowed).toBe(false);
    expect(config.isEnabled).toBe(false);
  });

  it('enables Google auth in development when origin is explicitly allowed', () => {
    const config = getGoogleAuthRuntimeConfig({
      env: {
        DEV: true,
        VITE_GOOGLE_CLIENT_ID: 'test-client-id',
        VITE_ENABLE_GOOGLE_LOGIN: 'true',
        VITE_GOOGLE_ALLOWED_ORIGINS: 'http://localhost:43211,http://127.0.0.1:43211',
      },
      currentOrigin: 'http://localhost:43211',
    });

    expect(config.isMissingAllowedOriginsInDev).toBe(false);
    expect(config.isUsingDevLoopbackFallback).toBe(false);
    expect(config.isOriginAllowed).toBe(true);
    expect(config.isEnabled).toBe(true);
  });

  it('disables Google auth when current origin is not in allowed origins', () => {
    const config = getGoogleAuthRuntimeConfig({
      env: {
        DEV: true,
        VITE_GOOGLE_CLIENT_ID: 'test-client-id',
        VITE_ENABLE_GOOGLE_LOGIN: 'true',
        VITE_GOOGLE_ALLOWED_ORIGINS: 'http://localhost:43211,http://127.0.0.1:43211',
      },
      currentOrigin: 'http://localhost:43211',
    });

    expect(config.isMissingAllowedOriginsInDev).toBe(false);
    expect(config.isUsingDevLoopbackFallback).toBe(false);
    expect(config.isOriginAllowed).toBe(false);
    expect(config.isEnabled).toBe(false);
  });

  it('keeps Google auth disabled by default in development when not explicitly enabled', () => {
    const config = getGoogleAuthRuntimeConfig({
      env: {
        DEV: true,
        VITE_GOOGLE_CLIENT_ID: 'test-client-id',
      },
      currentOrigin: 'http://localhost:43211',
    });

    expect(config.isDisabledByDevPolicy).toBe(true);
    expect(config.isUsingDevLoopbackFallback).toBe(false);
    expect(config.isEnabled).toBe(false);
  });
});

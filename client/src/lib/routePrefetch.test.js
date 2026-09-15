import { describe, expect, it, vi } from 'vitest';
import { routeRegistry, prefetchRoute, prefetchHandlers } from './routePrefetch';

describe('routePrefetch', () => {
  it('registers dynamic loaders for all key core routes', () => {
    const expectedRoutes = [
      '/dashboard',
      '/teams',
      '/users',
      '/profile',
      '/settings',
      '/notifications',
      '/project',
      '/project/submissions',
      '/projects',
      '/archive',
      '/reports',
      '/audit-logs',
      '/templates',
      '/defense-scheduling',
    ];

    expectedRoutes.forEach((route) => {
      expect(routeRegistry).toHaveProperty(route);
      expect(typeof routeRegistry[route]).toBe('function');
    });
  });

  it('safely handles prefetchRoute for registered and unregistered paths', () => {
    expect(() => prefetchRoute('/dashboard')).not.toThrow();
    expect(() => prefetchRoute('/nonexistent-path')).not.toThrow();
    expect(() => prefetchRoute(null)).not.toThrow();
    expect(() => prefetchRoute('')).not.toThrow();
  });

  it('generates prefetchHandlers with onMouseEnter and onFocus', () => {
    const handlers = prefetchHandlers('/teams');
    expect(handlers).toHaveProperty('onMouseEnter');
    expect(handlers).toHaveProperty('onFocus');
    expect(typeof handlers.onMouseEnter).toBe('function');
    expect(typeof handlers.onFocus).toBe('function');
    expect(() => handlers.onMouseEnter()).not.toThrow();
    expect(() => handlers.onFocus()).not.toThrow();
  });
});

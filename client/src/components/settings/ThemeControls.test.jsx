import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeSelector from './ThemeSelector';
import ThemeToggle from '../ThemeToggle';
import { useThemeStore } from '@/stores/themeStore';

describe('shared theme controls', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    useThemeStore.getState().setTheme('dark');
  });

  afterEach(() => {
    cleanup();
    useThemeStore.getState().setTheme('light');
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('offers explicit light, dark, and system preferences and applies the selected theme', () => {
    render(<ThemeSelector />);

    expect(screen.getByRole('radio', { name: 'Light' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).toBeVisible();

    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');

    fireEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('toggles the effective theme from the accessible shared button', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

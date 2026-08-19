import { beforeEach, describe, expect, it } from 'vitest';
import { useThemeStore } from './themeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      theme: 'dark',
      fontSizeMultiplier: 1.0,
    });
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.style.removeProperty('--font-size-multiplier');
  });

  it('initializes with default theme and font multiplier', () => {
    const state = useThemeStore.getState();
    expect(state.fontSizeMultiplier).toBe(1.0);
  });

  it('toggles between dark and light themes and updates DOM classes', () => {
    // Tailwind darkMode: 'class' only looks for .dark on <html>.
    // Light mode = absence of .dark — no .light class is applied.
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('cycles font size multiplier through 1.0 -> 1.25 -> 1.5 -> 1.0', () => {
    expect(useThemeStore.getState().fontSizeMultiplier).toBe(1.0);

    useThemeStore.getState().cycleFontSize();
    expect(useThemeStore.getState().fontSizeMultiplier).toBe(1.25);
    expect(document.documentElement.style.getPropertyValue('--font-size-multiplier')).toBe('1.25');

    useThemeStore.getState().cycleFontSize();
    expect(useThemeStore.getState().fontSizeMultiplier).toBe(1.5);
    expect(document.documentElement.style.getPropertyValue('--font-size-multiplier')).toBe('1.5');

    useThemeStore.getState().cycleFontSize();
    expect(useThemeStore.getState().fontSizeMultiplier).toBe(1.0);
    expect(document.documentElement.style.getPropertyValue('--font-size-multiplier')).toBe('1');
  });
});

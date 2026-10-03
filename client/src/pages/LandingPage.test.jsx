import React, { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock routePrefetch utilities to avoid idle-callback side effects in jsdom
vi.mock('@/lib/routePrefetch', () => ({
  prefetchRoute: vi.fn(),
  prefetchHandlers: vi.fn(() => ({})),
  default: vi.fn(),
}));

describe('LandingPage — Minimal Redesign', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    container = null;
    root = null;
  });

  it('renders authentic BukSU identity without fabricated metrics', () => {
    act(() => {
      root.render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>,
      );
    });

    const textContent = container.textContent;

    // 1. Verify official university identity
    expect(textContent).toContain('BukSU BSIT Capstone Portal');
    expect(textContent).toContain('Manage your capstone projects with');
    expect(textContent).toContain('institutional rigor');

    // 2. Verify fabricated statistics and fake codes are ABSENT
    expect(textContent).not.toContain('500+');
    expect(textContent).not.toContain('PROP-2026-BSIT-042');
    expect(textContent).not.toContain('THESIS-2024-019');
    expect(textContent).not.toContain('8.156° N');

    // 3. Verify the four feature pillars are present
    expect(textContent).toContain('Title similarity pre-screening');
    expect(textContent).toContain('One document reader');
    expect(textContent).toContain('Defense committees');
    expect(textContent).toContain('Secure archival');

    // 4. Verify the four-phase workflow strip is present
    expect(textContent).toContain('Title Defense');
    expect(textContent).toContain('Chapters 1–3');
    expect(textContent).toContain('System Build');
    expect(textContent).toContain('Final Defense');

    // 5. Verify FAQ is present
    expect(textContent).toContain('Who can use the portal?');
  });
});

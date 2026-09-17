import React, { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('LandingPage Institutional Architecture & Parallax Integration', () => {
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

  it('renders authentic BukSU institutional pillars without fabricated metrics', () => {
    act(() => {
      root.render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>,
      );
    });

    const textContent = container.textContent;

    // 1. Verify official university identity
    expect(textContent).toContain('BUKSU BSIT CAPSTONE PORTAL');
    expect(textContent).toContain('Manage your capstone projects with');
    expect(textContent).toContain('institutional rigor');

    // 2. Verify fabricated statistics and fake codes are ABSENT
    expect(textContent).not.toContain('500+');
    expect(textContent).not.toContain('PROP-2026-BSIT-042');
    expect(textContent).not.toContain('THESIS-2024-019');
    expect(textContent).not.toContain('8.156° N');

    // 3. Verify authentic System Architecture Stack is present
    expect(textContent).toContain('SYSTEM ARCHITECTURE');
    expect(textContent).toContain('BUKSU CMS-V2 STACK');
    expect(textContent).toContain('Layer 1: Presentation & Workspace');
    expect(textContent).toContain('Layer 2: API & Async Pipeline');
    expect(textContent).toContain('Layer 3: Plagiarism & Similarity');
    expect(textContent).toContain('Layer 4: Storage & Digital Vault');

    // 4. Verify authentic Knowledge Vault Platform pillars are present
    expect(textContent).toContain('Live Cosine Similarity Pre-Screening');
    expect(textContent).toContain('Unified Sophisticated Document Reader');
    expect(textContent).toContain('Dean Ratification & MinIO Archival Vault');
  });
});

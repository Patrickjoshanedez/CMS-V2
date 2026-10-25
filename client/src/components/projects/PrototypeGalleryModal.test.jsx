import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PrototypeGalleryModal from './PrototypeGalleryModal';

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: vi.fn(),
  },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('PrototypeGalleryModal', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it('renders the accessible gallery dialog and archived image preview control', () => {
    const onClose = vi.fn();
    act(() => {
      root.render(
        <PrototypeGalleryModal
          open
          onClose={onClose}
          project={{
            title: 'Synthetic Archive Gallery Project',
            githubRepoUrl: 'https://github.com/example/cms-v2-seeded-e2e',
            prototypes: [
              {
                title: 'Synthetic Architecture Diagram',
                type: 'image',
                storageKey: 'archive/diagram.png',
                signedUrl: 'https://storage.example.test/signed/diagram.png',
              },
            ],
          }}
        />,
      );
    });

    const gallery = document.body.querySelector('[role="dialog"]');
    expect(gallery?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(gallery?.textContent).toContain('Synthetic Archive Gallery Project');
    expect(
      gallery?.querySelector('button[aria-label="Preview image: Synthetic Architecture Diagram"]'),
    ).toBeTruthy();
    expect(gallery?.querySelector('img')?.getAttribute('src')).toBe(
      'https://storage.example.test/signed/diagram.png',
    );
    expect(gallery?.textContent).toContain('https://github.com/example/cms-v2-seeded-e2e');

    act(() => {
      gallery.querySelector('button[aria-label="Close prototype gallery"]').click();
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens the image preview in a nested dialog and dismisses it independently', () => {
    act(() => {
      root.render(
        <PrototypeGalleryModal
          open
          onClose={() => {}}
          project={{
            title: 'Synthetic Gallery Project',
            prototypes: [
              {
                title: 'System Architecture',
                type: 'image',
                signedUrl: 'https://storage.example.test/signed/architecture.png',
              },
            ],
          }}
        />,
      );
    });

    act(() => {
      document.body
        .querySelector('button[aria-label="Preview image: System Architecture"]')
        .click();
    });

    const dialogs = document.body.querySelectorAll('[role="dialog"]');
    expect(dialogs).toHaveLength(2);
    expect(dialogs[1].querySelector('img[alt="System Architecture"]')?.getAttribute('src')).toBe(
      'https://storage.example.test/signed/architecture.png',
    );

    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.body.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });

  it('uses the shared empty state when the project has no uploaded media', () => {
    act(() => {
      root.render(
        <PrototypeGalleryModal open onClose={() => {}} project={{ title: 'Empty Gallery' }} />,
      );
    });

    const gallery = document.body.querySelector('[role="dialog"]');
    expect(gallery?.textContent).toContain('No media assets uploaded');
    expect(gallery?.textContent).toContain('No public GitHub repository linked');
  });
});

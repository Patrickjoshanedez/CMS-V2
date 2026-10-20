import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PrototypeGalleryModal from './PrototypeGalleryModal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('PrototypeGalleryModal', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it('renders archived prototype images using their temporary signed URL', () => {
    act(() => {
      root.render(
        <PrototypeGalleryModal
          open
          onClose={() => {}}
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

    expect(container.querySelector('img[alt="Synthetic Architecture Diagram"]')?.getAttribute('src')).toBe(
      'https://storage.example.test/signed/diagram.png',
    );
    expect(container.textContent).toContain('https://github.com/example/cms-v2-seeded-e2e');
  });
});

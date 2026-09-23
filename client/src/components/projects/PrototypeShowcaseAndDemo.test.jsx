import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PrototypeShowcaseAndDemo from './PrototypeShowcaseAndDemo';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockMutateDemo = vi.fn().mockResolvedValue({});
const mockAddMedia = vi.fn().mockResolvedValue({});
const mockAddLink = vi.fn().mockResolvedValue({});
const mockRemoveProto = vi.fn();

vi.mock('@/hooks/useProjects', () => ({
  useUpdateDemoVideoUrl: () => ({
    mutateAsync: mockMutateDemo,
    isPending: false,
  }),
  usePrototypes: () => ({
    data: [
      {
        _id: 'proto-1',
        title: 'Figma System Navigation Prototype',
        type: 'link',
        url: 'https://figma.com/proto/test',
        description: 'Interactive UI click dummy',
      },
      {
        _id: 'proto-2',
        title: 'Dashboard Mobile Screen',
        type: 'image',
        url: 'https://example.com/screenshot.png',
        description: 'Captured on physical Android device',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useAddPrototypeMedia: () => ({
    mutateAsync: mockAddMedia,
    isPending: false,
  }),
  useAddPrototypeLink: () => ({
    mutateAsync: mockAddLink,
    isPending: false,
  }),
  useRemovePrototype: () => ({
    mutate: mockRemoveProto,
    isPending: false,
  }),
}));

const mockProject = {
  _id: 'proj-500',
  title: 'BukSU Capstone System',
  demoVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
};

describe('PrototypeShowcaseAndDemo Component Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  const renderComponent = async (props = {}) => {
    await act(async () => {
      root.render(<PrototypeShowcaseAndDemo project={mockProject} {...props} />);
    });
  };

  it('renders both demo video and prototype gallery cards', async () => {
    await renderComponent();

    expect(container.textContent).toContain('System Prototype Demo Video');
    expect(container.textContent).toContain('Prototype Showcase Gallery');
    expect(container.textContent).toContain('Video Submitted');
    expect(container.textContent).toContain('Figma System Navigation Prototype');
    expect(container.textContent).toContain('Dashboard Mobile Screen');
  });

  it('renders embed iframe for YouTube demo video', async () => {
    await renderComponent();

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('allows clicking Add Prototype Item button to open the form', async () => {
    await renderComponent();

    const addBtn = container.querySelector('[data-testid="add-prototype-showcase-btn"]');
    expect(addBtn).toBeTruthy();

    await act(async () => {
      addBtn.click();
    });

    expect(container.textContent).toContain('Add Prototype Showcase Item');
    expect(container.textContent).toContain('File Upload');
    expect(container.textContent).toContain('External Link');
  });
});

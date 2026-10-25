import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PrototypeShowcaseAndDemo from './PrototypeShowcaseAndDemo';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const mockToastError = vi.hoisted(() => vi.fn());
const mockMutateDemo = vi.fn().mockResolvedValue({});
const mockAddMedia = vi.fn().mockResolvedValue({});
const mockAddLink = vi.fn().mockResolvedValue({});
const mockRemoveProto = vi.fn();

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: vi.fn() },
}));

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

  it('rejects an empty demo URL without calling the update service', async () => {
    await renderComponent({ project: { ...mockProject, demoVideoUrl: null } });
    const saveButton = container.querySelector('[data-testid="save-demo-video-btn"]');

    await act(async () => {
      saveButton.click();
    });

    expect(mockMutateDemo).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith('Demo video link cannot be empty');
  });

  it('rejects malformed demo URLs before calling the update service', async () => {
    await renderComponent({ project: { ...mockProject, demoVideoUrl: null } });
    const input = container.querySelector('[data-testid="demo-video-url-input"]');
    const saveButton = container.querySelector('[data-testid="save-demo-video-btn"]');

    await act(async () => {
      setInputValue(input, 'not-a-url');
      saveButton.click();
    });

    expect(mockMutateDemo).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith('Enter a valid http or https demo video link.');
  });

  it('accepts a valid HTTPS demo URL and surfaces API validation messages', async () => {
    await renderComponent({ project: { ...mockProject, demoVideoUrl: null } });
    const input = container.querySelector('[data-testid="demo-video-url-input"]');
    const saveButton = container.querySelector('[data-testid="save-demo-video-btn"]');

    await act(async () => {
      setInputValue(input, 'https://vimeo.com/123456789');
      saveButton.click();
    });

    expect(mockMutateDemo).toHaveBeenCalledWith({
      projectId: 'proj-500',
      demoVideoUrl: 'https://vimeo.com/123456789',
    });

    mockMutateDemo.mockRejectedValueOnce({
      response: { data: { message: 'URL is not allowed.' } },
    });
    await act(async () => {
      saveButton.click();
    });

    expect(mockToastError).toHaveBeenCalledWith('URL is not allowed.');
  });

  it('allows clicking Add Prototype Item button to open the form', async () => {
    await renderComponent();

    const addBtn = container.querySelector('[data-testid="add-prototype-showcase-btn"]');
    expect(addBtn).toBeTruthy();

    await act(async () => {
      addBtn.click();
    });

    expect(document.body.textContent).toContain('Add Prototype Showcase Item');
    expect(document.body.textContent).toContain('File Upload');
    expect(document.body.textContent).toContain('External Link');
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('requires confirmation before removing a prototype item', async () => {
    await renderComponent();

    const deleteButton = container.querySelector(
      '[aria-label="Delete Figma System Navigation Prototype"]',
    );
    expect(deleteButton).toBeTruthy();
    await act(async () => deleteButton.click());

    expect(mockRemoveProto).not.toHaveBeenCalled();
    expect(document.body.querySelector('[role="alertdialog"]')).toBeTruthy();

    const confirmButton = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent.trim() === 'Delete item',
    );
    await act(async () => confirmButton.click());

    expect(mockRemoveProto).toHaveBeenCalledWith(
      { projectId: 'proj-500', prototypeId: 'proto-1' },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });
});

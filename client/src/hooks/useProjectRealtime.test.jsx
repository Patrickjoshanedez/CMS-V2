import React, { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useProjectRealtime from './useProjectRealtime';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockListeners = {};
const mockSocket = {
  connected: true,
  emit: vi.fn(),
  on: vi.fn((event, cb) => {
    mockListeners[event] = cb;
  }),
  off: vi.fn((event) => {
    delete mockListeners[event];
  }),
};

vi.mock('../services/socket', () => ({
  connectSocket: () => mockSocket,
  getSocket: () => mockSocket,
}));

describe('useProjectRealtime Hook', () => {
  let container;
  let root;
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockListeners).forEach((k) => delete mockListeners[k]);
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  function TestHarness({ projectId }) {
    const { isConnected } = useProjectRealtime(projectId);
    return <div data-testid="status">{isConnected ? 'connected' : 'disconnected'}</div>;
  }

  it('joins project room on mount and leaves on unmount', () => {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness projectId="proj-123" />
        </QueryClientProvider>,
      );
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('join:project', 'proj-123');

    act(() => {
      root.unmount();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('leave:project', 'proj-123');
  });

  it('invalidates evaluation and project queries on defense:score_updated', () => {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness projectId="proj-123" />
        </QueryClientProvider>,
      );
    });

    expect(mockListeners['defense:score_updated']).toBeDefined();

    act(() => {
      mockListeners['defense:score_updated']({ projectId: 'proj-123', totalScore: 88 });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['evaluations'],
    });
  });

  it('invalidates minutes and adm queries on defense:minutes_updated', () => {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness projectId="proj-123" />
        </QueryClientProvider>,
      );
    });

    expect(mockListeners['defense:minutes_updated']).toBeDefined();

    act(() => {
      mockListeners['defense:minutes_updated']({ projectId: 'proj-123' });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['defense-minutes', 'proj-123'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['adm', 'proj-123'],
    });
  });
});

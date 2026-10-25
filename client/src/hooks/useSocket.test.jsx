import React, { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { projectKeys } from './useProjects';
import * as socketService from '../services/socket';
import { useAuthStore } from '../stores/authStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useSocket Hook — Real-time Project Invalidation', () => {
  let container;
  let root;
  let queryClient;
  let mockSocket;
  let socketEventHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(queryClient, 'invalidateQueries');

    socketEventHandlers = {};
    mockSocket = {
      on: vi.fn((event, handler) => {
        socketEventHandlers[event] = handler;
      }),
      off: vi.fn((event) => {
        delete socketEventHandlers[event];
      }),
      io: {
        on: vi.fn(),
        off: vi.fn(),
      },
    };

    vi.spyOn(socketService, 'connectSocket').mockReturnValue(mockSocket);
    vi.spyOn(socketService, 'disconnectSocket').mockReturnValue();
    useAuthStore.setState({ isAuthenticated: true });
  });

  function TestHarness() {
    useSocket();
    return <div data-testid="socket-harness">Active</div>;
  }

  it('subscribes to project:updated and invalidates project queries on event receipt', () => {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness />
        </QueryClientProvider>,
      );
    });

    expect(mockSocket.on).toHaveBeenCalledWith('project:updated', expect.any(Function));

    const handleProjectUpdated = socketEventHandlers['project:updated'];
    expect(handleProjectUpdated).toBeDefined();

    // Trigger the real-time project update event with a projectId
    act(() => {
      handleProjectUpdated({
        projectId: '65e000000000000000000042',
        title: 'New Capstone Title',
        action: 'title_updated',
      });
    });

    // Verify all relevant project caches were invalidated
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectKeys.detail('65e000000000000000000042'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectKeys.lists(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectKeys.my(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectKeys.all,
    });
  });

  it('cleans up project:updated listener on unmount', () => {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness />
        </QueryClientProvider>,
      );
    });

    expect(socketEventHandlers['project:updated']).toBeDefined();

    act(() => {
      root.unmount();
    });

    expect(mockSocket.off).toHaveBeenCalledWith('project:updated', expect.any(Function));
  });
});

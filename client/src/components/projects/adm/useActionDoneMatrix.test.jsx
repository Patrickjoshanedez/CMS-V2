import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect } from 'vitest';
import { useActionDoneMatrix } from './useActionDoneMatrix.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderHook(hookFn, { initialProps } = {}) {
  let current;
  let props = initialProps;
  const container = document.createElement('div');
  const root = createRoot(container);

  function TestHarness(p) {
    current = hookFn(p);
    return null;
  }

  act(() => {
    root.render(<TestHarness {...props} />);
  });

  return {
    result: {
      get current() {
        return current;
      },
    },
    rerender: (newProps) => {
      props = newProps;
      act(() => {
        root.render(<TestHarness {...props} />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

describe('useActionDoneMatrix', () => {
  const mockProject = {
    _id: 'proj1',
    capstonePhase: 1,
    admSignatures: {},
  };

  it('should initialize with default milestone and view tab', () => {
    const { result } = renderHook(() =>
      useActionDoneMatrix({ project: mockProject, initialMilestone: 'CAPSTONE_1' }),
    );
    expect(result.current.activeViewTab).toBe('adm');
    expect(result.current.selectedMilestone).toBe('CAPSTONE_1');
    expect(result.current.rows).toEqual([]);
  });

  it('should switch selected milestone and update state', () => {
    const { result } = renderHook(() => useActionDoneMatrix({ project: mockProject }));
    act(() => {
      result.current.setSelectedMilestone('CAPSTONE_2');
    });
    expect(result.current.selectedMilestone).toBe('CAPSTONE_2');
  });

  it('should allow switching between adm and minutes tabs', () => {
    const { result } = renderHook(() => useActionDoneMatrix({ project: mockProject }));
    act(() => {
      result.current.setActiveViewTab('minutes');
    });
    expect(result.current.activeViewTab).toBe('minutes');
  });
});

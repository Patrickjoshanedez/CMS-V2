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

  it('keeps secretary endorsement blocked until every addressed row is verified', () => {
    const projectWithUnverifiedRow = {
      _id: 'proj1',
      capstonePhase: 2,
      admSignatures: {},
      actionDoneMatrix: [
        { _id: 'r1', panelName: 'Panelist', status: 'addressed', milestone: 'CAPSTONE_2' },
      ],
    };
    const { result, rerender } = renderHook((props) => useActionDoneMatrix(props), {
      initialProps: { project: projectWithUnverifiedRow, initialMilestone: 'CAPSTONE_2' },
    });

    expect(result.current.allRowsAddressed).toBe(true);
    expect(result.current.allRowsVerified).toBe(false);

    const verifiedProject = {
      ...projectWithUnverifiedRow,
      actionDoneMatrix: [{ ...projectWithUnverifiedRow.actionDoneMatrix[0], status: 'verified' }],
    };
    rerender({ project: verifiedProject, initialMilestone: 'CAPSTONE_2' });

    expect(result.current.allRowsAddressed).toBe(true);
    expect(result.current.allRowsVerified).toBe(true);
  });

  it('removes all ADM write permissions from an archived project', () => {
    const archivedProject = {
      ...mockProject,
      isArchived: true,
      secretaryId: 'secretary-1',
      adviserId: 'adviser-1',
    };
    const { result } = renderHook(() =>
      useActionDoneMatrix({
        project: archivedProject,
        user: { _id: 'secretary-1', role: 'faculty' },
        isFaculty: true,
        isStudent: true,
      }),
    );

    expect(result.current.canUploadMinutes).toBe(false);
    expect(result.current.canEndorse).toBe(false);
    expect(result.current.canAddRow).toBe(false);
    expect(result.current.canManageReviewType).toBe(false);
    expect(result.current.isUserAdviser).toBe(false);
    expect(result.current.isUserSecretary).toBe(false);
  });

  it('should filter displayedRows according to the selected milestone (CAPSTONE_1, CAPSTONE_2, ALL)', () => {
    const projectWithRows = {
      _id: 'proj1',
      capstonePhase: 1,
      admSignatures: {},
      actionDoneMatrix: [
        {
          _id: 'r1',
          panelName: 'Dr. Smith',
          suggestion: 'Improve methodology',
          actionDone: 'Updated section 3',
          milestone: 'CAPSTONE_1',
        },
        {
          _id: 'r2',
          panelName: 'Prof. Jones',
          suggestion: 'Refine analysis',
          actionDone: 'Added statistical tests',
          milestone: 'CAPSTONE_2',
        },
      ],
    };

    const { result } = renderHook(() =>
      useActionDoneMatrix({ project: projectWithRows, initialMilestone: 'CAPSTONE_1' }),
    );

    // Initial milestone CAPSTONE_1: only r1
    expect(result.current.selectedMilestone).toBe('CAPSTONE_1');
    expect(result.current.displayedRows).toHaveLength(1);
    expect(result.current.displayedRows[0].panelName).toBe('Dr. Smith');
    expect(result.current.displayedRows[0].milestone).toBe('CAPSTONE_1');

    // Switch to CAPSTONE_2: only r2
    act(() => {
      result.current.setSelectedMilestone('CAPSTONE_2');
    });
    expect(result.current.selectedMilestone).toBe('CAPSTONE_2');
    expect(result.current.displayedRows).toHaveLength(1);
    expect(result.current.displayedRows[0].panelName).toBe('Prof. Jones');
    expect(result.current.displayedRows[0].milestone).toBe('CAPSTONE_2');

    // Switch to ALL: both rows
    act(() => {
      result.current.setSelectedMilestone('ALL');
    });
    expect(result.current.selectedMilestone).toBe('ALL');
    expect(result.current.displayedRows).toHaveLength(2);
    expect(result.current.displayedRows.map((r) => r.milestone)).toEqual([
      'CAPSTONE_1',
      'CAPSTONE_2',
    ]);
  });
});

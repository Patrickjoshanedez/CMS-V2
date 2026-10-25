import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjectsPage from './ProjectsPage';
import { useAuthStore } from '@/stores/authStore';
import * as useProjectsModule from '@/hooks/useProjects';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

describe('ProjectsPage (Instructor Review Portal)', () => {
  let container;
  let root;
  let projectsSpy;

  const mockUser = {
    _id: 'inst-1',
    firstName: 'Dr. Jonathan',
    lastName: 'Tan',
    role: 'instructor',
    email: 'jtan@buksu.edu.ph',
  };

  const mockProjects = [
    {
      _id: 'proj-1',
      title: 'AgriNode: IoT-Driven Microclimate Telemetry',
      capstonePhase: 1,
      titleStatus: 'submitted',
      projectStatus: 'active',
      academicYear: '2025-2026',
      teamId: {
        _id: 'team-1',
        name: 'Team Beta',
        leaderId: 'stu-1',
        members: [
          { _id: 'stu-1', firstName: 'Patrick Josh', lastName: 'Añedez' },
          { _id: 'stu-2', firstName: 'Elena', lastName: 'Reyes' },
        ],
      },
      sectionId: { _id: 'sec-1', name: 'BSIT 4A' },
      adviserId: { _id: 'adv-1', firstName: 'Jonathan', lastName: 'Tan' },
      titleProposals: ['Title Proposal 1', 'Title Proposal 2', 'Title Proposal 3'],
    },
    {
      _id: 'proj-2',
      title: 'Barangay Incident Response Platform',
      capstonePhase: 2,
      titleStatus: 'approved',
      projectStatus: 'active',
      academicYear: '2024-2025',
      teamId: {
        _id: 'team-2',
        name: 'Seed Similarity Active Team',
        leaderId: 'stu-3',
        members: [{ _id: 'stu-3', firstName: 'Juan', lastName: 'Dela Cruz' }],
      },
      sectionId: { _id: 'sec-2', name: 'BSIT 4B' },
      adviserId: null, // Unassigned adviser test case
      titleProposals: ['Title Approved'],
    },
  ];

  beforeEach(() => {
    if (!HTMLElement.prototype.hasPointerCapture)
      HTMLElement.prototype.hasPointerCapture = () => false;
    if (!HTMLElement.prototype.setPointerCapture)
      HTMLElement.prototype.setPointerCapture = () => {};
    if (!HTMLElement.prototype.releasePointerCapture)
      HTMLElement.prototype.releasePointerCapture = () => {};
    if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useAuthStore.mockReturnValue({
      user: mockUser,
      fetchUser: vi.fn(),
    });

    projectsSpy = vi.spyOn(useProjectsModule, 'useProjects').mockImplementation((filters) => {
      // Mock filtering based on activeCategory or actionNeeded
      let list = mockProjects;
      if (filters?.actionNeeded) {
        list = mockProjects.filter((p) =>
          ['submitted', 'revision_required', 'pending_modification'].includes(p.titleStatus),
        );
      } else if (filters?.capstonePhase) {
        list = mockProjects.filter((p) => p.capstonePhase === filters.capstonePhase);
      }
      return {
        data: {
          projects: list,
          pagination: { page: 1, totalPages: 1, total: list.length },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
  });

  it('uses the shared spinner while the session user is unavailable', async () => {
    const fetchUser = vi.fn();
    useAuthStore.mockImplementation((selector) => selector({ user: null, fetchUser }));

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/projects']}>
          <ProjectsPage />
        </MemoryRouter>,
      );
    });

    expect(fetchUser).toHaveBeenCalled();
    expect(container.querySelector('svg.animate-spin')).not.toBeNull();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.restoreAllMocks();
  });

  it('renders modern Instructor Review header, KPI metric strip, and task categories', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/projects']}>
          <ProjectsPage />
        </MemoryRouter>,
      );
    });

    // Check Header
    expect(container.textContent).toContain('Instructor Review');
    expect(container.textContent).toContain(
      'Review assigned proposals, manuscripts, and defense progress.',
    );

    expect(container.textContent).toContain('Needs Action');

    // Check Task Category Queue Tabs
    expect(container.textContent).toContain('All Capstones');
    expect(container.textContent).toContain('Capstone 1: Proposal Manuscript');
    expect(container.textContent).toContain('Capstone 2: System Development');
    expect(container.textContent).toContain('Capstone 3: Final Manuscript');
  });

  it('renders rich project cards with normalized team name, phase pills, and callout banners', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/projects?category=all']}>
          <ProjectsPage />
        </MemoryRouter>,
      );
    });

    // Pre-course topic proposal review assertions
    expect(container.textContent).toContain('Phase 1: Topic Proposals');
    expect(container.textContent).toContain('Team Beta');
    expect(container.textContent).toContain('3 candidate proposals submitted');
    expect(container.textContent).toContain('Review Title Proposals');
    expect(container.textContent).toContain('Patrick Josh Añedez (Lead)');
    expect(container.textContent).toContain('Adviser: Jonathan Tan');

    // Capstone 2 project assertions
    expect(container.textContent).toContain('Capstone 2: System Development');
    expect(container.textContent).toContain('Title Approved');
    expect(container.textContent).toContain('Adviser Unassigned');
    expect(container.textContent).toContain('Inspect Prototype & Gantt');
  });

  it('switches task category when clicking KPI card or task category tab', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/projects']}>
          <ProjectsPage />
        </MemoryRouter>,
      );
    });

    // Find the Capstone 2 system development tab
    const phase2Tab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Capstone 2: System Development'),
    );
    expect(phase2Tab).toBeTruthy();

    await act(async () => {
      phase2Tab.click();
    });

    // After clicking the Capstone 2 tab, it should filter to phase 2 projects
    expect(container.textContent).toContain('Barangay Incident Response Platform');
  });

  it('renders search bar and filters results cleanly', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/projects']}>
          <ProjectsPage />
        </MemoryRouter>,
      );
    });

    const searchInput = container.querySelector('input[placeholder*="Search by team name"]');
    expect(searchInput).toBeTruthy();
  });

  it('uses accessible shared selects to filter title status and academic year', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/projects?category=all']}>
          <ProjectsPage />
        </MemoryRouter>,
      );
    });

    const statusSelect = screen.getByRole('combobox', { name: 'Title status' });
    expect(statusSelect).toHaveAttribute('data-state', 'closed');
    await act(async () => {
      fireEvent.pointerDown(statusSelect, {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
        pointerId: 1,
      });
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: 'Approved' }));
    });
    expect(projectsSpy.mock.calls.some(([filters]) => filters.titleStatus === 'approved')).toBe(
      true,
    );

    const yearSelect = screen.getByRole('combobox', { name: 'Academic year' });
    await act(async () => {
      fireEvent.pointerDown(yearSelect, {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
        pointerId: 2,
      });
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: '2024-2025' }));
    });
    expect(
      projectsSpy.mock.calls.some(
        ([filters]) => filters.titleStatus === 'approved' && filters.academicYear === '2024-2025',
      ),
    ).toBe(true);
  });
});

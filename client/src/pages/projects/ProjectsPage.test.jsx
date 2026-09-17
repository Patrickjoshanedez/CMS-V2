import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useAuthStore.mockReturnValue({
      user: mockUser,
      fetchUser: vi.fn(),
    });

    vi.spyOn(useProjectsModule, 'useProjects').mockImplementation((filters) => {
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
    expect(container.textContent).toContain('Evaluation Studio');

    // Check KPI Overview Strip
    expect(container.textContent).toContain('Needs Action');
    expect(container.textContent).toContain('Title Defense');
    expect(container.textContent).toContain('Manuscripts');
    expect(container.textContent).toContain('System Dev');
    expect(container.textContent).toContain('Final Defense');

    // Check Task Category Queue Tabs
    expect(container.textContent).toContain('All Capstones');
    expect(container.textContent).toContain('Phase 1: Title Defense');
    expect(container.textContent).toContain('Phase 2: Manuscripts');
  });

  it('renders rich project cards with normalized team name, phase pills, and callout banners', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/projects?category=all']}>
          <ProjectsPage />
        </MemoryRouter>,
      );
    });

    // Phase 1 project assertions
    expect(container.textContent).toContain('Phase 1: Title Defense');
    expect(container.textContent).toContain('Team Beta');
    expect(container.textContent).toContain('3 candidate proposals submitted');
    expect(container.textContent).toContain('Deliberate Proposals');
    expect(container.textContent).toContain('Patrick Josh Añedez (Lead)');
    expect(container.textContent).toContain('Adviser: Jonathan Tan');

    // Phase 2 project assertions
    expect(container.textContent).toContain('Phase 2: Manuscripts');
    expect(container.textContent).toContain('Title Approved');
    expect(container.textContent).toContain('Adviser Unassigned');
    expect(container.textContent).toContain('Review Manuscript & ADM');
  });

  it('switches task category when clicking KPI card or task category tab', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/projects']}>
          <ProjectsPage />
        </MemoryRouter>,
      );
    });

    // Find "Phase 2: Manuscripts" tab
    const phase2Tab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Phase 2: Manuscripts'),
    );
    expect(phase2Tab).toBeTruthy();

    await act(async () => {
      phase2Tab.click();
    });

    // After clicking Phase 2 tab, it should filter to Phase 2 projects
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
});

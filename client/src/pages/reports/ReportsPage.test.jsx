import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ROLES } from '@cms/shared';
import ReportsPage from './ReportsPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockUseProjectReports = vi.fn();
const mockUseAcademicYears = vi.fn();
const mockUseSections = vi.fn();
const mockExportCSV = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { _id: 'inst-1', role: ROLES.INSTRUCTOR, firstName: 'Instructor', lastName: 'User' },
  }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjectReports: (...args) => mockUseProjectReports(...args),
}));

vi.mock('@/hooks/useAcademics', () => ({
  useAcademicYears: (...args) => mockUseAcademicYears(...args),
  useSections: (...args) => mockUseSections(...args),
}));

vi.mock('@/utils/exportReportsToCSV', () => ({
  exportReportsToCSV: (...args) => mockExportCSV(...args),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

// Mock Recharts responsive container to render in tests
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('ReportsPage', () => {
  let container;
  let root;

  const mockReportData = {
    summary: {
      totalCapstonesArchived: 42,
      mostActiveYear: '2025-2026',
      totalAuthorsStudents: 128,
      flaggedByPlagiarism: 3,
      yieldRate: 94,
      yieldCompleted: 42,
      yieldTotal: 45,
      sampleDenominator: '42/45 Teams Completed',
      totalEnrolledStudents: 128,
      totalTeams: 45,
      activeSectionsCount: 4,
    },
    milestoneDistribution: [
      {
        milestone: 'Capstone 1 (Proposal)',
        students: 45,
        teams: 15,
        phase: 'Title Defense & Proposals',
      },
      {
        milestone: 'Capstone 2 (Development)',
        students: 41,
        teams: 14,
        phase: 'Ch 1-3 Manuscript & Prototype',
      },
      {
        milestone: 'Capstone 3 (Final Defense)',
        students: 42,
        teams: 14,
        phase: 'Final Oral Defense & Archival',
      },
    ],
    sectionAllocation: [
      { section: 'BSIT-4A', enrolled: 32, assigned: 32, unassigned: 0, teams: 8, ratio: '4.0' },
      { section: 'BSIT-4B', enrolled: 32, assigned: 32, unassigned: 0, teams: 8, ratio: '4.0' },
      { section: 'BSIT-4C', enrolled: 32, assigned: 32, unassigned: 0, teams: 8, ratio: '4.0' },
      { section: 'BSIT-4D', enrolled: 32, assigned: 32, unassigned: 0, teams: 8, ratio: '4.0' },
    ],
    auditWarnings: [],
    trend: [
      { year: '2023-2024', count: 18 },
      { year: '2024-2025', count: 26 },
      { year: '2025-2026', count: 42 },
    ],
    categoryBreakdown: [
      { category: 'AI & Data Science', count: 12 },
      { category: 'Web & Mobile Systems', count: 18 },
      { category: 'IoT & Embedded', count: 12 },
    ],
    table: {
      rows: [
        {
          _id: 'rep-1',
          title: 'AgroSense Smart IoT Soil Moisture Monitoring',
          authors: [{ fullName: 'Megumi Fushiguro' }],
          adviser: { _id: 'adv-1', fullName: 'Dr. Steven Joe Bautista' },
          academicYear: '2025-2026',
          course: { label: 'BSIT' },
          status: 'archived',
          keywords: ['IoT', 'Soil Moisture', 'Agriculture'],
        },
        {
          _id: 'rep-2',
          title: 'MediTrack Smart Patient Triage System',
          authors: [{ fullName: 'Yuji Itadori' }],
          adviser: { _id: 'adv-2', fullName: 'Prof. Leon Mentor' },
          academicYear: '2025-2026',
          course: { label: 'BSIT' },
          status: 'active',
          keywords: ['Health', 'Triage', 'AI'],
        },
      ],
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    },
    filterOptions: {
      academicYears: ['2025-2026', '2024-2025'],
      authors: ['Megumi Fushiguro', 'Yuji Itadori'],
      advisers: [
        { _id: 'adv-1', fullName: 'Dr. Steven Joe Bautista' },
        { _id: 'adv-2', fullName: 'Prof. Leon Mentor' },
      ],
      programs: [{ _id: 'prog-1', label: 'BSIT' }],
      keywords: ['IoT', 'AI', 'Health'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockUseAcademicYears.mockReturnValue({
      data: ['2025-2026', '2024-2025', '2023-2024'],
      isLoading: false,
    });

    mockUseSections.mockReturnValue({
      data: [
        { _id: 'sec-1', name: 'BSIT-4A', academicYear: '2025-2026' },
        { _id: 'sec-2', name: 'BSIT-4B', academicYear: '2025-2026' },
        { _id: 'sec-3', name: 'BSIT-4C', academicYear: '2025-2026' },
        { _id: 'sec-4', name: 'BSIT-4D', academicYear: '2025-2026' },
      ],
      isLoading: false,
    });

    mockUseProjectReports.mockReturnValue({
      data: mockReportData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  const renderComponent = () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('renders executive header and automatically populates 4-card cohort KPI ribbon on mount without blank state', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Capstone Analytics & Reports');
    expect(container.textContent).toContain('Institutional Command');

    // 4 KPI metrics from CohortKPIRibbon (Milestone card removed)
    expect(container.textContent).toContain('Enrolled Proponents');
    expect(container.textContent).toContain('128');
    expect(container.textContent).toContain('Capstone Teams');
    expect(container.textContent).toContain('45');
    expect(container.textContent).toContain('Academic Sections');
    expect(container.textContent).toContain('ADM Yield Rate');
    expect(container.textContent).toContain('94%');
    expect(container.textContent).toContain('42/45 Teams Completed');

    // Asserts static milestone card was removed from the KPI ribbon
    expect(container.textContent).not.toContain('Current Milestone');

    // Asserts blank chore state is NOT present
    expect(container.textContent).not.toContain('Ready to generate a report');
  });

  it('renders all visualization studios including dynamic Milestone Progression and Allocation Ratio studios', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Milestone Progression & Headcount Distribution');
    expect(container.textContent).toContain('Team-to-Member Allocation Ratio');
    expect(container.textContent).toContain('Assigned vs unassigned/orphan proponents');
    expect(container.textContent).toContain('IT Specialization & Domain Breakdown');
    expect(container.textContent).toContain('Faculty Workload Studio');
    expect(container.textContent).toContain('Annual Archival & Completion Velocity');
    expect(container.textContent).toContain('Plagiarism Risk & Originality Matrix');
  });

  it('renders detailed capstone records table with clickable project links and action buttons', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Detailed Capstone Records');
    expect(container.textContent).toContain('AgroSense Smart IoT Soil Moisture Monitoring');
    expect(container.textContent).toContain('Megumi Fushiguro');
    expect(container.textContent).toContain('Dr. Steven Joe Bautista');
    expect(container.textContent).toContain('MediTrack Smart Patient Triage System');

    // Asserts archived project links to /archive/document/:id
    const links = Array.from(container.querySelectorAll('a'));
    const agroSenseLink = links.find((a) =>
      a.textContent.includes('AgroSense Smart IoT Soil Moisture Monitoring'),
    );
    expect(agroSenseLink).toBeTruthy();
    expect(agroSenseLink.getAttribute('href')).toBe('/archive/document/rep-1');

    // Asserts active project links to /projects/:id
    const mediTrackLink = links.find((a) =>
      a.textContent.includes('MediTrack Smart Patient Triage System'),
    );
    expect(mediTrackLink).toBeTruthy();
    expect(mediTrackLink.getAttribute('href')).toBe('/projects/rep-2');

    // Asserts View action links exist
    const viewLinks = links.filter((a) => a.textContent.includes('View'));
    expect(viewLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('triggers enterprise CSV export when clicking Export CSV button', async () => {
    await act(async () => {
      renderComponent();
    });

    const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Export CSV'),
    );
    expect(exportBtn).toBeTruthy();

    await act(async () => {
      exportBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockExportCSV).toHaveBeenCalledWith(
      mockReportData.table.rows,
      expect.objectContaining({
        academicYear: '2025-2026',
        generatedBy: 'Instructor User',
      }),
    );
  });

  it('triggers window.print when clicking Print button', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    await act(async () => {
      renderComponent();
    });

    const printBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Print' || b.textContent.includes('Print'),
    );
    expect(printBtn).toBeTruthy();

    await act(async () => {
      printBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('renders automated audit warning banners when roster mismatch or low cohort density is detected', async () => {
    mockUseProjectReports.mockReturnValue({
      data: {
        ...mockReportData,
        auditWarnings: [
          {
            id: 'roster-mismatch',
            badge: 'Roster Checksum Discrepancy',
            message: 'Section rosters sum (3) does not equal total enrolled proponents count (4).',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Roster Checksum Discrepancy');
    expect(container.textContent).toContain(
      'Section rosters sum (3) does not equal total enrolled proponents count (4).',
    );
  });

  it('renders sample-size aware badge (Sample N=1) instead of Institutional High for small sample sizes', async () => {
    mockUseProjectReports.mockReturnValue({
      data: {
        ...mockReportData,
        summary: {
          ...mockReportData.summary,
          totalCapstonesArchived: 1,
          totalAuthorsStudents: 4,
          totalTeams: 1,
          yieldRate: 100,
          yieldCompleted: 1,
          yieldTotal: 1,
          sampleDenominator: '1/1 Teams Completed',
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('1/1 Teams Completed');
    expect(container.textContent).toContain('Sample N=1');
  });

  it('opens advanced query studio drawer when clicking Filters button', async () => {
    await act(async () => {
      renderComponent();
    });

    const filterBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Filters'),
    );
    expect(filterBtn).toBeTruthy();

    await act(async () => {
      filterBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Advanced Query Studio');
    expect(container.textContent).toContain('Project Title Query');
    expect(container.textContent).toContain('Degree Program');
  });

  it('renders skeleton placeholders in CohortKPIRibbon when loading is active', async () => {
    mockUseProjectReports.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    await act(async () => {
      renderComponent();
    });

    const kpiRibbon = container.querySelector('[data-testid="cohort-kpi-ribbon"]');
    expect(kpiRibbon).toBeTruthy();
    const skeletons = kpiRibbon.querySelectorAll('.cms-skeleton-shimmer');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
    expect(kpiRibbon.textContent).not.toContain('...');
  });

  it('renders authentic empty states without synthetic mock data fallbacks when datasets are empty', async () => {
    mockUseProjectReports.mockReturnValue({
      data: {
        ...mockReportData,
        summary: {
          ...mockReportData.summary,
          totalCapstonesArchived: 0,
        },
        categoryBreakdown: [],
        trend: [],
        filterOptions: {
          ...mockReportData.filterOptions,
          advisers: [],
        },
        table: {
          rows: [],
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    await act(async () => {
      renderComponent();
    });

    // Should NOT contain hardcoded fake faculty names
    expect(container.textContent).not.toContain('Bautista, S.');
    expect(container.textContent).not.toContain('Mentor, L.');
    expect(container.textContent).not.toContain('Villanueva, R.');

    // Should render authentic empty state message in studios
    expect(container.textContent).toContain('No aggregate records found');
    expect(container.textContent).toContain('No capstone records found');
  });

  it('properly formats singular vs plural record counts (grammatical concordance)', async () => {
    mockUseProjectReports.mockReturnValue({
      data: {
        ...mockReportData,
        table: {
          rows: [mockReportData.table.rows[0]],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    await act(async () => {
      renderComponent();
    });

    // Asserts singular "1 record" is used instead of "1 records"
    expect(container.textContent).toContain('Showing 1 to 1 of 1 record');
    expect(container.textContent).not.toContain('1 records');
  });
});

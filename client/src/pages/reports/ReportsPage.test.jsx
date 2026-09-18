import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    },
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
        <ReportsPage />
      </QueryClientProvider>,
    );

  it('renders executive header and automatically populates cohort KPI ribbon on mount without blank state', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Capstone Analytics & Reports');
    expect(container.textContent).toContain('Institutional Command');

    // 5 KPI metrics from CohortKPIRibbon
    expect(container.textContent).toContain('Enrolled Proponents');
    expect(container.textContent).toContain('128');
    expect(container.textContent).toContain('Capstone Teams');
    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('Academic Sections');
    expect(container.textContent).toContain('ADM Yield Rate');
    expect(container.textContent).toContain('94%');

    // Asserts blank chore state is NOT present
    expect(container.textContent).not.toContain('Ready to generate a report');
  });

  it('renders all 4 visualization studios (Specialization, Workload, Trend, Plagiarism)', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('IT Specialization & Domain Breakdown');
    expect(container.textContent).toContain('Faculty Workload Studio');
    expect(container.textContent).toContain('Annual Archival & Completion Velocity');
    expect(container.textContent).toContain('Plagiarism Risk & Originality Matrix');
  });

  it('renders detailed capstone records table with project data', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Detailed Capstone Records');
    expect(container.textContent).toContain('AgroSense Smart IoT Soil Moisture Monitoring');
    expect(container.textContent).toContain('Megumi Fushiguro');
    expect(container.textContent).toContain('Dr. Steven Joe Bautista');
    expect(container.textContent).toContain('MediTrack Smart Patient Triage System');
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
});

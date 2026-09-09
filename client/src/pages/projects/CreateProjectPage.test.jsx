import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import CreateProjectPage, { extractProposalsFromProject } from './CreateProjectPage';
import { useAuthStore } from '@/stores/authStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseNavigate = vi.fn();
const mockUseCreateProject = vi.fn();
const mockUseMyTeam = vi.fn();
const mockUseAcademicYears = vi.fn();
const mockUseSections = vi.fn();
const mockSimilarityChecker = vi.fn();
const mockGetCreateProjectDraft = vi.fn();
const mockSaveCreateProjectDraft = vi.fn();
const mockCheckProposalSimilarity = vi.fn();
const mockGetProject = vi.fn();
const mockGetMyProject = vi.fn();
const mockUpdateTitle = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastInfo = vi.fn();
const toastWarning = vi.fn();

const mockUseLocation = vi.fn(() => ({ state: null, pathname: '/project/create', search: '' }));
const mockUseSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);
const mockUseUpdateTitle = vi.fn(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockUseNavigate,
    useLocation: () => mockUseLocation(),
    useSearchParams: () => mockUseSearchParams(),
  };
});

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: (...args) => mockUseCreateProject(...args),
  useUpdateTitle: (...args) => mockUseUpdateTitle(...args),
}));

vi.mock('@/hooks/useTeams', () => ({
  useMyTeam: (...args) => mockUseMyTeam(...args),
}));

vi.mock('@/hooks/useAcademics', () => ({
  useAcademicYears: (...args) => mockUseAcademicYears(...args),
  useSections: (...args) => mockUseSections(...args),
}));

vi.mock('@/components/projects/TitleSimilarityChecker', () => ({
  default: (props) => {
    mockSimilarityChecker(props);
    return <div data-testid="title-similarity-checker">{props.title}</div>;
  },
}));

vi.mock('@/services/authService', () => ({
  projectService: {
    getCreateProjectDraft: (...args) => mockGetCreateProjectDraft(...args),
    saveCreateProjectDraft: (...args) => mockSaveCreateProjectDraft(...args),
    checkProposalSimilarity: (...args) => mockCheckProposalSimilarity(...args),
    getProject: (...args) => mockGetProject(...args),
    getMyProject: (...args) => mockGetMyProject(...args),
    updateTitle: (...args) => mockUpdateTitle(...args),
  },
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
    info: (...args) => toastInfo(...args),
    warning: (...args) => toastWarning(...args),
  },
}));

const mockExportProposalDeckPptx = vi.fn().mockResolvedValue('Proposal_PitchDeck.pptx');
vi.mock('@/utils/exportPptx', () => ({
  exportProposalDeckPptx: (...args) => mockExportProposalDeckPptx(...args),
}));

const makeTeam = (overrides = {}) => ({
  _id: 'team-1',
  isLocked: true,
  academicYear: '2024-2025',
  sectionId: 'section-1',
  members: [
    {
      _id: 'student-1',
      firstName: 'Test',
      middleName: '',
      lastName: 'Student',
      email: 'student@example.com',
    },
  ],
  ...overrides,
});

const makeQueryState = (overrides = {}) => ({
  data: [],
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

const renderPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  act(() => {
    root.render(<CreateProjectPage />);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

describe('CreateProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCreateProjectDraft.mockResolvedValue({
      data: { data: { draft: null, updatedAt: null } },
    });
    mockUseNavigate.mockReturnValue(vi.fn());
    mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseMyTeam.mockReturnValue({ data: makeTeam(), isLoading: false });
    mockUseAcademicYears.mockReturnValue(makeQueryState({ data: ['2024-2025', '2025-2026'] }));
    mockUseSections.mockReturnValue(
      makeQueryState({
        data: [
          {
            _id: 'section-1',
            name: 'A',
            academicYear: '2024-2025',
            courseId: { code: 'BSIT' },
          },
        ],
      }),
    );
  });

  it('restores a saved create-project draft when returning to the page', async () => {
    mockGetCreateProjectDraft.mockResolvedValue({
      data: {
        data: {
          draft: {
            form: {
              academicYear: '2024-2025',
              sectionId: 'section-1',
            },
            titleProposals: [
              {
                title: 'Draft Proposal One',
                pitchDeck: {
                  problemStatement: 'Problem one',
                  proposedSolution: 'Solution one',
                  uniqueContribution: 'Unique one',
                  targetUsers: 'Users one',
                  expectedImpact: 'Impact one',
                },
                capstoneType: ['AI'],
                sdgTags: ['SDG 4: Quality Education'],
              },
              {
                title: 'Draft Proposal Two',
                pitchDeck: {
                  problemStatement: 'Problem two',
                  proposedSolution: 'Solution two',
                  uniqueContribution: 'Unique two',
                  targetUsers: 'Users two',
                  expectedImpact: 'Impact two',
                },
                capstoneType: ['Web Application'],
                sdgTags: ['SDG 9: Industry, Innovation and Infrastructure'],
              },
              {
                title: 'Draft Proposal Three',
                pitchDeck: {
                  problemStatement: 'Problem three',
                  proposedSolution: 'Solution three',
                  uniqueContribution: 'Unique three',
                  targetUsers: 'Users three',
                  expectedImpact: 'Impact three',
                },
                capstoneType: ['IoT'],
                sdgTags: ['SDG 11: Sustainable Cities and Communities'],
              },
            ],
            expandedProposalIndex: 1,
          },
          updatedAt: '2026-04-13T00:00:00Z',
        },
      },
    });

    const view = renderPage();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const restoredTitleInput = view.container.querySelector('input[id="proposal-1-title"]');
    expect(restoredTitleInput).not.toBeNull();
    expect(restoredTitleInput.value).toBe('Draft Proposal Two');
    expect(mockGetCreateProjectDraft).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  it('saves the active proposal draft with the current form state', async () => {
    mockSaveCreateProjectDraft.mockResolvedValue({
      data: { data: { updatedAt: '2026-04-13T00:00:00Z' } },
    });

    const view = renderPage();
    const titleInput = view.container.querySelector('input[id="proposal-0-title"]');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(titleInput, 'Attendance Monitoring System');
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const saveButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Save Draft'),
    );

    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockSaveCreateProjectDraft).toHaveBeenCalledTimes(1);
    expect(mockSaveCreateProjectDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalIndex: 0,
        source: 'manual-proposal-save',
        titleProposals: expect.arrayContaining([
          expect.objectContaining({ title: 'Attendance Monitoring System' }),
        ]),
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith('Proposal 1 draft saved.');

    view.unmount();
  });

  it('uses team context for academic year and section without rendering inputs', async () => {
    const view = renderPage();

    expect(view.container.textContent).toContain(
      'System Note: Automatically using academic year and section.',
    );
    expect(view.container.querySelector('select[name="sectionId"]')).toBeNull();
    expect(
      view.container.querySelector('button[type="button"] span.flex-1.text-left.font-medium'),
    ).toBeNull();

    view.unmount();
  });

  it('renders the similarity checker for the selected proposal title', async () => {
    const view = renderPage();
    const proposalInput = view.container.querySelector('input[id="proposal-0-title"]');

    expect(view.container.querySelector('[data-testid="title-similarity-checker"]')).toBeNull();
    expect(proposalInput).not.toBeNull();

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(proposalInput, 'Attendance Monitoring System');
      proposalInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="title-similarity-checker"]')).not.toBeNull();
    expect(mockSimilarityChecker).toHaveBeenCalled();
    expect(mockSimilarityChecker.mock.calls.at(-1)?.[0]?.title).toBe(
      'Attendance Monitoring System',
    );

    view.unmount();
  });

  it('triggers a toast notification and updates alignment when selecting an SDG via modal', async () => {
    const view = renderPage();
    const sdgBtn = view.container.querySelector('button[id="proposal-0-sdg-btn"]');
    expect(sdgBtn).not.toBeNull();
    expect(view.container.textContent).toContain('SDG 4: Quality Education');

    // Click button to open modal dialog
    await act(async () => {
      sdgBtn.click();
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Select Target UN SDGs');

    // Click on SDG 13 item to toggle it
    const items = dialog.querySelectorAll('.cursor-pointer');
    const sdg13Item = Array.from(items).find((el) => el.textContent.includes('SDG 13'));
    expect(sdg13Item).not.toBeNull();

    await act(async () => {
      sdg13Item.click();
    });

    // Click Apply Selection
    const applyBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Apply Selection'),
    );
    expect(applyBtn).not.toBeNull();

    await act(async () => {
      applyBtn.click();
    });

    expect(toastSuccess).toHaveBeenCalledWith(
      'Target SDGs Updated',
      expect.objectContaining({
        description: expect.stringContaining('linked to Proposal 1'),
      }),
    );
    expect(view.container.textContent).toContain('SDG 13: Climate Action');

    view.unmount();
  });

  it('triggers a toast notification and updates discipline when selecting an IT Field of Discipline via modal', async () => {
    const view = renderPage();
    const disciplineBtn = view.container.querySelector('button[id="proposal-0-discipline-btn"]');
    expect(disciplineBtn).not.toBeNull();
    expect(view.container.textContent).toContain('Software Engineering & Web Applications');

    // Click button to open modal dialog
    await act(async () => {
      disciplineBtn.click();
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Select IT Fields of Discipline');

    // Click on AI/ML item to toggle it
    const items = dialog.querySelectorAll('.cursor-pointer');
    const aiItem = Array.from(items).find((el) =>
      el.textContent.includes('Artificial Intelligence & Machine Learning'),
    );
    expect(aiItem).not.toBeNull();

    await act(async () => {
      aiItem.click();
    });

    // Click Apply Selection
    const applyBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Apply Selection'),
    );
    expect(applyBtn).not.toBeNull();

    await act(async () => {
      applyBtn.click();
    });

    expect(toastSuccess).toHaveBeenCalledWith(
      'IT Disciplines Updated',
      expect.objectContaining({
        description: expect.stringContaining('linked to Proposal 1'),
      }),
    );
    expect(view.container.textContent).toContain('Artificial Intelligence & Machine Learning');

    view.unmount();
  });

  it('allows adding up to 5 candidate proposals and removing non-primary proposals', async () => {
    const view = renderPage();

    // Starts with 1 proposal (Primary)
    expect(view.container.textContent).toContain('Proposal 1 of 1');
    expect(view.container.textContent).toContain('Add Proposal 2');

    // Add proposal 2
    let addBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add Proposal 2'),
    );
    expect(addBtn).not.toBeNull();
    await act(async () => {
      addBtn.click();
    });
    expect(view.container.textContent).toContain('Proposal 2 of 2');

    // Add proposal 3
    addBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add Proposal 3'),
    );
    expect(addBtn).not.toBeNull();
    await act(async () => {
      addBtn.click();
    });
    expect(view.container.textContent).toContain('Proposal 3 of 3');

    // Add proposal 4
    addBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add Proposal 4'),
    );
    expect(addBtn).not.toBeNull();
    await act(async () => {
      addBtn.click();
    });
    expect(view.container.textContent).toContain('Proposal 4 of 4');

    // Add proposal 5
    addBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add Proposal 5'),
    );
    expect(addBtn).not.toBeNull();
    await act(async () => {
      addBtn.click();
    });
    expect(view.container.textContent).toContain('Proposal 5 of 5');

    // At 5 proposals, Add Proposal button should no longer exist in the DOM
    const addProposalBtnAfterMax = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add Proposal'),
    );
    expect(addProposalBtnAfterMax).toBeUndefined();

    // Now test removing proposal 5
    const removeBtn = Array.from(view.container.querySelectorAll('button')).find(
      (b) =>
        b.textContent?.includes('Remove') && b.getAttribute('title')?.includes('Remove Proposal 5'),
    );
    expect(removeBtn).not.toBeNull();
    await act(async () => {
      removeBtn.click();
    });

    // Now proposal count should be 4 and "Add Proposal 5" reappears
    expect(view.container.textContent).toContain('Proposal 4 of 4');
    expect(view.container.textContent).toContain('Add Proposal 5');

    view.unmount();
  });

  it('defaults similarity metrics to 0.0% and displays unscanned state before scan', async () => {
    const view = renderPage();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Switch to similarity tab
    const similarityTab = Array.from(view.container.querySelectorAll('[role="tab"]')).find((el) =>
      el.textContent?.includes('Similarity Clearance'),
    );
    expect(similarityTab).toBeTruthy();
    await act(async () => {
      similarityTab.click();
    });

    // Metric cards must be 0.0%
    expect(view.container.textContent).toContain('0.0%');
    expect(view.container.textContent).toContain('Pending scan — not yet verified');
    expect(view.container.textContent).toContain('No Scan Results Yet');
    expect(view.container.textContent).toContain('Scan Proposal 1');
    expect(view.container.textContent).toContain('0.0% (Unscanned)');
    expect(view.container.textContent).toContain('Similarity scan pending');

    view.unmount();
  });

  it('executes similarity scan, displays dynamic results, non-wrapping year badges, and inspects match in modal', async () => {
    mockCheckProposalSimilarity.mockResolvedValue({
      data: {
        data: {
          matches: [
            {
              _id: 'proj-101',
              title:
                'Integrated Library Management System with Digital Catalog and RFID Book Tracking',
              academicYear: '2024–2025',
              similarityScore: 18,
              match: '18% match',
              reason: 'Matches RFID barcode tracking logic.',
              abstract: 'RFID library inventory system for campus circulation.',
              targetBeneficiary: 'BukSU University Library',
              techStack: ['React', 'Express', 'MongoDB'],
            },
          ],
          plagiarism: {
            similarityScore: 12.5,
            winnowingScore: 6.2,
            semanticScore: 18.0,
          },
        },
      },
    });

    const view = renderPage();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const proposalInput = view.container.querySelector('input[id="proposal-0-title"]');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(proposalInput, 'Automated Library Book Tracker');
      proposalInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Switch to similarity tab
    const similarityTab = Array.from(view.container.querySelectorAll('[role="tab"]')).find((el) =>
      el.textContent?.includes('Similarity Clearance'),
    );
    await act(async () => {
      similarityTab.click();
    });

    // Click "Scan Proposal 1"
    const scanBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Scan Proposal 1'),
    );
    expect(scanBtn).toBeTruthy();

    await act(async () => {
      scanBtn.click();
    });

    expect(mockCheckProposalSimilarity).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Automated Library Book Tracker',
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith('Similarity verification completed for Proposal 1.');

    // Now metrics should be populated
    expect(view.container.textContent).toContain('12.5%');
    expect(view.container.textContent).toContain('6.2%');
    expect(view.container.textContent).toContain('18.0%');
    expect(view.container.textContent).toContain('Cleared for hearing defense');
    expect(view.container.textContent).toContain(
      'Integrated Library Management System with Digital Catalog and RFID Book Tracking',
    );
    expect(view.container.textContent).toContain('2024–2025');
    expect(view.container.textContent).toContain('18% match');

    // Check year badge has shrink-0 and whitespace-nowrap
    const badge = Array.from(view.container.querySelectorAll('span')).find(
      (el) => el.textContent === '2024–2025',
    );
    expect(badge?.className).toContain('shrink-0');
    expect(badge?.className).toContain('whitespace-nowrap');

    // Click Inspect to open SimilarProjectModal
    const inspectBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Inspect'),
    );
    expect(inspectBtn).toBeTruthy();

    await act(async () => {
      inspectBtn.click();
    });

    const modal = document.body.querySelector('[data-testid="similar-project-modal"]');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('RFID library inventory system for campus circulation.');
    expect(modal.textContent).toContain('BukSU University Library');

    view.unmount();
  });

  it('isolates scan states per proposal index so unscanned proposals remain at 0.0%', async () => {
    mockCheckProposalSimilarity.mockResolvedValue({
      data: {
        data: {
          matches: [],
          plagiarism: {
            similarityScore: 8.5,
            winnowingScore: 3.1,
            semanticScore: 10.0,
          },
        },
      },
    });

    const view = renderPage();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const proposal1Input = view.container.querySelector('input[id="proposal-0-title"]');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(proposal1Input, 'First System Proposal');
      proposal1Input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Add proposal 2
    const addBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add Proposal 2'),
    );
    await act(async () => {
      addBtn.click();
    });

    // Switch back to Proposal 1 tab button
    const prop1Btn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Proposal 1'),
    );
    await act(async () => {
      prop1Btn.click();
    });

    // Switch to similarity tab
    const similarityTab = Array.from(view.container.querySelectorAll('[role="tab"]')).find((el) =>
      el.textContent?.includes('Similarity Clearance'),
    );
    await act(async () => {
      similarityTab.click();
    });

    // Scan Proposal 1
    const scanBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Scan Proposal 1'),
    );
    await act(async () => {
      scanBtn.click();
    });

    expect(view.container.textContent).toContain('8.5%');
    expect(view.container.textContent).toContain('No Similar Manuscripts Found');

    // Now switch to Proposal 2
    const prop2Btn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Proposal 2'),
    );
    await act(async () => {
      prop2Btn.click();
    });

    // Proposal 2 must remain unscanned at 0.0%
    expect(view.container.textContent).toContain('0.0%');
    expect(view.container.textContent).toContain('Pending scan — not yet verified');
    expect(view.container.textContent).toContain('No Scan Results Yet');
    expect(view.container.textContent).toContain('Scan Proposal 2');

    view.unmount();
  });

  it('renders pitch deck preview, enables next/previous slide navigation without visual bugs, and exports pptx', async () => {
    mockUseMyTeam.mockReturnValue({
      data: makeTeam({ name: 'Team Gamma' }),
      isLoading: false,
    });

    const view = renderPage();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Enter title for proposal 1
    const titleInput = view.container.querySelector('input[id="proposal-0-title"]');
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(titleInput, 'AdaptiEd Cognitive Accessibility Engine');
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Switch to Pitch Deck tab
    const deckTab = Array.from(view.container.querySelectorAll('[role="tab"]')).find((el) =>
      el.textContent?.includes('Pitch Deck'),
    );
    expect(deckTab).toBeTruthy();
    await act(async () => {
      deckTab.click();
    });

    // Verify Slide 01 renders correctly
    const preview = view.container.querySelector('[data-testid="pitch-deck-preview"]');
    expect(preview).toBeTruthy();
    expect(preview.textContent).toContain('SLIDE 01');
    expect(preview.textContent).toContain('Title Pitch & Proponents');
    expect(preview.textContent).toContain('AdaptiEd Cognitive Accessibility Engine');

    // Verify team name is clean and does NOT produce "Team Team Gamma"
    expect(preview.textContent).toContain('Team Gamma');
    expect(preview.textContent).not.toContain('Team Team Gamma');

    // Previous slide button should be disabled on slide 1
    const prevBtn = view.container.querySelector('[data-testid="prev-slide-button"]');
    const nextBtn = view.container.querySelector('[data-testid="next-slide-button"]');
    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    // Click Next Slide to advance to Slide 02
    await act(async () => {
      nextBtn.click();
    });
    expect(preview.textContent).toContain('SLIDE 02');
    expect(preview.textContent).toContain('Problem Statement & Literature Gap');
    expect(prevBtn.disabled).toBe(false);

    // Advance through slides until reaching Slide 08
    for (let i = 2; i < 8; i++) {
      await act(async () => {
        nextBtn.click();
      });
    }
    expect(preview.textContent).toContain('SLIDE 08');
    expect(preview.textContent).toContain('Committee Discussion');
    expect(nextBtn.disabled).toBe(true);

    // Click Previous Slide to go back to Slide 07
    await act(async () => {
      prevBtn.click();
    });
    expect(preview.textContent).toContain('SLIDE 07');
    expect(preview.textContent).toContain('Discipline & UN SDG Alignment');
    expect(nextBtn.disabled).toBe(false);

    // Test Export PowerPoint (.pptx)
    const exportPptxBtn = view.container.querySelector('[data-testid="export-pptx-button"]');
    expect(exportPptxBtn).toBeTruthy();
    expect(exportPptxBtn.textContent).toContain('Export PowerPoint (.pptx)');

    await act(async () => {
      exportPptxBtn.click();
    });
    expect(mockExportProposalDeckPptx).toHaveBeenCalledTimes(1);
    expect(mockExportProposalDeckPptx).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'AdaptiEd Cognitive Accessibility Engine',
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Pitch deck presentation PowerPoint (.pptx) exported'),
      expect.any(Object),
    );

    // Test Fullscreen Deck Modal
    const fullscreenBtn = view.container.querySelector('[data-testid="fullscreen-deck-button"]');
    expect(fullscreenBtn).toBeTruthy();

    await act(async () => {
      fullscreenBtn.click();
    });

    const modal = view.container.querySelector('[data-testid="fullscreen-deck-modal"]');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('SLIDE 07');

    // Close Fullscreen modal
    const closeBtn = view.container.querySelector('[data-testid="close-fullscreen-button"]');
    expect(closeBtn).toBeTruthy();
    await act(async () => {
      closeBtn.click();
    });
    expect(view.container.querySelector('[data-testid="fullscreen-deck-modal"]')).toBeNull();

    view.unmount();
  });

  it('submits project with sectionId resolved from team context', async () => {
    const mutateMock = vi.fn();
    mockUseCreateProject.mockReturnValue({ mutate: mutateMock, isPending: false });
    mockUseMyTeam.mockReturnValue({
      data: makeTeam({ sectionId: '507f1f77bcf86cd799439011' }),
      isLoading: false,
    });

    const view = renderPage();
    const proposalInput = view.container.querySelector('input[id="proposal-0-title"]');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(proposalInput, 'Valid Proposal Title For Capstone');
      proposalInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const submitBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Submit for Committee Review'),
    );
    expect(submitBtn).toBeTruthy();

    await act(async () => {
      submitBtn.click();
    });

    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Valid Proposal Title For Capstone',
        sectionId: '507f1f77bcf86cd799439011',
      }),
    );

    view.unmount();
  });

  it('submits project with sectionId resolved from user profile when team lacks sectionId', async () => {
    const mutateMock = vi.fn();
    mockUseCreateProject.mockReturnValue({ mutate: mutateMock, isPending: false });
    mockUseMyTeam.mockReturnValue({
      data: makeTeam({ sectionId: null }),
      isLoading: false,
    });
    useAuthStore.setState({
      user: {
        _id: 'student-1',
        firstName: 'Gabriel',
        lastName: 'Diaz',
        sectionId: '507f1f77bcf86cd799439022',
      },
      isAuthenticated: true,
    });

    const view = renderPage();
    const proposalInput = view.container.querySelector('input[id="proposal-0-title"]');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(proposalInput, 'Valid Proposal Title For Capstone');
      proposalInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const submitBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Submit for Committee Review'),
    );

    await act(async () => {
      submitBtn.click();
    });

    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Valid Proposal Title For Capstone',
        sectionId: '507f1f77bcf86cd799439022',
      }),
    );

    view.unmount();
  });

  it('omits sectionId from payload when neither team nor user has sectionId (never sends empty string)', async () => {
    const mutateMock = vi.fn();
    mockUseCreateProject.mockReturnValue({ mutate: mutateMock, isPending: false });
    mockUseMyTeam.mockReturnValue({
      data: makeTeam({ sectionId: null }),
      isLoading: false,
    });
    useAuthStore.setState({
      user: { _id: 'student-1', firstName: 'Gabriel', lastName: 'Diaz', sectionId: null },
      isAuthenticated: true,
    });

    const view = renderPage();
    const proposalInput = view.container.querySelector('input[id="proposal-0-title"]');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(proposalInput, 'Valid Proposal Title For Capstone');
      proposalInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const submitBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Submit for Committee Review'),
    );

    await act(async () => {
      submitBtn.click();
    });

    expect(mutateMock).toHaveBeenCalledTimes(1);
    const payload = mutateMock.mock.calls[0][0];
    expect(payload.sectionId).toBeUndefined();
    expect(payload).not.toHaveProperty('sectionId');

    view.unmount();
  });

  it('correctly extracts structured proposals from project metadata', () => {
    const mockProject = {
      _id: 'proj-1',
      title: 'Primary Capstone Title',
      titleProposalMetadata: [
        {
          title: 'Candidate Title 1',
          description:
            'Problem Statement:\nSevere issues in archiving.\n\nProposed Solution:\nModern cloud system.',
          capstoneType: ['Software Engineering & Web Applications'],
          sdgTags: ['SDG 4: Quality Education'],
        },
        {
          title: 'Candidate Title 2',
          description:
            'Problem Statement:\nLack of AI plagiarism checking.\n\nProposed Solution:\nWinnowing and embeddings.',
          capstoneType: ['Artificial Intelligence & Machine Learning'],
          sdgTags: ['SDG 9: Industry, Innovation & Infrastructure'],
        },
      ],
      titleProposals: ['Candidate Title 1', 'Candidate Title 2'],
    };

    const extracted = extractProposalsFromProject(mockProject);
    expect(extracted).toHaveLength(2);
    expect(extracted[0].title).toBe('Candidate Title 1');
    expect(extracted[0].pitchDeck.problemStatement).toBe('Severe issues in archiving.');
    expect(extracted[0].pitchDeck.proposedSolution).toBe('Modern cloud system.');
    expect(extracted[1].title).toBe('Candidate Title 2');
    expect(extracted[1].pitchDeck.problemStatement).toBe('Lack of AI plagiarism checking.');
    expect(extracted[1].pitchDeck.proposedSolution).toBe('Winnowing and embeddings.');
  });

  it('populates existing proposals and updates via useUpdateTitle in edit mode', async () => {
    const mutateTitleMock = vi.fn();
    mockUseUpdateTitle.mockReturnValue({ mutate: mutateTitleMock, isPending: false });
    mockUseMyTeam.mockReturnValue({ data: makeTeam(), isLoading: false });
    useAuthStore.setState({
      user: { _id: 'student-1', firstName: 'Gabriel', lastName: 'Diaz', sectionId: null },
      isAuthenticated: true,
    });

    mockUseLocation.mockReturnValue({
      pathname: '/project/create',
      search: '?edit=true',
      state: {
        edit: true,
        projectId: 'proj-edit-123',
        project: {
          _id: 'proj-edit-123',
          title: 'Existing Submitted Capstone',
          titleProposalMetadata: [
            {
              title: 'Populated Candidate 1',
              description:
                'Problem Statement:\nExisting gap in literature.\n\nProposed Solution:\nAutomated rubric system.',
              capstoneType: ['Software Engineering & Web Applications'],
              sdgTags: ['SDG 4: Quality Education'],
            },
          ],
          academicYear: '2025-2026',
        },
      },
    });

    const view = renderPage();

    // Check header indicates edit mode
    expect(view.container.textContent).toContain('Editing Proposals');

    // Check title input is populated
    const proposalInput = view.container.querySelector('input[id="proposal-0-title"]');
    expect(proposalInput).not.toBeNull();
    expect(proposalInput.value).toBe('Populated Candidate 1');

    // Click Update Proposals button
    const updateBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Update Proposals'),
    );
    expect(updateBtn).not.toBeUndefined();

    await act(async () => {
      updateBtn.click();
    });

    expect(mutateTitleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-edit-123',
        title: 'Populated Candidate 1',
        submit: true,
      }),
    );

    view.unmount();
  });

  it('hydrates existing proposals automatically via getMyProject fallback when no route state is provided', async () => {
    mockUseLocation.mockReturnValue({ state: null, pathname: '/project/create', search: '' });
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), vi.fn()]);

    mockGetMyProject.mockResolvedValueOnce({
      data: {
        project: {
          _id: 'my-proj-789',
          title: 'My Team Existing Project',
          titleProposals: [
            {
              title: 'Proposal A Title',
              description:
                'Problem Statement: Problem A text.\nProposed Solution: Solution A text.',
              pitchDeck: {
                problemStatement: 'Problem A text.',
                proposedSolution: 'Solution A text.',
                uniqueContribution: 'Novelty A.',
                targetUsers: 'Students A.',
                expectedImpact: 'Value A.',
              },
              capstoneType: ['Software Engineering & Web Applications'],
              sdgTags: ['SDG 4: Quality Education'],
            },
            {
              title: 'Proposal B Title',
              description:
                'Problem Statement: Problem B text.\nProposed Solution: Solution B text.',
              pitchDeck: {
                problemStatement: 'Problem B text.',
                proposedSolution: 'Solution B text.',
                uniqueContribution: 'Novelty B.',
                targetUsers: 'Students B.',
                expectedImpact: 'Value B.',
              },
              capstoneType: ['AI & Machine Learning Systems'],
              sdgTags: ['SDG 9: Industry, Innovation, and Infrastructure'],
            },
          ],
          academicYear: '2025-2026',
        },
      },
    });

    const view = renderPage();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Check title input is populated from getMyProject fallback
    const proposalInput = view.container.querySelector('input[id="proposal-0-title"]');
    expect(proposalInput).not.toBeNull();
    expect(proposalInput.value).toBe('Proposal A Title');

    // Check proposal pill indicator shows multiple candidate proposals
    expect(view.container.textContent).toContain('Proposal 1 of 2');

    view.unmount();
  });
});

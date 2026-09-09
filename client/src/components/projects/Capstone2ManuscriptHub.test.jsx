import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Capstone2ManuscriptHub from './Capstone2ManuscriptHub';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUploadManuscript = vi.fn();
const mockSyncPermissions = vi.fn();
const mockRefetchManuscripts = vi.fn();

let mockManuscriptsData = { manuscripts: [] };
const mockTemplateData = {
  template: {
    title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
    type: 'google_docs',
    url: 'https://docs.google.com/document/d/official-copy/copy',
    version: 'AY 2025–2026 v2.1',
    updatedAt: 'Sep 01, 2026',
  },
};

vi.mock('@/hooks/useDocuments', () => ({
  useProjectManuscripts: () => ({
    data: mockManuscriptsData,
    isLoading: false,
    refetch: mockRefetchManuscripts,
  }),
  useUploadManuscript: () => ({
    mutate: mockUploadManuscript,
    isPending: false,
  }),
  useSyncManuscriptPermissions: () => ({
    mutate: mockSyncPermissions,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeamManuscriptTemplate: () => ({
    data: mockTemplateData,
    isLoading: false,
  }),
  useTeamById: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    data: {
      documentTemplates: [
        {
          documentType: 'manuscript_template',
          templateUrl: 'https://docs.google.com/document/d/official-copy/copy',
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('@/services/authService', () => ({
  teamService: {
    updateGoogleDocLink: vi.fn().mockResolvedValue({}),
  },
}));

describe('Capstone2ManuscriptHub', () => {
  let container;
  let root;
  let queryClient;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    mockManuscriptsData = { manuscripts: [] };
  });

  const renderComponent = async (props = {}) => {
    const defaultProject = {
      _id: 'proj-123',
      title: 'Smart BukSU CMS',
      teamId: 'team-456',
    };
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Capstone2ManuscriptHub project={{ ...defaultProject, ...props }} />
        </QueryClientProvider>,
      );
    });
  };

  it('renders Step 1 institutional template with Google Docs copy and DOCX actions', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Step 1: Get the Institutional Template');
    expect(container.textContent).toContain(
      'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
    );
    expect(container.textContent).toContain('AY 2025–2026 v2.1');
    expect(container.textContent).toContain('Use Google Docs Copy');
    expect(container.textContent).toContain('Download .DOCX');
  });

  it('renders Step 2 attachment form when no link is attached', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Step 2: Attach Working Manuscript Link');
    expect(container.textContent).toContain('Team Working Document (Google Docs / Drive)');
    expect(container.textContent).toContain('Attach Google Docs Link');

    const input = container.querySelector('input[type="url"]');
    expect(input).not.toBeNull();
    expect(input.placeholder).toContain('https://docs.google.com/document/d/...');
  });

  it('submits valid Google Docs link via uploadManuscript mutation', async () => {
    await renderComponent();

    const input = container.querySelector('input[type="url"]');
    const form = container.querySelector('form');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(input, 'https://docs.google.com/document/d/test-doc-123/edit');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockUploadManuscript).toHaveBeenCalledWith({
      documentType: 'chapter_1',
      title: 'Smart BukSU CMS - Working Manuscript (Chapters 1–3)',
      externalDocUrl: 'https://docs.google.com/document/d/test-doc-123/edit',
      externalDocProvider: 'google_docs',
    });
  });

  it('renders attached state with open and sync actions when document is already linked', async () => {
    mockManuscriptsData = {
      manuscripts: [
        {
          _id: 'doc-1',
          documentType: 'chapter_1',
          title: 'Smart BukSU CMS - Working Manuscript',
          externalDocUrl: 'https://docs.google.com/document/d/live-working-doc/edit',
        },
      ],
    };

    await renderComponent();

    expect(container.textContent).toContain('Attached');
    expect(container.textContent).toContain(
      'https://docs.google.com/document/d/live-working-doc/edit',
    );
    expect(container.textContent).toContain('Open in Google Docs');
    expect(container.textContent).toContain('Edit Link');
    expect(container.textContent).toContain('Sync Committee Access');
  });

  it('automatically populates Step 2 when team has attached docs on My Team (teamId.googleDocUrl)', async () => {
    mockManuscriptsData = { manuscripts: [] };

    await renderComponent({
      teamId: {
        _id: 'team-456',
        name: 'Solo Leveling',
        googleDocUrl: 'https://docs.google.com/document/d/19isUvaVR4WcRnkHi2p1M_Fead/edit',
      },
    });

    expect(container.textContent).toContain('Attached');
    expect(container.textContent).toContain(
      'https://docs.google.com/document/d/19isUvaVR4WcRnkHi2p1M_Fead/edit',
    );
    expect(container.textContent).toContain('Open in Google Docs');
    expect(container.textContent).toContain('Edit Link');
    expect(container.textContent).toContain('Sync Committee Access');
  });
});

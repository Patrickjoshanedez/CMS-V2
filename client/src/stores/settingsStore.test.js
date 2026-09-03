import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSettingsMock = vi.fn();

vi.mock('../services/settingsService', () => ({
  settingsService: {
    getSettings: (...args) => getSettingsMock(...args),
  },
}));

import { useSettingsStore } from './settingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      plagiarismThreshold: 75,
      plagiarismWarningThreshold: 15,
      plagiarismRejectThreshold: 25,
      titleSimilarityThreshold: 0.65,
      maxFileSize: 25 * 1024 * 1024,
      documentTemplates: [
        {
          documentType: 'proposal_template',
          templateUrl: 'https://docs.google.com/document/d/example-proposal',
          description: 'Capstone 1 Proposal Manuscript Template',
        },
        {
          documentType: 'adm_form',
          templateUrl: 'https://docs.google.com/document/d/example-adm',
          description: 'Action Done Matrix (ADM) Official Template',
        },
      ],
      deadlines: [],
      systemAnnouncement: '',
      maintenanceMode: false,
      isLoading: false,
      error: null,
    });
  });

  it('fetches settings and populates store with thresholds and templates', async () => {
    getSettingsMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          plagiarismThreshold: 80,
          plagiarismWarningThreshold: 20,
          plagiarismRejectThreshold: 30,
          titleSimilarityThreshold: 0.7,
          documentTemplates: [
            {
              documentType: 'proposal_template',
              templateUrl: 'https://docs.google.com/document/d/custom-proposal',
            },
          ],
        },
      },
    });

    await useSettingsStore.getState().fetchSettings();

    const state = useSettingsStore.getState();
    expect(state.plagiarismThreshold).toBe(80);
    expect(state.plagiarismWarningThreshold).toBe(20);
    expect(state.plagiarismRejectThreshold).toBe(30);
    expect(state.getTemplateUrl('proposal_template')).toBe(
      'https://docs.google.com/document/d/custom-proposal',
    );
  });

  it('handles getTemplateUrl correctly for missing template', () => {
    const url = useSettingsStore.getState().getTemplateUrl('non_existent');
    expect(url).toBeNull();
  });
});

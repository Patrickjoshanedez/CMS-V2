import { create } from 'zustand';
import { settingsService } from '../services/settingsService';

export const useSettingsStore = create((set, get) => ({
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

  // Accessibility (Aribe #2)
  fontSize:
    typeof window !== 'undefined'
      ? localStorage.getItem('cms-font-size') || 'standard'
      : 'standard',
  highContrast:
    typeof window !== 'undefined' ? localStorage.getItem('cms-high-contrast') === 'true' : false,

  setFontSize: (size) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cms-font-size', size);
      if (size === 'standard') {
        document.documentElement.removeAttribute('data-font-size');
      } else {
        document.documentElement.setAttribute('data-font-size', size);
      }
    }
    set({ fontSize: size });
  },

  setHighContrast: (enabled) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cms-high-contrast', String(enabled));
      if (enabled) {
        document.documentElement.setAttribute('data-high-contrast', 'true');
      } else {
        document.documentElement.removeAttribute('data-high-contrast');
      }
    }
    set({ highContrast: enabled });
  },

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await settingsService.getSettings();
      const data = response?.data?.data || response?.data || {};
      set({
        plagiarismThreshold: data.plagiarismThreshold ?? 75,
        plagiarismWarningThreshold: data.plagiarismWarningThreshold ?? 15,
        plagiarismRejectThreshold: data.plagiarismRejectThreshold ?? 25,
        titleSimilarityThreshold: data.titleSimilarityThreshold ?? 0.65,
        maxFileSize: data.maxFileSize ?? 25 * 1024 * 1024,
        documentTemplates: data.documentTemplates || [],
        deadlines: data.deadlines || [],
        systemAnnouncement: data.systemAnnouncement || '',
        maintenanceMode: data.maintenanceMode || false,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  getTemplateUrl: (documentType) => {
    const templates = get().documentTemplates;
    const match = templates.find((t) => t.documentType === documentType);
    return match ? match.templateUrl : null;
  },
}));

export default useSettingsStore;

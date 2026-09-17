import { create } from 'zustand';
import { DEFAULT_TITLE_SIMILARITY_THRESHOLD } from '@cms/shared';
import { settingsService } from '../services/settingsService';

export const ZOOM_OPTIONS = [
  {
    value: '75',
    key: 'compact',
    scale: '75%',
    label: 'Compact',
    desc: '75% (12px base)',
    multiplier: 0.75,
  },
  {
    value: '90',
    key: 'small',
    scale: '90%',
    label: 'Small',
    desc: '90% (14.4px base)',
    multiplier: 0.9,
  },
  {
    value: '100',
    key: 'standard',
    scale: '100%',
    label: 'Standard',
    desc: '100% (16px base)',
    multiplier: 1.0,
  },
  {
    value: '110',
    key: 'medium',
    scale: '110%',
    label: 'Medium',
    desc: '110% (17.6px base)',
    multiplier: 1.1,
  },
  {
    value: '125',
    key: 'large',
    scale: '125%',
    label: 'Large',
    desc: '125% (20px base)',
    multiplier: 1.25,
  },
  {
    value: '140',
    key: 'xl',
    scale: '140%',
    label: 'Extra Large',
    desc: '140% (22.4px base)',
    multiplier: 1.4,
  },
  {
    value: '150',
    key: 'max',
    scale: '150%',
    label: 'Maximum',
    desc: '150% (24px base)',
    multiplier: 1.5,
  },
];

export function resolveZoomOption(input) {
  if (!input) return ZOOM_OPTIONS[2]; // Standard 100%
  const str = String(input).toLowerCase().trim().replace('%', '');
  return (
    ZOOM_OPTIONS.find((opt) => opt.value === str || opt.key === str) ||
    ZOOM_OPTIONS.find((opt) => String(opt.multiplier) === str) ||
    ZOOM_OPTIONS[2]
  );
}

export function applyZoom(input) {
  const opt = resolveZoomOption(input);
  if (typeof document !== 'undefined') {
    document.documentElement.style.fontSize = `${opt.multiplier * 16}px`;
    document.documentElement.style.setProperty('--font-size-multiplier', `${opt.multiplier}`);
    if (opt.key === 'standard') {
      document.documentElement.removeAttribute('data-font-size');
    } else {
      document.documentElement.setAttribute('data-font-size', opt.key);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('app_text_scale', opt.value);
      localStorage.setItem('cms-font-size', opt.key);
      localStorage.setItem('cms-zoom-level', opt.value);
    } catch {
      // Ignore localStorage errors in restricted contexts
    }
  }
  return opt;
}

export const useSettingsStore = create((set, get) => ({
  plagiarismThreshold: 75,
  plagiarismWarningThreshold: 15,
  plagiarismRejectThreshold: 25,
  titleSimilarityThreshold: DEFAULT_TITLE_SIMILARITY_THRESHOLD,
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

  // Accessibility (Aribe #2) - Fully synchronized 7-tier zoom architecture
  fontSize:
    typeof window !== 'undefined'
      ? resolveZoomOption(
          localStorage.getItem('app_text_scale') ||
            localStorage.getItem('cms-zoom-level') ||
            localStorage.getItem('cms-font-size') ||
            'standard',
        ).key
      : 'standard',
  zoomLevel:
    typeof window !== 'undefined'
      ? resolveZoomOption(
          localStorage.getItem('app_text_scale') ||
            localStorage.getItem('cms-zoom-level') ||
            localStorage.getItem('cms-font-size') ||
            '100',
        ).value
      : '100',
  highContrast:
    typeof window !== 'undefined' ? localStorage.getItem('cms-high-contrast') === 'true' : false,

  setFontSize: (size) => {
    const opt = applyZoom(size);
    set({ fontSize: opt.key, zoomLevel: opt.value });
  },

  setZoomLevel: (scaleVal) => {
    const opt = applyZoom(scaleVal);
    set({ fontSize: opt.key, zoomLevel: opt.value });
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
        titleSimilarityThreshold:
          data.titleSimilarityThreshold ?? DEFAULT_TITLE_SIMILARITY_THRESHOLD,
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

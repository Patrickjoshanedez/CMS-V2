import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { projectService, userService } from '@/services/authService';
import { toast } from 'sonner';
import buksuLogo from '@/assets/buksu-logo.png';
import { cn } from '@/lib/utils';
import {
  FileText,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Sparkles,
  RotateCcw,
  FileSpreadsheet,
  PenTool,
  Clock,
  BookOpen,
  Save,
} from 'lucide-react';

export const REFERENCE_PROTOTYPE_MINUTES = {
  title: 'Project Workspace: Capstone Management System with Plagiarism Checker',
  proponents: [
    'Antipuesto, Throylan',
    'Canoy, Chijay',
    'Anedez, Patrick Josh',
    'Bautista, Steven Joe',
  ],
  defenseType: 'prototype',
  defenseTypeLabel: 'Prototype Defense',
  round: '2nd',
  dateTimeVenue: 'April 20, 2026 || 9:00am || COT Conference Room',
  venue: 'COT Conference Room',
  defenseDate: 'April 20, 2026',
  defenseTime: '9:00am',
  adviser: 'Glaiza Mae Libe',
  panelChair: 'Louie Jay S. Labastida',
  panelMembers: ['Lecaros, Raul', 'Abella, Joseph'],
  secretary: 'Joan Marie M. Panes',
  secretarySignatoryName: 'JOAN MARIE M. PANES',
  documentCode: 'OVPAA-F-INS-032',
  revisionNo: '01',
  issueNo: '01',
  issueDate: 'June 1, 2018',
  pages: [
    {
      panelRemarks: [
        {
          panelName: 'Louie Jay Labastida',
          comments: [
            'Approved capstones should be transferred to archive automatically',
            'do not require minimum of 3 submissions ("add more" and "done" button instead)',
            'adviser and panel will be same account as faculty (and secretary)',
            'identification of panel roles (chair, members, secretary(for the record,with notification))',
            'do not delete data (archive only)',
            'setting of plagiarism rate should be cascaded to faculty and students',
            'action done matrix should be incorporated (with complete signatories)',
            'students should also be able to see comments and suggestions embedded in documents (name of suggester, highlight of concerned areas, google doc style)',
            'Capstone 2: no documents involved so directly to action done matrix',
            'secretary account upload minutes, action done created directly from that',
          ],
        },
      ],
    },
    {
      panelRemarks: [
        {
          panelName: 'Louie Jay Labastida (Continued)',
          comments: [
            '-editable/notification of justification will trigger only if late',
            '-put algorithm and its justification in paper',
          ],
        },
        {
          panelName: 'Raul Lecaros',
          comments: [
            'majority of the core functionalities (FR1–FR3, FR6, FR8–FR10, FR12–FR17) have been successfully implemented and are operating as intended.',
            'For FR4, it was agreed that the documentation must be updated to reflect a maximum of four members per capstone group instead of three, with an accompanying justification. Additionally, interface improvements were suggested, including repositioning the lock notification to the top and introducing color-coded indicators (red for locked and green for opened) to enhance user clarity.',
            'For FR5, the header "capstone type" will be revised to "IT Field of Discipline" to ensure proper terminology alignment.',
            'FR7 requires enhancement by removing the hard-coded Google Doc link and enabling instructors to configure this dynamically within the system.',
            'FR11 was noted as partially met; while the functionality is available on the student side, the GitHub repository link must also be made visible on the adviser’s interface to ensure transparency and monitoring.',
            'FRAD1, FRAD5, FRAD6, and FRAD7 were confirmed as fully implemented.',
            'FRAD2, however, remains partially complete, as it requires the display of team member names on the adviser’s view, specifically positioned on the right side of the interface.',
            'It was also agreed that FRAD3 and FRAD4 should be removed from the adviser functional requirements, as attaching minutes of the system proposal does not align with the intended scope.',
            'For the panel requirements (FRPA01–FRPA07), all functionalities were confirmed as fully met',
            'FRINS1, FRINS3–FRINS5, FRINS7 meets expectations.',
            'Minor adjustments were identified, including replacing the trash icon with an archive function (FRINS2) to better reflect intended usage and data retention practices.',
            'Additionally, FRINS6 remains incomplete, as it requires the inclusion of an Evaluation Report and a Plagiarism Report for each study, which are essential for academic assessment and integrity.',
          ],
        },
      ],
    },
    {
      panelRemarks: [
        {
          panelName: 'Joseph Abella',
          comments: [
            'results should be seen only once details are filled in',
            'User should be able to read the full paper',
            'if project is archived, details should not be visible (direct to whole paper)',
            'tabs: plagiarism vs similarity should be definite',
            'proposal should be able to be submitted, but should be flagged',
            'per session submission list',
          ],
        },
        {
          panelName: 'Dr. Sales Aribe Jr.',
          isClient: true,
          comments: [
            'Request: template redesignable/restructurable (instructor side)',
            'light mode theme, bigger font size',
            'date of submission of deliverables should be settable',
            'scheduling upload (calendar implementation)',
            'consultation module (optional)',
          ],
        },
      ],
    },
  ],
  panelRemarks: [
    {
      panelName: 'Louie Jay Labastida',
      comments: [
        'Approved capstones should be transferred to archive automatically',
        'do not require minimum of 3 submissions ("add more" and "done" button instead)',
        'adviser and panel will be same account as faculty (and secretary)',
        'identification of panel roles (chair, members, secretary(for the record,with notification))',
        'do not delete data (archive only)',
        'setting of plagiarism rate should be cascaded to faculty and students',
        'action done matrix should be incorporated (with complete signatories)',
        'students should also be able to see comments and suggestions embedded in documents (name of suggester, highlight of concerned areas, google doc style)',
        'Capstone 2: no documents involved so directly to action done matrix',
        'secretary account upload minutes, action done created directly from that',
        '-editable/notification of justification will trigger only if late',
        '-put algorithm and its justification in paper',
      ],
    },
    {
      panelName: 'Raul Lecaros',
      comments: [
        'majority of the core functionalities (FR1–FR3, FR6, FR8–FR10, FR12–FR17) have been successfully implemented and are operating as intended.',
        'For FR4, it was agreed that the documentation must be updated to reflect a maximum of four members per capstone group instead of three, with an accompanying justification. Additionally, interface improvements were suggested, including repositioning the lock notification to the top and introducing color-coded indicators (red for locked and green for opened) to enhance user clarity.',
        'For FR5, the header "capstone type" will be revised to "IT Field of Discipline" to ensure proper terminology alignment.',
        'FR7 requires enhancement by removing the hard-coded Google Doc link and enabling instructors to configure this dynamically within the system.',
        'FR11 was noted as partially met; while the functionality is available on the student side, the GitHub repository link must also be made visible on the adviser’s interface to ensure transparency and monitoring.',
        'FRAD1, FRAD5, FRAD6, and FRAD7 were confirmed as fully implemented.',
        'FRAD2, however, remains partially complete, as it requires the display of team member names on the adviser’s view, specifically positioned on the right side of the interface.',
        'It was also agreed that FRAD3 and FRAD4 should be removed from the adviser functional requirements, as attaching minutes of the system proposal does not align with the intended scope.',
        'For the panel requirements (FRPA01–FRPA07), all functionalities were confirmed as fully met',
        'FRINS1, FRINS3–FRINS5, FRINS7 meets expectations.',
        'Minor adjustments were identified, including replacing the trash icon with an archive function (FRINS2) to better reflect intended usage and data retention practices.',
        'Additionally, FRINS6 remains incomplete, as it requires the inclusion of an Evaluation Report and a Plagiarism Report for each study, which are essential for academic assessment and integrity.',
      ],
    },
    {
      panelName: 'Joseph Abella',
      comments: [
        'results should be seen only once details are filled in',
        'User should be able to read the full paper',
        'if project is archived, details should not be visible (direct to whole paper)',
        'tabs: plagiarism vs similarity should be definite',
        'proposal should be able to be submitted, but should be flagged',
        'per session submission list',
      ],
    },
    {
      panelName: 'Dr. Sales Aribe Jr.',
      isClient: true,
      comments: [
        'Request: template redesignable/restructurable (instructor side)',
        'light mode theme, bigger font size',
        'date of submission of deliverables should be settable',
        'scheduling upload (calendar implementation)',
        'consultation module (optional)',
      ],
    },
  ],
  overallRecommendations:
    'Unfinished prototype with missing functions and modules. Recommended to redefend.',
  panelVerdict: 'approved_with_minor_revisions',
  verdictLabel: 'Approved with Minor Revision',
  signature: {
    signed: false,
    signedAt: null,
    signatoryName: 'JOAN MARIE M. PANES',
    signatureDataUrl: null,
    userId: null,
  },
};

const INITIAL_MINUTES_STATE = {
  title: '',
  proponents: [],
  defenseType: 'prototype',
  defenseTypeLabel: 'Prototype Defense',
  round: '1st',
  dateTimeVenue: '',
  venue: '',
  defenseDate: '',
  defenseTime: '',
  adviser: '',
  panelChair: '',
  panelMembers: [],
  secretary: '',
  documentCode: 'OVPAA-F-INS-032',
  revisionNo: '01',
  issueNo: '01',
  issueDate: 'June 1, 2018',
  pages: [
    {
      panelRemarks: [
        {
          panelName: '',
          comments: [''],
        },
      ],
    },
  ],
  panelRemarks: [],
  overallRecommendations: '',
  panelVerdict: 'approved_with_minor_revisions',
  verdictLabel: 'Approved with Minor Revision',
  secretarySignatoryName: '',
  signature: {
    signed: false,
    signedAt: null,
    signatoryName: '',
    signatureDataUrl: null,
    userId: null,
  },
};

/**
 * Auto-expanding Textarea that recalculates scrollHeight on input
 * to prevent text clipping and provide dynamic spacing.
 */
function AutoResizeTextarea({ value, onChange, placeholder, className, rows = 1, ...props }) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 22)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        adjustHeight();
      }}
      rows={rows}
      placeholder={placeholder}
      className={cn(
        'w-full bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none resize-none overflow-hidden text-xs sm:text-sm text-black leading-snug py-0.5 transition-[height] duration-75',
        className,
      )}
      {...props}
    />
  );
}

export default function SecretaryMinutesDocumentSheet({
  project,
  user,
  onMinutesSynced,
  className = '',
}) {
  const fileInputRef = useRef(null);
  const [minutes, setMinutes] = useState(INITIAL_MINUTES_STATE);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncingADM, setIsSyncingADM] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scanFilename, setScanFilename] = useState('');

  // Digital Signature Modal State
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [typedSignatoryName, setTypedSignatoryName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [saveSignatureToProfile, setSaveSignatureToProfile] = useState(true);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);

  // Sync project props, defense schedule, and saved minutes
  useEffect(() => {
    if (project?.secretaryMinutes && Object.keys(project.secretaryMinutes).length > 0) {
      const saved = project.secretaryMinutes;
      setMinutes((prev) => {
        let pages = saved.pages;
        if (!pages || !Array.isArray(pages) || pages.length === 0) {
          if (saved.panelRemarks && saved.panelRemarks.length > 0) {
            pages = [{ panelRemarks: saved.panelRemarks }];
          } else {
            pages = [{ panelRemarks: [{ panelName: '', comments: [''] }] }];
          }
        }
        return {
          ...prev,
          ...saved,
          pages,
          signature: saved.signature || prev.signature,
        };
      });
    } else if (project) {
      // Auto-populate title, proponents, adviser, chair, panel members, secretary, and defense schedule
      const proponents = (project.teamId?.members || [])
        .map(
          (m) =>
            m?.fullName ||
            `${m?.firstName || ''} ${m?.lastName || ''}`.trim() ||
            'Student Proponent',
        )
        .filter(Boolean);

      const adviserName =
        project.adviserId?.fullName ||
        `${project.adviserId?.firstName || ''} ${project.adviserId?.lastName || ''}`.trim();

      const chairObj = (project.panelists || []).find((p) => p.role === 'chair')?.userId;
      const chairName =
        chairObj?.fullName || `${chairObj?.firstName || ''} ${chairObj?.lastName || ''}`.trim();

      const memberObjs = (project.panelists || []).filter((p) => p.role !== 'chair');
      const panelMemberNames = memberObjs
        .map((p) => {
          const u = p.userId;
          return u?.fullName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
        })
        .filter(Boolean);

      const secretaryObj = project.secretaryId;
      const secretaryName =
        secretaryObj?.fullName ||
        `${secretaryObj?.firstName || ''} ${secretaryObj?.lastName || ''}`.trim() ||
        user?.fullName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

      // Sourced from defense schedule
      const schedule = project.defenseSchedule || {};
      let formattedDate = '';
      if (schedule.date) {
        try {
          formattedDate = new Date(schedule.date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
        } catch {
          formattedDate = String(schedule.date);
        }
      }
      const time = schedule.time || '';
      const venue = schedule.venue || '';
      const round = schedule.round || '1st';
      const defenseType = schedule.defenseType || 'prototype';
      const defenseTypeLabel =
        defenseType === 'prototype'
          ? 'Prototype Defense'
          : defenseType === 'midterm'
            ? 'Midterm Defense'
            : defenseType === 'final'
              ? 'Final Defense'
              : 'Proposal Defense';

      const schedParts = [formattedDate, time, venue].filter(Boolean);
      const dateTimeVenue = schedParts.join(' || ');

      // Inherit ADM secretary endorsement signature if available
      const secSig = project.admSignatures?.secretary?.endorsed
        ? project.admSignatures.secretary
        : null;

      setMinutes((prev) => {
        const defaultPages =
          prev.pages?.length > 0
            ? prev.pages
            : [
                {
                  panelRemarks: [
                    {
                      panelName: chairName || '',
                      comments: [''],
                    },
                  ],
                },
              ];

        return {
          ...prev,
          title: project.title || prev.title,
          proponents:
            proponents.length > 0 ? proponents : prev.proponents.length > 0 ? prev.proponents : [],
          adviser: adviserName || prev.adviser,
          panelChair: chairName || prev.panelChair,
          panelMembers: panelMemberNames.length > 0 ? panelMemberNames : prev.panelMembers,
          secretary: secretaryName || prev.secretary,
          secretarySignatoryName:
            (secretaryName ? secretaryName.toUpperCase() : '') || prev.secretarySignatoryName,
          dateTimeVenue: dateTimeVenue || prev.dateTimeVenue,
          venue: venue || prev.venue,
          defenseDate: formattedDate || prev.defenseDate,
          defenseTime: time || prev.defenseTime,
          round: round || prev.round,
          defenseType: defenseType || prev.defenseType,
          defenseTypeLabel: defenseTypeLabel || prev.defenseTypeLabel,
          pages: defaultPages,
          signature: secSig
            ? {
                signed: true,
                signedAt: secSig.endorsedAt,
                signatoryName: secSig.signatoryName,
                signatureDataUrl: secSig.signatureDataUrl,
                userId: secSig.userId,
              }
            : prev.signature,
        };
      });
    }
  }, [project, user]);

  // Lock body scroll when signature modal is open
  useEffect(() => {
    if (!isSignModalOpen || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isSignModalOpen]);

  // Update top-level text fields
  const handleFieldChange = (field, value) => {
    setMinutes((prev) => ({ ...prev, [field]: value }));
  };

  // Proponent list handlers
  const handleAddProponent = () => {
    setMinutes((prev) => ({ ...prev, proponents: [...prev.proponents, ''] }));
  };

  const handleProponentChange = (index, value) => {
    setMinutes((prev) => {
      const next = [...prev.proponents];
      next[index] = value;
      return { ...prev, proponents: next };
    });
  };

  const handleRemoveProponent = (index) => {
    setMinutes((prev) => {
      const next = prev.proponents.filter((_, i) => i !== index);
      return { ...prev, proponents: next };
    });
  };

  // Panel member list handlers
  const handleAddPanelMember = () => {
    setMinutes((prev) => ({ ...prev, panelMembers: [...prev.panelMembers, ''] }));
  };

  const handlePanelMemberChange = (index, value) => {
    setMinutes((prev) => {
      const next = [...prev.panelMembers];
      next[index] = value;
      return { ...prev, panelMembers: next };
    });
  };

  const handleRemovePanelMember = (index) => {
    setMinutes((prev) => {
      const next = prev.panelMembers.filter((_, i) => i !== index);
      return { ...prev, panelMembers: next };
    });
  };

  // Dynamic page handlers
  const handleAddPage = () => {
    setMinutes((prev) => ({
      ...prev,
      pages: [
        ...prev.pages,
        {
          panelRemarks: [
            {
              panelName: '',
              comments: [''],
            },
          ],
        },
      ],
    }));
    toast.info(`Continuation page ${minutes.pages.length + 1} added.`);
  };

  const handleRemovePage = (pageIdx) => {
    if (minutes.pages.length <= 1) {
      toast.error('Cannot remove the primary page.');
      return;
    }
    setMinutes((prev) => {
      const nextPages = prev.pages.filter((_, idx) => idx !== pageIdx);
      return {
        ...prev,
        pages: nextPages,
      };
    });
    toast.info(`Page ${pageIdx + 1} removed.`);
  };

  // Dynamic row and comment handlers on specific page
  const handleAddPanelRowToPage = (pageIdx) => {
    setMinutes((prev) => {
      const nextPages = [...prev.pages];
      const page = nextPages[pageIdx] || { panelRemarks: [] };
      nextPages[pageIdx] = {
        ...page,
        panelRemarks: [...(page.panelRemarks || []), { panelName: '', comments: [''] }],
      };
      return { ...prev, pages: nextPages };
    });
  };

  const handleRemovePanelRowFromPage = (pageIdx, panelIdx) => {
    setMinutes((prev) => {
      const nextPages = [...prev.pages];
      const page = nextPages[pageIdx];
      if (!page) return prev;
      const nextRemarks = page.panelRemarks.filter((_, idx) => idx !== panelIdx);
      nextPages[pageIdx] = {
        ...page,
        panelRemarks: nextRemarks.length > 0 ? nextRemarks : [{ panelName: '', comments: [''] }],
      };
      return { ...prev, pages: nextPages };
    });
  };

  const handlePanelNameChangeOnPage = (pageIdx, panelIdx, name) => {
    setMinutes((prev) => {
      const nextPages = [...prev.pages];
      const page = nextPages[pageIdx];
      if (!page) return prev;
      const nextRemarks = [...page.panelRemarks];
      nextRemarks[panelIdx] = { ...nextRemarks[panelIdx], panelName: name };
      nextPages[pageIdx] = { ...page, panelRemarks: nextRemarks };
      return { ...prev, pages: nextPages };
    });
  };

  const handleAddCommentOnPage = (pageIdx, panelIdx) => {
    setMinutes((prev) => {
      const nextPages = [...prev.pages];
      const page = nextPages[pageIdx];
      if (!page) return prev;
      const nextRemarks = [...page.panelRemarks];
      const panel = nextRemarks[panelIdx];
      nextRemarks[panelIdx] = { ...panel, comments: [...(panel.comments || []), ''] };
      nextPages[pageIdx] = { ...page, panelRemarks: nextRemarks };
      return { ...prev, pages: nextPages };
    });
  };

  const handleCommentChangeOnPage = (pageIdx, panelIdx, commentIdx, value) => {
    setMinutes((prev) => {
      const nextPages = [...prev.pages];
      const page = nextPages[pageIdx];
      if (!page) return prev;
      const nextRemarks = [...page.panelRemarks];
      const panel = nextRemarks[panelIdx];
      const nextComments = [...panel.comments];
      nextComments[commentIdx] = value;
      nextRemarks[panelIdx] = { ...panel, comments: nextComments };
      nextPages[pageIdx] = { ...page, panelRemarks: nextRemarks };
      return { ...prev, pages: nextPages };
    });
  };

  const handleRemoveCommentOnPage = (pageIdx, panelIdx, commentIdx) => {
    setMinutes((prev) => {
      const nextPages = [...prev.pages];
      const page = nextPages[pageIdx];
      if (!page) return prev;
      const nextRemarks = [...page.panelRemarks];
      const panel = nextRemarks[panelIdx];
      const nextComments = panel.comments.filter((_, idx) => idx !== commentIdx);
      nextRemarks[panelIdx] = {
        ...panel,
        comments: nextComments.length > 0 ? nextComments : [''],
      };
      nextPages[pageIdx] = { ...page, panelRemarks: nextRemarks };
      return { ...prev, pages: nextPages };
    });
  };

  // OCR Scan & Upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanFilename(file.name);

      const formData = new FormData();
      formData.append('file', file);
      if (project?._id) {
        formData.append('projectId', project._id);
      }

      const res = await projectService.scanSecretaryMinutes(formData);
      const data = res?.data?.data || res?.data;

      if (!data) {
        throw new Error('Could not parse minutes data from file.');
      }

      const remarks = Array.isArray(data.panelRemarks)
        ? data.panelRemarks.map((p) => ({
            panelName: p.panelName || '',
            comments: Array.isArray(p.comments) ? p.comments : [p.comments].filter(Boolean),
          }))
        : [{ panelName: '', comments: [''] }];

      // Distribute scanned remarks across pages (e.g. up to 2 panels per page)
      const ocrPages = [];
      for (let i = 0; i < remarks.length; i += 2) {
        ocrPages.push({ panelRemarks: remarks.slice(i, i + 2) });
      }
      if (ocrPages.length === 0) {
        ocrPages.push({ panelRemarks: [{ panelName: '', comments: [''] }] });
      }

      setMinutes({
        title: data.title || '',
        proponents: Array.isArray(data.proponents) ? data.proponents : [],
        defenseType: data.defenseType || 'prototype',
        defenseTypeLabel: data.defenseTypeLabel || 'Prototype Defense',
        round: data.round || '1st',
        dateTimeVenue: data.dateTimeVenue || '',
        venue: data.venue || '',
        defenseDate: data.defenseDate || '',
        defenseTime: data.defenseTime || '',
        adviser: data.adviser || '',
        panelChair: data.panelChair || '',
        panelMembers: Array.isArray(data.panelMembers) ? data.panelMembers : [],
        secretary: data.secretary || '',
        documentCode: data.documentCode || 'OVPAA-F-INS-032',
        revisionNo: data.revisionNo || '01',
        issueNo: data.issueNo || '01',
        issueDate: data.issueDate || 'June 1, 2018',
        pages: ocrPages,
        panelRemarks: remarks,
        overallRecommendations: data.overallRecommendations || '',
        panelVerdict: data.panelVerdict || 'approved_with_minor_revisions',
        verdictLabel: data.verdictLabel || 'Approved with Minor Revision',
        secretarySignatoryName: data.secretarySignatoryName || data.secretary || '',
        signature: {
          signed: false,
          signedAt: null,
          signatoryName: data.secretarySignatoryName || data.secretary || '',
          signatureDataUrl: null,
          userId: null,
        },
      });

      toast.success(
        `Secretary's Minutes scanned and autofilled successfully! (${remarks.length} panelist sections across ${ocrPages.length} page(s))`,
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to scan and autofill minutes.',
      );
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Autofill from active project roster and defense scheduling
  const handleAutofillFromProject = () => {
    if (!project) {
      toast.error('No project selected to autofill from.');
      return;
    }

    const proponents = (project.teamId?.members || [])
      .map((m) => {
        const name = m?.fullName || `${m?.firstName || ''} ${m?.lastName || ''}`.trim();
        return name || 'Student Proponent';
      })
      .filter(Boolean);

    const adviserName =
      project.adviserId?.fullName ||
      `${project.adviserId?.firstName || ''} ${project.adviserId?.lastName || ''}`.trim();

    const chairObj = (project.panelists || []).find((p) => p.role === 'chair')?.userId;
    const chairName =
      chairObj?.fullName || `${chairObj?.firstName || ''} ${chairObj?.lastName || ''}`.trim();

    const memberObjs = (project.panelists || []).filter((p) => p.role !== 'chair');
    const panelMemberNames = memberObjs
      .map((p) => {
        const u = p.userId;
        return u?.fullName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'Panel Member';
      })
      .filter(Boolean);

    const secretaryObj = project.secretaryId;
    const secretaryName =
      secretaryObj?.fullName ||
      `${secretaryObj?.firstName || ''} ${secretaryObj?.lastName || ''}`.trim() ||
      user?.fullName ||
      `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

    // Defense schedule
    const schedule = project.defenseSchedule || {};
    let formattedDate = '';
    if (schedule.date) {
      try {
        formattedDate = new Date(schedule.date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        formattedDate = String(schedule.date);
      }
    }
    const time = schedule.time || '';
    const venue = schedule.venue || '';
    const round = schedule.round || '1st';
    const defenseType = schedule.defenseType || 'prototype';
    const defenseTypeLabel =
      defenseType === 'prototype'
        ? 'Prototype Defense'
        : defenseType === 'midterm'
          ? 'Midterm Defense'
          : defenseType === 'final'
            ? 'Final Defense'
            : 'Proposal Defense';

    const schedParts = [formattedDate, time, venue].filter(Boolean);
    const dateTimeVenue = schedParts.join(' || ');

    setMinutes((prev) => {
      const nextPages = [...(prev.pages?.length > 0 ? prev.pages : [{ panelRemarks: [] }])];
      if (
        nextPages[0]?.panelRemarks?.length === 1 &&
        !nextPages[0].panelRemarks[0].panelName &&
        chairName
      ) {
        nextPages[0].panelRemarks[0].panelName = chairName;
      }

      return {
        ...prev,
        title: project.title || prev.title,
        proponents: proponents.length > 0 ? proponents : prev.proponents,
        adviser: adviserName || prev.adviser,
        panelChair: chairName || prev.panelChair,
        panelMembers: panelMemberNames.length > 0 ? panelMemberNames : prev.panelMembers,
        secretary: secretaryName || prev.secretary,
        secretarySignatoryName:
          (secretaryName ? secretaryName.toUpperCase() : '') || prev.secretarySignatoryName,
        dateTimeVenue: dateTimeVenue || prev.dateTimeVenue,
        venue: venue || prev.venue,
        defenseDate: formattedDate || prev.defenseDate,
        defenseTime: time || prev.defenseTime,
        round: round || prev.round,
        defenseType: defenseType || prev.defenseType,
        defenseTypeLabel: defenseTypeLabel || prev.defenseTypeLabel,
        pages: nextPages,
      };
    });

    toast.info('Project title, proponents, defense schedule, and committee roster autofilled.');
  };

  // Load official BukSU prototype defense sample from PDF
  const handleLoadOfficialReference = () => {
    setMinutes({
      ...REFERENCE_PROTOTYPE_MINUTES,
    });
    toast.success('Loaded official BukSU Prototype Defense Minutes (Form OVPAA-F-INS-032)!');
  };

  // Reset form to blank (1 page)
  const handleClearForm = () => {
    setMinutes({
      ...INITIAL_MINUTES_STATE,
      pages: [
        {
          panelRemarks: [
            {
              panelName: '',
              comments: [''],
            },
          ],
        },
      ],
    });
    setScanFilename('');
    toast.info('Secretary minutes cleared to 1 blank page.');
  };

  // Save current minutes to project database
  const handleSaveMinutes = async () => {
    if (!project?._id) {
      toast.error('No project selected to save minutes.');
      return;
    }

    const allRemarks = (minutes.pages || []).flatMap((p) => p.panelRemarks || []);

    try {
      setIsSaving(true);
      await projectService.saveSecretaryMinutes({
        projectId: project._id,
        minutesData: {
          ...minutes,
          panelRemarks: allRemarks,
        },
        syncToADM: false,
      });
      toast.success('Secretary Minutes saved successfully.');
      onMinutesSynced?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save Secretary Minutes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Sync to Action Done Matrix (ADM)
  const handleSyncToADM = async () => {
    if (!project?._id) {
      toast.error('Please select an active capstone project to sync ADM.');
      return;
    }

    const allRemarks = (minutes.pages || []).flatMap((p) => p.panelRemarks || []);
    const validRemarks = allRemarks.filter(
      (p) => p.panelName?.trim() || (p.comments && p.comments.some((c) => c?.trim())),
    );

    if (validRemarks.length === 0) {
      toast.error('No panel remarks or comments have been recorded to sync to ADM.');
      return;
    }

    try {
      setIsSyncingADM(true);
      await projectService.saveSecretaryMinutes({
        projectId: project._id,
        minutesData: {
          ...minutes,
          panelRemarks: validRemarks,
        },
        syncToADM: true,
      });

      toast.success(
        "Action Done Matrix successfully synchronized with Secretary's Minutes remarks!",
      );
      onMinutesSynced?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to sync Action Done Matrix.');
    } finally {
      setIsSyncingADM(false);
    }
  };

  // Open digital signature modal
  const handleOpenSignModal = () => {
    const defaultName =
      minutes.secretarySignatoryName ||
      minutes.secretary ||
      user?.fullName ||
      `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
      'Joan Marie M. Panes';

    setTypedSignatoryName(defaultName);
    if (user?.digitalSignature) {
      setSignatureDataUrl(user.digitalSignature);
      setIsDrawingSignature(false);
    } else {
      setSignatureDataUrl(null);
      setIsDrawingSignature(true);
    }
    setIsSignModalOpen(true);
  };

  // Submit digital signature
  const handleConfirmSignature = async () => {
    const finalName = (
      typedSignatoryName ||
      minutes.secretary ||
      user?.fullName ||
      'Committee Secretary'
    ).trim();

    const sigToUse = signatureDataUrl || user?.digitalSignature;
    if (!sigToUse) {
      toast.error('Please draw or configure your digital signature.');
      return;
    }

    try {
      setIsSubmittingSignature(true);

      const signaturePayload = {
        signed: true,
        signedAt: new Date().toISOString(),
        signatoryName: finalName.toUpperCase(),
        signatureDataUrl: sigToUse,
        userId: user?._id || null,
      };

      const updatedMinutes = {
        ...minutes,
        secretarySignatoryName: finalName.toUpperCase(),
        signature: signaturePayload,
      };

      setMinutes(updatedMinutes);

      if (project?._id) {
        await projectService.saveSecretaryMinutes({
          projectId: project._id,
          minutesData: updatedMinutes,
          syncToADM: true,
        });

        // Also persist signature to user profile if requested
        if (saveSignatureToProfile && (!user?.digitalSignature || isDrawingSignature)) {
          try {
            await userService.updateMe({ digitalSignature: sigToUse });
          } catch {
            // non-blocking
          }
        }
      }

      toast.success(`Recorded Secretary digital signature for ${finalName}.`);
      setIsSignModalOpen(false);
      onMinutesSynced?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record digital signature.');
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  // Remove signature (re-sign)
  const handleClearSignature = async () => {
    const updatedMinutes = {
      ...minutes,
      signature: {
        signed: false,
        signedAt: null,
        signatoryName: minutes.secretarySignatoryName || minutes.secretary,
        signatureDataUrl: null,
        userId: null,
      },
    };
    setMinutes(updatedMinutes);

    if (project?._id) {
      try {
        await projectService.saveSecretaryMinutes({
          projectId: project._id,
          minutesData: updatedMinutes,
          syncToADM: false,
        });
        toast.info('Secretary digital signature removed. You can now re-sign.');
        onMinutesSynced?.();
      } catch {
        // non-blocking
      }
    }
  };

  // Format browser printing title to ensure default PDF download filename is perfect
  const handlePrint = () => {
    const originalTitle = document.title;
    const projectTitleClean = (minutes.title || project?.title || 'Capstone_Project')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    document.title = `Secretary_Minutes_OVPAA-F-INS-032_${projectTitleClean}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Check if current user has secretary signing permission
  const isUserSecretary = Boolean(
    user &&
    (project?.secretaryId?._id === user._id ||
      String(project?.secretaryId) === String(user._id) ||
      project?.panelists?.some(
        (p) =>
          (p.userId === user._id || p.userId?._id === user._id || p._id === user._id) &&
          (p.role === 'secretary' || p.role === 'SECRETARY'),
      ) ||
      user.role === 'faculty' ||
      user.role === 'instructor'),
  );

  const isSigned = Boolean(minutes.signature?.signed);
  const signatureData = minutes.signature;
  const signatoryNameDisplay =
    signatureData?.signatoryName ||
    minutes.secretarySignatoryName ||
    minutes.secretary ||
    'JOAN MARIE M. PANES';

  const totalPages = minutes.pages?.length || 1;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── DEDICATED PRINT STYLESHEET (100% Page Isolation & Full Paper Capture) ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          html, body, #root, #root div, main, .main-content {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            background: white !important;
            color: black !important;
          }
          .h-screen, .overflow-hidden, .overflow-y-auto {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          aside, nav, header, footer, [role="navigation"], [role="status"], [role="region"], .no-print, .print\\:hidden, [data-sonner-toaster], .toaster, #toast-container, button {
            display: none !important;
          }
          .secretary-sheet-paper-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            display: block !important;
          }
          .secretary-minutes-page {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 279mm !important;
            min-height: 279mm !important;
            max-height: 279mm !important;
            font-size: 9.5pt !important;
            line-height: 1.25 !important;
          }
          .secretary-minutes-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .secretary-minutes-page table {
            font-size: 9.5pt !important;
            line-height: 1.2 !important;
          }
          .secretary-minutes-page td, .secretary-minutes-page th {
            padding: 2.5px 5px !important;
          }
          .secretary-minutes-page ul {
            margin: 0 !important;
            padding-left: 14px !important;
          }
          .secretary-minutes-page li {
            margin-bottom: 1.5px !important;
          }
          .secretary-minutes-page img {
            max-height: 55px !important;
            max-width: 55px !important;
          }
          .secretary-minutes-page input, .secretary-minutes-page textarea {
            font-size: 9.5pt !important;
            line-height: 1.2 !important;
            padding: 0 !important;
            color: black !important;
          }
        }
      `}</style>

      {/* ── Top Non-Printing Action Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card shadow-xs no-print">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Secretary&apos;s Minutes Document (OVPAA-F-INS-032)
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                Official BukSU Form
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Institutional hearing defense minutes with digital signature sign-off, live ADM sync,
              and dynamic multi-page PDF printing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input for OCR Scan */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
            className="hidden"
          />

          {isUserSecretary && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="gap-1.5 shadow-xs text-xs h-8"
              data-testid="upload-minutes-ocr-btn"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Scanning OCR...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Upload Secretary Minutes (OCR Scan)
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutofillFromProject}
            disabled={!project}
            className="gap-1.5 text-xs h-8"
            title="Autofill project title, proponents, adviser, and panel members from project database"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Autofill from Project
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLoadOfficialReference}
            className="gap-1.5 text-xs h-8 font-medium"
            title="Load authentic BukSU Prototype Defense Minutes corresponding to the official PDF"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Load Reference Sample
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddPage}
            className="gap-1.5 text-xs h-8 text-primary border-primary/40 hover:bg-primary/5"
            title="Add a continuation page to minutes"
            data-testid="add-page-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Page
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSyncToADM}
            disabled={isSyncingADM}
            className="gap-1.5 text-xs h-8 text-primary border-primary/40 hover:bg-primary/5"
            title="Convert panel remarks into official Action Done Matrix rows"
          >
            {isSyncingADM ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Sync to ADM
          </Button>

          {isUserSecretary && !isSigned && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenSignModal}
              className="gap-1.5 text-xs h-8 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
              title="Apply Secretary digital signature"
            >
              <PenTool className="h-3.5 w-3.5" />
              Sign Digitally
            </Button>
          )}

          {project?._id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveMinutes}
              disabled={isSaving}
              className="gap-1.5 text-xs h-8"
              title="Save current minutes to database"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save Minutes'}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearForm}
            className="gap-1 text-xs h-8 text-muted-foreground hover:text-foreground"
            title="Clear all fields to blank 1-page state"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
            title="Print or Download as PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* ── Scanning Banner ── */}
      {isScanning && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 flex items-center gap-3 animate-pulse no-print">
          <RefreshCw className="h-5 w-5 text-primary animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-foreground">
              Scanning &ldquo;{scanFilename}&rdquo; with OCR Engine...
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Performing layout analysis and populating Form OVPAA-F-INS-032 across pages.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── DYNAMIC MULTI-PAGE BUKSU DOCUMENT CONTAINER ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div
        id="secretary-minutes-paper"
        className="secretary-sheet-paper-container max-w-4xl mx-auto space-y-10"
      >
        {minutes.pages.map((page, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;
          const pageNumber = pageIdx + 1;

          return (
            <div
              key={pageIdx}
              className="secretary-minutes-page bg-white text-black font-serif shadow-lg border border-neutral-300 dark:border-neutral-700 min-h-[1050px] p-8 sm:p-12 relative flex flex-col justify-between rounded-xs"
              data-testid={`secretary-minutes-page-${pageNumber}`}
            >
              {/* Top Section */}
              <div className="space-y-4">
                {/* BukSU Header */}
                <BuksuDocumentHeader />

                {/* Document Title or Continuation Banner */}
                {isFirstPage ? (
                  <div className="text-center pt-2 pb-1">
                    <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black">
                      SECRETARY’S MINUTES
                    </h2>
                  </div>
                ) : (
                  <div className="pt-2 pb-1 flex items-center justify-between border-b border-neutral-300 pb-2">
                    <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                      SECRETARY’S MINUTES (CONTINUATION)
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleRemovePage(pageIdx)}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-sans no-print font-medium"
                      title="Remove this continuation page"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove Page {pageNumber}
                    </button>
                  </div>
                )}

                {/* Metadata Fields Section (Rendered on Page 1) */}
                {isFirstPage && (
                  <div className="space-y-2.5 text-xs sm:text-sm text-black">
                    {/* Title of Paper */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-black shrink-0">Title of Paper:</span>
                      <input
                        type="text"
                        value={minutes.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        placeholder="Project Workspace: Capstone Management System with Plagiarism Checker"
                        className="flex-1 font-bold text-black bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none px-1 py-0.5 text-xs sm:text-sm"
                        data-testid="minutes-title-input"
                      />
                    </div>

                    {/* Name of Proponents (Indented) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-black">Name of Proponents:</span>
                        <button
                          type="button"
                          onClick={handleAddProponent}
                          className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-sans no-print"
                        >
                          <Plus className="h-3 w-3" /> Add Proponent
                        </button>
                      </div>
                      <div className="pl-6 sm:pl-10 space-y-0.5 font-normal">
                        {minutes.proponents.length === 0 ? (
                          <div className="italic text-neutral-600 text-xs py-1">
                            No proponents listed. Click &quot;Autofill from Project&quot; or &quot;+
                            Add Proponent&quot;.
                          </div>
                        ) : (
                          minutes.proponents.map((proponent, idx) => (
                            <div key={idx} className="flex items-center gap-2 group/prop">
                              <input
                                type="text"
                                value={proponent}
                                onChange={(e) => handleProponentChange(idx, e.target.value)}
                                placeholder="Antipuesto, Throylan"
                                className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none py-0.5 text-xs sm:text-sm text-black"
                                data-testid={`minutes-proponent-${idx}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveProponent(idx)}
                                className="text-neutral-400 hover:text-red-600 opacity-0 group-hover/prop:opacity-100 transition-opacity no-print"
                                title="Remove proponent"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Type of Defense */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="font-bold text-black">Type of Defense:</span>
                      {[
                        { value: 'proposal', label: 'Proposal Defense' },
                        { value: 'prototype', label: 'Prototype Defense' },
                        { value: 'final', label: 'Final Defense' },
                      ].map((dt) => {
                        const isChecked = minutes.defenseType === dt.value;
                        return (
                          <button
                            key={dt.value}
                            type="button"
                            onClick={() => {
                              handleFieldChange('defenseType', dt.value);
                              handleFieldChange('defenseTypeLabel', dt.label);
                            }}
                            className="inline-flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm hover:opacity-80 transition-opacity"
                          >
                            <span className="font-bold text-black">
                              {isChecked ? '(✓)' : '( )'}
                            </span>
                            <span className={isChecked ? 'font-bold text-black' : 'text-black'}>
                              {dt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Number of Rounds */}
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black">Number of Rounds:</span>
                      {['1st', '2nd', '3rd'].map((r) => {
                        const isChecked = minutes.round === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleFieldChange('round', r)}
                            className="inline-flex items-center gap-1 cursor-pointer text-xs sm:text-sm hover:opacity-80 transition-opacity"
                          >
                            <span className="font-bold text-black">
                              {isChecked ? '(✓)' : '( )'}
                            </span>
                            <span className={isChecked ? 'font-bold text-black' : 'text-black'}>
                              {r.slice(0, 1)}
                              <sup>{r.slice(1)}</sup>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Date/Time & Venue */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-black shrink-0">Date/Time & Venue:</span>
                      <input
                        type="text"
                        value={minutes.dateTimeVenue}
                        onChange={(e) => handleFieldChange('dateTimeVenue', e.target.value)}
                        placeholder="April 20, 2026 || 9:00am || COT Conference Room"
                        className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none px-1 py-0.5 text-xs sm:text-sm text-black"
                        data-testid="minutes-datetime-venue-input"
                      />
                    </div>

                    {/* Adviser */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-black shrink-0">Adviser:</span>
                      <input
                        type="text"
                        value={minutes.adviser}
                        onChange={(e) => handleFieldChange('adviser', e.target.value)}
                        placeholder="Glaiza Mae Libe"
                        className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none px-1 py-0.5 text-xs sm:text-sm text-black"
                        data-testid="minutes-adviser-input"
                      />
                    </div>

                    {/* Panel Chair/REC */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-black shrink-0">Panel Chair/REC:</span>
                      <input
                        type="text"
                        value={minutes.panelChair}
                        onChange={(e) => handleFieldChange('panelChair', e.target.value)}
                        placeholder="Louie Jay S. Labastida"
                        className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none px-1 py-0.5 text-xs sm:text-sm text-black font-bold"
                        data-testid="minutes-chair-input"
                      />
                    </div>

                    {/* Panel Members (Indented) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-black">Panel Members:</span>
                        <button
                          type="button"
                          onClick={handleAddPanelMember}
                          className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-sans no-print"
                        >
                          <Plus className="h-3 w-3" /> Add Member
                        </button>
                      </div>
                      <div className="pl-6 sm:pl-10 space-y-0.5 font-normal">
                        {minutes.panelMembers.length === 0 ? (
                          <div className="italic text-neutral-600 text-xs py-1">
                            No panel members listed. Click &quot;Autofill from Project&quot; or
                            &quot;+ Add Member&quot;.
                          </div>
                        ) : (
                          minutes.panelMembers.map((member, idx) => (
                            <div key={idx} className="flex items-center gap-2 group/mem">
                              <input
                                type="text"
                                value={member}
                                onChange={(e) => handlePanelMemberChange(idx, e.target.value)}
                                placeholder="Lecaros, Raul"
                                className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none py-0.5 text-xs sm:text-sm text-black"
                                data-testid={`minutes-panel-member-${idx}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePanelMember(idx)}
                                className="text-neutral-400 hover:text-red-600 opacity-0 group-hover/mem:opacity-100 transition-opacity no-print"
                                title="Remove panel member"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Secretary */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-black shrink-0">Secretary:</span>
                      <input
                        type="text"
                        value={minutes.secretary}
                        onChange={(e) => {
                          handleFieldChange('secretary', e.target.value);
                          if (!minutes.secretarySignatoryName) {
                            handleFieldChange(
                              'secretarySignatoryName',
                              e.target.value.toUpperCase(),
                            );
                          }
                        }}
                        placeholder="Joan Marie M. Panes"
                        className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none px-1 py-0.5 text-xs sm:text-sm text-black font-bold"
                        data-testid="minutes-secretary-input"
                      />
                    </div>
                  </div>
                )}

                {/* Table: Name of Panel | COMMENTS/SUGGESTIONS */}
                <div className="pt-2">
                  <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-black">
                        <th className="w-[32%] py-2 px-3 text-center font-bold text-black border-r border-black uppercase text-xs sm:text-sm">
                          Name of Panel
                        </th>
                        <th className="w-[68%] py-2 px-3 text-center font-bold text-black uppercase text-xs sm:text-sm">
                          COMMENTS/SUGGESTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.panelRemarks && page.panelRemarks.length > 0 ? (
                        page.panelRemarks.map((panel, pIdx) => (
                          <tr
                            key={pIdx}
                            className="align-top border-b border-black last:border-b-0"
                          >
                            <td className="p-3 border-r border-black font-bold text-black relative group/paneltd">
                              {panel.isClient && (
                                <div className="text-xs text-black font-normal mb-0.5">Client</div>
                              )}
                              <input
                                type="text"
                                value={panel.panelName}
                                onChange={(e) =>
                                  handlePanelNameChangeOnPage(pageIdx, pIdx, e.target.value)
                                }
                                className="w-full font-bold bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none text-xs sm:text-sm text-black"
                                placeholder={
                                  isFirstPage && pIdx === 0
                                    ? 'Louie Jay Labastida'
                                    : 'Panel Member Name'
                                }
                                data-testid={`panel-name-input-${pageIdx}-${pIdx}`}
                              />
                              {page.panelRemarks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemovePanelRowFromPage(pageIdx, pIdx)}
                                  className="mt-2 text-[10px] text-neutral-500 hover:text-red-600 opacity-0 group-hover/paneltd:opacity-100 transition-opacity no-print flex items-center gap-1 font-sans font-normal"
                                  title="Delete this panel row"
                                >
                                  <Trash2 className="h-2.5 w-2.5" /> Remove Row
                                </button>
                              )}
                            </td>
                            <td className="p-3">
                              <ul className="space-y-1.5 list-disc list-outside pl-4 text-xs sm:text-sm leading-relaxed text-black">
                                {panel.comments && panel.comments.length > 0 ? (
                                  panel.comments.map((comment, cIdx) => (
                                    <li key={cIdx} className="group/bullet relative">
                                      <div className="flex items-start gap-1">
                                        <AutoResizeTextarea
                                          value={comment}
                                          onChange={(e) =>
                                            handleCommentChangeOnPage(
                                              pageIdx,
                                              pIdx,
                                              cIdx,
                                              e.target.value,
                                            )
                                          }
                                          placeholder="Type comment or suggestion here..."
                                          data-testid={`panel-comment-${pageIdx}-${pIdx}-${cIdx}`}
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveCommentOnPage(pageIdx, pIdx, cIdx)
                                          }
                                          className="text-neutral-400 hover:text-red-600 opacity-0 group-hover/bullet:opacity-100 transition-opacity no-print pt-0.5"
                                          title="Remove comment bullet"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </li>
                                  ))
                                ) : (
                                  <li className="italic text-neutral-500 text-xs list-none">
                                    No comments yet. Click &quot;+ Add Suggestion&quot;.
                                  </li>
                                )}
                              </ul>
                              <div className="mt-2 text-right no-print">
                                <button
                                  type="button"
                                  onClick={() => handleAddCommentOnPage(pageIdx, pIdx)}
                                  className="text-[11px] text-blue-700 hover:underline inline-flex items-center gap-1 font-sans"
                                >
                                  <Plus className="h-3 w-3" /> Add Suggestion
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={2}
                            className="p-6 text-center text-neutral-600 italic text-xs"
                          >
                            No panel remarks recorded yet. Click &quot;+ Add Panelist Row&quot; or
                            &quot;Autofill from Project&quot;.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Option to Add Rows to this Table */}
                  <div className="flex items-center justify-between pt-1.5 no-print">
                    <span className="text-[11px] text-neutral-500 italic">
                      Tables dynamically allocate space as you type.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddPanelRowToPage(pageIdx)}
                      className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-sans font-medium"
                      title="Add another panelist row to this table"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Panelist Row
                    </button>
                  </div>
                </div>

                {/* Last Page Section: Recommendations, Verdict, and Digital Signature */}
                {isLastPage && (
                  <>
                    <div className="space-y-4 pt-3 text-xs sm:text-sm text-black">
                      {/* Overall Recommendations */}
                      <div className="space-y-1">
                        <span className="font-bold text-black block">Overall Recommendations:</span>
                        <AutoResizeTextarea
                          value={minutes.overallRecommendations}
                          onChange={(e) =>
                            handleFieldChange('overallRecommendations', e.target.value)
                          }
                          placeholder="Unfinished prototype with missing functions and modules. Recommended to redefend."
                          rows={2}
                          data-testid="minutes-overall-recommendations"
                        />
                      </div>

                      {/* Panel Verdict */}
                      <div className="space-y-1 pt-1">
                        <span className="font-bold text-black block">Panel Verdict:</span>
                        <div className="space-y-1 pl-1">
                          {[
                            {
                              value: 'approved_with_minor_revisions',
                              label: 'Approved with Minor Revision',
                            },
                            {
                              value: 'approved_with_major_revisions',
                              label: 'Approved with Major Revision',
                            },
                            { value: 'rejected', label: 'Rejected' },
                          ].map((v) => {
                            const isChecked = minutes.panelVerdict === v.value;
                            return (
                              <button
                                key={v.value}
                                type="button"
                                onClick={() => {
                                  handleFieldChange('panelVerdict', v.value);
                                  handleFieldChange('verdictLabel', v.label);
                                }}
                                className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm hover:opacity-85 text-left py-0.5"
                              >
                                <span className="font-bold text-black w-6">
                                  {isChecked ? '(√ )' : '( )'}
                                </span>
                                <span className={isChecked ? 'font-bold text-black' : 'text-black'}>
                                  {v.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Secretary Digital Signature Block (Bottom Right) */}
                    <div className="pt-6 pb-2 flex justify-end">
                      <div className="w-80 flex flex-col items-center justify-end text-center space-y-1">
                        {/* 1. TOP: Digital Signature Image or Sign Button */}
                        <div className="h-16 flex flex-col items-center justify-center w-full">
                          {isSigned ? (
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {signatureData?.signatureDataUrl ? (
                                <img
                                  src={signatureData.signatureDataUrl}
                                  alt="Secretary Digital Signature"
                                  className="max-h-14 max-w-[220px] object-contain"
                                />
                              ) : (
                                <span className="font-serif italic text-base text-black">
                                  {signatoryNameDisplay}
                                </span>
                              )}
                              <span className="text-[9px] text-neutral-600 font-mono tracking-tight print:hidden">
                                Digitally signed on{' '}
                                {signatureData.signedAt
                                  ? new Date(signatureData.signedAt).toLocaleDateString()
                                  : new Date().toLocaleDateString()}{' '}
                                | Ref:{' '}
                                {signatureData.userId
                                  ? String(signatureData.userId).slice(-6).toUpperCase()
                                  : 'SEC-OFFICIAL'}
                              </span>
                            </div>
                          ) : isUserSecretary ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleOpenSignModal}
                              className="h-7 text-xs px-3 text-primary border-primary/50 hover:bg-primary/10 gap-1.5 shadow-xs no-print font-sans"
                            >
                              <PenTool className="h-3 w-3" /> Sign Digitally
                            </Button>
                          ) : (
                            <div className="text-[11px] text-neutral-500 italic font-sans flex items-center gap-1 no-print">
                              <Clock className="h-3 w-3" /> Pending Secretary Signature
                            </div>
                          )}
                        </div>

                        {/* 2. MIDDLE: Bold Uppercase Printed Name */}
                        <input
                          type="text"
                          value={signatoryNameDisplay}
                          onChange={(e) => {
                            handleFieldChange(
                              'secretarySignatoryName',
                              e.target.value.toUpperCase(),
                            );
                          }}
                          placeholder="JOAN MARIE M. PANES"
                          className="text-center font-bold text-xs sm:text-sm uppercase tracking-wide bg-transparent border-none focus:outline-none w-full text-black"
                          data-testid="minutes-signatory-name"
                        />

                        {/* 3. BOTTOM: Horizontal Underline */}
                        <div className="w-full max-w-[280px] border-b border-black my-0.5" />

                        {/* Official Title Designation Below Line */}
                        <p className="text-[11px] sm:text-xs text-black font-normal">
                          Signature over Printed Name of Secretary
                        </p>

                        {/* Non-print status actions (Verified badge, Re-sign) */}
                        <div className="pt-1 flex items-center justify-center gap-2 no-print font-sans">
                          {isSigned && (
                            <>
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-500/30 gap-1"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                                Verified
                              </Badge>
                              {isUserSecretary && (
                                <button
                                  type="button"
                                  onClick={handleClearSignature}
                                  className="text-[10px] text-neutral-600 hover:text-red-600 underline"
                                  title="Remove signature to re-sign"
                                >
                                  Re-sign
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Dynamic Footer with Dynamic Issue Date and Revision No */}
              <BuksuDocumentFooter
                pageNumber={pageNumber}
                totalPages={totalPages}
                documentCode={minutes.documentCode}
                revisionNo={minutes.revisionNo}
                issueNo={minutes.issueNo}
                issueDate={minutes.issueDate}
                onFieldChange={handleFieldChange}
              />
            </div>
          );
        })}
      </div>

      {/* ── Convenient Add Page Button at Bottom ── */}
      <div className="flex justify-center pt-2 pb-6 no-print">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddPage}
          className="gap-2 text-xs font-semibold shadow-xs text-primary border-primary/50 hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" /> Add Page ({totalPages + 1})
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SECRETARY DIGITAL SIGNATURE MODAL (CONSISTENT WITH ADM) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isSignModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-full items-center justify-center overflow-y-auto bg-black/75 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200 no-print"
            role="dialog"
            aria-modal="true"
            aria-labelledby="secretary-sign-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingSignature) {
                setIsSignModalOpen(false);
              }
            }}
          >
            <div
              className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-xl p-6 space-y-4 my-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PenTool className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 id="secretary-sign-modal-title" className="text-base font-semibold">
                      Secretary Digital Signature
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Official Defense Hearing Sign-Off (Form OVPAA-F-INS-032)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSignModalOpen(false)}
                  disabled={isSubmittingSignature}
                  className="h-7 w-7 p-0 rounded-md"
                >
                  ✕
                </Button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Applying your digital signature certifies that these hearing minutes and panel
                verdict are authentic records of the capstone proceedings. This digital signature
                will also synchronize with the Action Done Matrix (ADM) Secretary Endorsement Gate.
              </p>

              {/* Legal Name */}
              <div className="space-y-1.5">
                <Label htmlFor="sec-legal-name" className="text-xs font-medium">
                  Secretary Legal Full Name
                </Label>
                <Input
                  id="sec-legal-name"
                  value={typedSignatoryName}
                  onChange={(e) => setTypedSignatoryName(e.target.value)}
                  placeholder="Joan Marie M. Panes"
                  disabled={isSubmittingSignature}
                  className="h-9 text-xs"
                />
              </div>

              {/* Signature Canvas / Profile Signature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Digital Signature</Label>
                  {user?.digitalSignature && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawingSignature(!isDrawingSignature);
                        if (!isDrawingSignature) {
                          setSignatureDataUrl(null);
                        } else {
                          setSignatureDataUrl(user.digitalSignature);
                        }
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {isDrawingSignature ? 'Use Saved Profile Signature' : 'Draw New Signature'}
                    </button>
                  )}
                </div>

                {!isDrawingSignature && user?.digitalSignature ? (
                  <div className="border border-border/80 rounded-lg p-3 bg-card/60 flex flex-col items-center justify-center space-y-2">
                    <img
                      src={user.digitalSignature}
                      alt="Saved Signature"
                      className="max-h-16 max-w-full object-contain dark:invert"
                    />
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Using saved signature from your user profile
                    </Badge>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden bg-background">
                    <SignaturePad
                      onChange={(dataUrl) => setSignatureDataUrl(dataUrl)}
                      onClear={() => setSignatureDataUrl(null)}
                      defaultSignatoryName={typedSignatoryName}
                      height={150}
                    />
                  </div>
                )}
              </div>

              {/* Save signature checkbox */}
              {isDrawingSignature && (
                <label className="flex items-center gap-2 select-none text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={saveSignatureToProfile}
                    onChange={(e) => setSaveSignatureToProfile(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Save this signature to my profile for future documents</span>
                </label>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSignModalOpen(false)}
                  disabled={isSubmittingSignature}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmSignature}
                  disabled={isSubmittingSignature || (!signatureDataUrl && !user?.digitalSignature)}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  {isSubmittingSignature ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Sign Minutes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

SecretaryMinutesDocumentSheet.propTypes = {
  project: PropTypes.object,
  user: PropTypes.object,
  onMinutesSynced: PropTypes.func,
  className: PropTypes.string,
};

/**
 * Authentic BukSU Institutional Document Header matching OVPAA-F-INS-032
 * Note: Horizontal line removed below university info as per official template refinement.
 */
function BuksuDocumentHeader() {
  return (
    <div className="relative pb-2 text-center">
      {/* BukSU Official Seal on Left */}
      <div className="absolute left-0 top-0">
        <img
          src={buksuLogo}
          alt="BukSU Official Seal"
          className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
        />
      </div>

      <div className="space-y-0.5 sm:px-24">
        <h1 className="font-bold text-sm sm:text-base tracking-wide text-black uppercase">
          Bukidnon State University
        </h1>
        <p className="text-xs text-black font-normal">Malaybalay City, Bukidnon 8700</p>
        <p className="text-xs text-black">
          Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717,{' '}
          <a
            href="https://www.buksu.edu.ph"
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 underline"
          >
            www.buksu.edu.ph
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Authentic BukSU Document Code Footer matching OVPAA-F-INS-032
 * Dynamic revision number, issue number, and issue date.
 */
function BuksuDocumentFooter({
  pageNumber = 1,
  totalPages = 1,
  documentCode = 'OVPAA-F-INS-032',
  revisionNo = '01',
  issueNo = '01',
  issueDate = 'June 1, 2018',
  onFieldChange,
}) {
  return (
    <div className="border-t border-black pt-2 mt-4 text-[10px] sm:text-[11px] text-black font-sans shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-1 text-black">
        <span>Document Code: {documentCode}</span>
        <span className="inline-flex items-center gap-0.5">
          Revision No:{' '}
          <input
            type="text"
            value={revisionNo}
            onChange={(e) => onFieldChange?.('revisionNo', e.target.value)}
            className="w-7 inline bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none text-[10px] sm:text-[11px] text-black p-0 text-center font-sans font-medium"
            title="Edit Revision No"
          />
        </span>
        <span className="inline-flex items-center gap-0.5">
          Issue No:{' '}
          <input
            type="text"
            value={issueNo}
            onChange={(e) => onFieldChange?.('issueNo', e.target.value)}
            className="w-7 inline bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none text-[10px] sm:text-[11px] text-black p-0 text-center font-sans font-medium"
            title="Edit Issue No"
          />
        </span>
        <span className="inline-flex items-center gap-0.5">
          Issue Date:{' '}
          <input
            type="text"
            value={issueDate}
            onChange={(e) => onFieldChange?.('issueDate', e.target.value)}
            className="w-24 inline bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-black focus:outline-none text-[10px] sm:text-[11px] text-black p-0 text-center font-sans font-medium"
            title="Edit Issue Date"
          />
        </span>
        <span className="font-medium">
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  );
}

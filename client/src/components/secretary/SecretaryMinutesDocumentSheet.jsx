import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { SignaturePad } from '@/components/ui/SignaturePad';
import Spinner from '@/components/ui/Spinner';
import { resolveMinutesPermissions } from '@/components/projects/adm/admWorkflow';
import { projectService, userService } from '@/services/authService';
import { toast } from 'sonner';
import buksuLogo from '@/assets/buksu-logo.png';
import { cn } from '@/lib/utils';
import {
  FileText,
  Upload,
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

export const buildDefault3Sheets = (chairName = '', panelMemberNames = []) => {
  const member1 = panelMemberNames[0] || '';
  const member2 = panelMemberNames[1] || '';

  return [
    {
      panelRemarks: [
        {
          panelName: chairName || '',
          comments: [''],
        },
      ],
    },
    {
      panelRemarks: [
        {
          panelName: member1 || '',
          comments: [''],
        },
      ],
    },
    {
      panelRemarks: [
        {
          panelName: member2 || '',
          comments: [''],
        },
      ],
    },
  ];
};

/**
 * Defensive committee extraction helper that handles:
 * - project.defenseCommittees (e.g. capstone1, capstone2, capstone3, capstone4)
 * - project.panelists (with chair / panelist roles)
 * - project.secretaryId / project.teamId?.secretaryId
 * - project.adviserId
 */
export const extractCommitteeFromProject = (project, user = null) => {
  if (!project) {
    return {
      chairName: '',
      panelMemberNames: [],
      secretaryName:
        user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '',
      adviserName: '',
    };
  }

  const adviserName =
    project.adviserId?.fullName ||
    `${project.adviserId?.firstName || ''} ${project.adviserId?.lastName || ''}`.trim() ||
    project.adviser ||
    '';

  const committeeObj =
    project.defenseCommittees?.capstone2 ||
    project.defenseCommittees?.capstone1 ||
    project.defenseCommittees?.capstone3 ||
    project.defenseCommittees?.capstone4 ||
    (project.defenseCommittees && Object.values(project.defenseCommittees)[0]) ||
    null;

  let chairName = '';
  let panelMemberNames = [];
  let secretaryName = '';

  if (committeeObj) {
    if (committeeObj.panelChair) {
      chairName =
        committeeObj.panelChair.fullName ||
        `${committeeObj.panelChair.firstName || ''} ${committeeObj.panelChair.lastName || ''}`.trim() ||
        String(committeeObj.panelChair);
    }
    if (Array.isArray(committeeObj.panelists)) {
      panelMemberNames = committeeObj.panelists
        .map((p) => p?.fullName || `${p?.firstName || ''} ${p?.lastName || ''}`.trim() || String(p))
        .filter(Boolean);
    }
    if (committeeObj.secretary) {
      secretaryName =
        committeeObj.secretary.fullName ||
        `${committeeObj.secretary.firstName || ''} ${committeeObj.secretary.lastName || ''}`.trim() ||
        String(committeeObj.secretary);
    }
  }

  if (!chairName) {
    const chairObj = (project.panelists || []).find((p) => p.role === 'chair')?.userId;
    chairName =
      chairObj?.fullName ||
      `${chairObj?.firstName || ''} ${chairObj?.lastName || ''}`.trim() ||
      project.panelChair ||
      '';
  }

  if (panelMemberNames.length === 0) {
    const memberObjs = (project.panelists || []).filter((p) => p.role !== 'chair');
    const fromMembers = memberObjs
      .map((p) => {
        const u = p.userId;
        return u?.fullName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
      })
      .filter(Boolean);
    if (fromMembers.length > 0) {
      panelMemberNames = fromMembers;
    } else if (Array.isArray(project.panelMembers) && project.panelMembers.length > 0) {
      panelMemberNames = project.panelMembers;
    }
  }

  if (!secretaryName) {
    const secretaryObj = project.secretaryId || project.teamId?.secretaryId;
    secretaryName =
      secretaryObj?.fullName ||
      `${secretaryObj?.firstName || ''} ${secretaryObj?.lastName || ''}`.trim() ||
      project.secretary ||
      user?.fullName ||
      `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
      '';
  }

  return { chairName, panelMemberNames, secretaryName, adviserName };
};

/**
 * Automatically allocates continuation sheets if remarks/comments exceed vertical page capacity:
 * - Sheet 1 (Opening Sheet with metadata): Capacity is ~10 comments max.
 * - Sheet 2..N-1 (Continuation Sheets): Capacity is ~14 comments max per sheet.
 * - Sheet N (Final Sign-off Sheet with Recommendations, Verdict, Signature): Capacity is ~8-10 comments max.
 * If comments in a panelist section exceed the capacity, it splits them and creates a
 * "${panelName} (Continued)" continuation row on the next sheet, matching BukSU Prototype Defense Minutes reference.
 */
export const autoAllocateContinuationSheets = (pages) => {
  if (!Array.isArray(pages) || pages.length === 0) return buildDefault3Sheets();

  // 1. Flatten all panel remarks into a clean list
  const rawRemarks = [];
  pages.forEach((p) => {
    (p.panelRemarks || []).forEach((rem) => {
      if (rem.panelName || (rem.comments && rem.comments.length > 0)) {
        const validComments = (rem.comments || []).filter((c) => c !== undefined && c !== null);
        rawRemarks.push({
          panelName: rem.panelName || '',
          comments: validComments.length > 0 ? validComments : [''],
          isClient: Boolean(rem.isClient),
        });
      }
    });
  });

  if (rawRemarks.length === 0) {
    return buildDefault3Sheets();
  }

  // 2. Coalesce consecutive remarks for the same panelist (e.g. from previous splits)
  const allRemarks = [];
  rawRemarks.forEach((rem) => {
    const baseName = rem.panelName.replace(/\s*\(Continued\)/gi, '').trim();
    const prev = allRemarks[allRemarks.length - 1];
    if (
      prev &&
      baseName &&
      prev.panelName.toLowerCase() === baseName.toLowerCase() &&
      prev.isClient === rem.isClient
    ) {
      prev.comments.push(...rem.comments);
    } else {
      allRemarks.push({
        panelName: baseName || rem.panelName,
        comments: [...rem.comments],
        isClient: rem.isClient,
      });
    }
  });

  const SHEET1_COMMENT_LIMIT = 10;
  const CONTINUATION_COMMENT_LIMIT = 16;
  const FINAL_SHEET_COMMENT_LIMIT = 11;

  const newPages = [];

  // 3. Sheet 1: Chair remarks (first panelist)
  const chairRemark = allRemarks[0] || { panelName: '', comments: [''] };
  const chairComments = chairRemark.comments || [''];
  const remainingRemarks = [];

  if (chairComments.length > SHEET1_COMMENT_LIMIT) {
    const p1Comments = chairComments.slice(0, SHEET1_COMMENT_LIMIT);
    const overflowComments = chairComments.slice(SHEET1_COMMENT_LIMIT);
    newPages.push({
      panelRemarks: [
        {
          panelName: chairRemark.panelName,
          comments: p1Comments,
          isClient: chairRemark.isClient,
        },
      ],
    });
    remainingRemarks.push({
      panelName: `${chairRemark.panelName} (Continued)`,
      comments: overflowComments,
      isClient: chairRemark.isClient,
    });
  } else {
    newPages.push({
      panelRemarks: [
        {
          panelName: chairRemark.panelName,
          comments: chairComments.length > 0 ? chairComments : [''],
          isClient: chairRemark.isClient,
        },
      ],
    });
  }

  for (let i = 1; i < allRemarks.length; i++) {
    remainingRemarks.push({
      panelName: allRemarks[i].panelName,
      comments: [...allRemarks[i].comments],
      isClient: allRemarks[i].isClient,
    });
  }

  // If no remaining remarks, supply blank continuation and final sign-off sheets
  if (remainingRemarks.length === 0) {
    newPages.push({ panelRemarks: [{ panelName: '', comments: [''] }] });
    newPages.push({ panelRemarks: [{ panelName: '', comments: [''] }] });
    return newPages;
  }

  // If exactly 1 remaining remark and its comments fit on continuation sheet (<= 16):
  // Put it on Sheet 2, and supply blank Sheet 3 (final sign-off)
  if (
    remainingRemarks.length === 1 &&
    remainingRemarks[0].comments.length <= CONTINUATION_COMMENT_LIMIT
  ) {
    newPages.push({ panelRemarks: [remainingRemarks[0]] });
    newPages.push({ panelRemarks: [{ panelName: '', comments: [''] }] });
    return newPages;
  }

  // If exactly 2 remaining remarks and their comments fit individually on Sheet 2 and Sheet 3:
  if (
    remainingRemarks.length === 2 &&
    remainingRemarks[0].comments.length <= CONTINUATION_COMMENT_LIMIT &&
    remainingRemarks[1].comments.length <= FINAL_SHEET_COMMENT_LIMIT
  ) {
    newPages.push({ panelRemarks: [remainingRemarks[0]] });
    newPages.push({ panelRemarks: [remainingRemarks[1]] });
    return newPages;
  }

  // General multi-remark packing loop for Sheet 2..N
  const queue = remainingRemarks.map((r) => ({
    panelName: r.panelName,
    comments: [...r.comments],
    isClient: r.isClient,
  }));

  while (queue.length > 0) {
    // Check if everything remaining in queue fits comfortably on the Final Sign-off Sheet
    // Only if we already have at least 2 pages (Sheet 1 + Sheet 2)
    const totalRemainingComments = queue.reduce((acc, r) => acc + r.comments.length, 0);

    if (newPages.length >= 2 && totalRemainingComments <= FINAL_SHEET_COMMENT_LIMIT) {
      newPages.push({ panelRemarks: queue.splice(0, queue.length) });
      break;
    }

    // Otherwise, pack a continuation sheet (capacity up to CONTINUATION_COMMENT_LIMIT)
    const currentSheetRemarks = [];
    let currentCapacity = CONTINUATION_COMMENT_LIMIT;

    while (queue.length > 0 && currentCapacity > 0) {
      const nextRemark = queue[0];
      const commentCount = nextRemark.comments.length;

      // If adding this remark would exhaust the queue, but the resulting sheet comments
      // would exceed FINAL_SHEET_COMMENT_LIMIT, reserve this remark for the final sign-off sheet
      // to guarantee that the final sheet never overflows vertical capacity.
      const wouldExhaustQueue = queue.length === 1;
      const currentSheetCommentsCount = currentSheetRemarks.reduce(
        (acc, r) => acc + r.comments.length,
        0,
      );
      if (
        wouldExhaustQueue &&
        currentSheetRemarks.length > 0 &&
        currentSheetCommentsCount + commentCount > FINAL_SHEET_COMMENT_LIMIT
      ) {
        break;
      }

      if (commentCount <= currentCapacity) {
        currentSheetRemarks.push(queue.shift());
        currentCapacity -= commentCount;
      } else {
        // If sheet is empty, split this large remark across sheets
        if (currentSheetRemarks.length === 0) {
          const fitComments = nextRemark.comments.slice(0, currentCapacity);
          const overflowComments = nextRemark.comments.slice(currentCapacity);

          currentSheetRemarks.push({
            panelName: nextRemark.panelName,
            comments: fitComments,
            isClient: nextRemark.isClient,
          });

          const baseName = nextRemark.panelName.replace(/\s*\(Continued\)/gi, '').trim();
          queue[0] = {
            panelName: `${baseName} (Continued)`,
            comments: overflowComments,
            isClient: nextRemark.isClient,
          };
          currentCapacity = 0;
        } else {
          // Leave nextRemark to start cleanly on the next sheet
          break;
        }
      }
    }

    if (currentSheetRemarks.length > 0) {
      newPages.push({ panelRemarks: currentSheetRemarks });
    }
  }

  // Guarantee minimum 3 baseline sheets
  while (newPages.length < 3) {
    newPages.splice(newPages.length - 1, 0, {
      panelRemarks: [{ panelName: '', comments: [''] }],
    });
  }

  return newPages;
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
  pages: buildDefault3Sheets(),
  panelRemarks: [],
  overallRecommendations: '',
  panelVerdict: '',
  verdictLabel: '',
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
 * in interactive screen mode, and renders a pristine typography div
 * in print mode to completely eradicate browser scrollbars and blue thumb dots.
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
    <>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          adjustHeight();
        }}
        rows={rows}
        placeholder={placeholder}
        className={cn(
          'min-h-[44px] w-full resize-none overflow-hidden rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-xs leading-snug text-black shadow-none transition-[height] duration-75 hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden',
          className,
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        {...props}
      />
      <div
        className={cn(
          'hidden print:block w-full text-xs sm:text-sm text-black leading-snug whitespace-pre-wrap break-words py-0.5 font-serif',
          className,
        )}
      >
        {value || ''}
      </div>
    </>
  );
}

export default function SecretaryMinutesDocumentSheet({
  project,
  user,
  milestone,
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
  const loadedProjectIdRef = useRef(null);

  // Sync project props, defense schedule, and saved minutes
  useEffect(() => {
    if (!project?._id) return;
    const loadKey = `${project._id}:${milestone || ''}`;
    if (loadedProjectIdRef.current === loadKey) return;
    loadedProjectIdRef.current = loadKey;

    // Minutes are stored per milestone; only fall back to the latest save when no milestone scope is given
    const milestoneMinutes = milestone ? project?.secretaryMinutesByMilestone?.[milestone] : null;
    const savedMinutes =
      milestoneMinutes && Object.keys(milestoneMinutes).length > 0
        ? milestoneMinutes
        : milestone
          ? null
          : project?.secretaryMinutes;

    if (savedMinutes && Object.keys(savedMinutes).length > 0) {
      const saved = savedMinutes;
      const { chairName, panelMemberNames } = extractCommitteeFromProject(project, user);
      setMinutes((prev) => {
        let pages = saved.pages;
        if (!pages || !Array.isArray(pages) || pages.length < 3) {
          if (saved.panelRemarks && saved.panelRemarks.length > 0) {
            pages = autoAllocateContinuationSheets([{ panelRemarks: saved.panelRemarks }]);
          } else if (Array.isArray(pages) && pages.length > 0) {
            pages = autoAllocateContinuationSheets(pages);
          } else {
            pages = buildDefault3Sheets(chairName, panelMemberNames);
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

      const { chairName, panelMemberNames, secretaryName, adviserName } =
        extractCommitteeFromProject(project, user);

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
        const defaultPages = buildDefault3Sheets(chairName, panelMemberNames);

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
  }, [project, user, milestone]);

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

  // Dynamic page handlers: Insert continuation page right before the final page (or after specified index)
  const handleAddContinuationPage = (insertIndex = null) => {
    setMinutes((prev) => {
      const currentPages = [...(prev.pages || [])];
      // Target index is inserted right before the final page by default
      const targetIndex = insertIndex !== null ? insertIndex : Math.max(1, currentPages.length - 1);

      const newPage = {
        panelRemarks: [
          {
            panelName: '',
            comments: [''],
          },
        ],
      };

      currentPages.splice(targetIndex, 0, newPage);
      return {
        ...prev,
        pages: currentPages,
      };
    });
    toast.info('Continuation page inserted before the final sign-off sheet.');
  };

  const handleRemovePage = (pageIdx) => {
    if (minutes.pages.length <= 3) {
      toast.error(
        'Cannot remove baseline 3 sheets (opening, continuation, or final sign-off pages).',
      );
      return;
    }
    if (pageIdx === 0) {
      toast.error('Cannot remove Page 1 (Opening Sheet).');
      return;
    }
    if (pageIdx === minutes.pages.length - 1) {
      toast.error('Cannot remove the Final Sign-off Sheet.');
      return;
    }
    setMinutes((prev) => {
      const nextPages = prev.pages.filter((_, idx) => idx !== pageIdx);
      return {
        ...prev,
        pages: nextPages,
      };
    });
    toast.info(`Continuation Page ${pageIdx + 1} removed.`);
  };

  // Row migration between pages
  const handleMovePanelRowUp = (pageIdx, panelIdx) => {
    if (pageIdx <= 0) return;
    setMinutes((prev) => {
      const nextPages = [...prev.pages];
      const sourcePage = nextPages[pageIdx];
      const targetPage = nextPages[pageIdx - 1];
      if (!sourcePage || !targetPage) return prev;

      const rowToMove = sourcePage.panelRemarks[panelIdx];
      const nextSourceRemarks = sourcePage.panelRemarks.filter((_, i) => i !== panelIdx);
      const nextTargetRemarks = [...targetPage.panelRemarks, rowToMove];

      nextPages[pageIdx] = {
        ...sourcePage,
        panelRemarks:
          nextSourceRemarks.length > 0 ? nextSourceRemarks : [{ panelName: '', comments: [''] }],
      };
      nextPages[pageIdx - 1] = {
        ...targetPage,
        panelRemarks: nextTargetRemarks,
      };
      return { ...prev, pages: nextPages };
    });
    toast.success(`Moved row to Page ${pageIdx}.`);
  };

  const handleMovePanelRowDown = (pageIdx, panelIdx) => {
    if (pageIdx >= minutes.pages.length - 1) return;
    setMinutes((prev) => {
      const nextPages = [...prev.pages];
      const sourcePage = nextPages[pageIdx];
      const targetPage = nextPages[pageIdx + 1];
      if (!sourcePage || !targetPage) return prev;

      const rowToMove = sourcePage.panelRemarks[panelIdx];
      const nextSourceRemarks = sourcePage.panelRemarks.filter((_, i) => i !== panelIdx);
      const nextTargetRemarks = [rowToMove, ...targetPage.panelRemarks];

      nextPages[pageIdx] = {
        ...sourcePage,
        panelRemarks:
          nextSourceRemarks.length > 0 ? nextSourceRemarks : [{ panelName: '', comments: [''] }],
      };
      nextPages[pageIdx + 1] = {
        ...targetPage,
        panelRemarks: nextTargetRemarks,
      };
      return { ...prev, pages: nextPages };
    });
    toast.success(`Moved row to Page ${pageIdx + 2}.`);
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

      // Distribute scanned remarks across at least 3 pages matching BukSU Form OVPAA-F-INS-032
      const ocrPages = autoAllocateContinuationSheets(remarks.map((r) => ({ panelRemarks: [r] })));

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
        panelVerdict: data.panelVerdict ?? '',
        verdictLabel: data.verdictLabel ?? '',
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

    const { chairName, panelMemberNames, secretaryName, adviserName } = extractCommitteeFromProject(
      project,
      user,
    );

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
      // Build 3 authentic sheets by default:
      // Page 1: Opening Sheet with Chair
      // Page 2: Continuation Sheet with Member 1
      // Page 3: Final Sign-off Sheet with Member 2
      const pagesToSet = buildDefault3Sheets(chairName, panelMemberNames);

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
        pages: pagesToSet,
      };
    });

    toast.info(
      'Project title, proponents, defense schedule, and committee roster autofilled across 3 sheets.',
    );
  };

  // Load official BukSU prototype defense sample from PDF
  const handleLoadOfficialReference = () => {
    setMinutes({
      ...REFERENCE_PROTOTYPE_MINUTES,
    });
    toast.success('Loaded official BukSU Prototype Defense Minutes (Form OVPAA-F-INS-032)!');
  };

  // Reset form to blank baseline (Opening, Continuation, and Final Sign-off sheets)
  const handleClearForm = () => {
    const { chairName, panelMemberNames } = extractCommitteeFromProject(project, user);
    setMinutes({
      ...INITIAL_MINUTES_STATE,
      pages: buildDefault3Sheets(chairName, panelMemberNames),
    });
    setScanFilename('');
    toast.info('Secretary minutes cleared to opening, continuation, and final sign-off sheets.');
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
        milestone,
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
        milestone,
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
          milestone,
          minutesData: updatedMinutes,
          syncToADM: false,
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
          milestone,
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

  // Only the appointed secretary (or the instructor, who has oversight) may edit; only the secretary signs.
  const minutesPermissions = resolveMinutesPermissions(project, user);
  const isProjectArchived = project?.isArchived === true || project?.projectStatus === 'archived';
  const isUserSecretary = !isProjectArchived && (!user || minutesPermissions.canEdit);
  const canSignMinutes = !isProjectArchived && (!user || minutesPermissions.canSign);
  const isReadOnlyMinutes = isProjectArchived || (Boolean(user) && !minutesPermissions.canEdit);

  const isSigned = Boolean(minutes.signature?.signed);
  const signatureData = minutes.signature;
  const designatedSecName =
    project?.defenseCommittees?.capstone2?.secretary?.fullName ||
    project?.defenseCommittees?.capstone1?.secretary?.fullName ||
    (project?.secretaryId?.firstName && project?.secretaryId?.lastName
      ? `${project.secretaryId.firstName} ${project.secretaryId.lastName}`
      : project?.secretaryId?.name || '');

  const signatoryNameDisplay =
    signatureData?.signatoryName ||
    minutes.secretarySignatoryName ||
    minutes.secretary ||
    designatedSecName ||
    'Committee Secretary';

  const totalPages = minutes.pages?.length || 1;

  return (
    <div className={`space-y-6 print:space-y-0 print:m-0 print:p-0 ${className}`}>
      {/* ── DEDICATED PRINT STYLESHEET (100% Page Isolation & Full Paper Margin Control) ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body, #root, main, .main-content {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .h-screen, .overflow-hidden, .overflow-y-auto {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          aside, nav, header, footer, [role="navigation"], [role="status"], [role="region"], .no-print, .print\\:hidden, [data-sonner-toaster], .toaster, #toast-container, button:not(.print-preserve) {
            display: none !important;
          }
          /* Strip all outer layout margins/paddings from ancestors so sheets start at top y = 0 */
          #root *:not(.secretary-minutes-page, .secretary-minutes-page *) {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          #root .cms-route-enter,
          #root .space-y-6,
          #root .grid,
          #root [class*="col-span"] {
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
          }
          #root .secretary-sheet-paper-container,
          .secretary-sheet-paper-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            display: block !important;
          }
          .secretary-sheet-paper-container > * {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .secretary-sheet-paper-container > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          #root .secretary-minutes-page,
          #root div.secretary-minutes-page,
          .secretary-sheet-paper-container .secretary-minutes-page,
          .secretary-minutes-page {
            position: relative !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 296mm !important;
            min-height: 296mm !important;
            max-height: 296mm !important;
            margin: 0 auto !important;
            padding: 8mm 14mm 6mm 14mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          #root .secretary-minutes-page:not(:last-child),
          #root div.secretary-minutes-page:not(:last-child),
          .secretary-sheet-paper-container .secretary-minutes-page:not(:last-child),
          .secretary-minutes-page:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #root .secretary-minutes-page:last-child,
          #root div.secretary-minutes-page:last-child,
          .secretary-sheet-paper-container .secretary-minutes-page:last-child,
          .secretary-minutes-page:last-child,
          #root .secretary-minutes-page.is-last-page,
          #root div.secretary-minutes-page.is-last-page,
          .secretary-sheet-paper-container .secretary-minutes-page.is-last-page,
          .secretary-minutes-page.is-last-page,
          [data-last-page="true"] {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-after: auto !important;
            break-after: auto !important;
            margin-bottom: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #root .secretary-minutes-footer,
          .secretary-minutes-page .secretary-minutes-footer,
          .secretary-minutes-footer {
            position: relative !important;
            bottom: auto !important;
            left: auto !important;
            right: auto !important;
            width: 100% !important;
            margin: 0 !important;
            margin-top: auto !important;
            padding-top: 1mm !important;
            background: white !important;
            flex-shrink: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .secretary-minutes-page .buksu-header {
            min-height: 0 !important;
            padding-bottom: 1mm !important;
          }
          .secretary-minutes-page .page-content-wrapper {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            max-height: calc(296mm - 16mm) !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .secretary-minutes-page .page-content-wrapper > * + * {
            margin-top: 1mm !important;
          }
          .secretary-minutes-page .space-y-2\\.5,
          .secretary-minutes-page div[class*="space-y-2"] {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .secretary-minutes-page .space-y-2\\.5 > * + *,
          .secretary-minutes-page div[class*="space-y-2"] > * + * {
            margin-top: 0.75mm !important;
          }
          .secretary-minutes-page .space-y-1 > * + *,
          .secretary-minutes-page .space-y-0\\.5 > * + * {
            margin-top: 0.4mm !important;
          }
          .secretary-minutes-page .space-y-2\\.5 input,
          .secretary-minutes-page .space-y-2\\.5 span,
          .secretary-minutes-page .space-y-2\\.5 button {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .secretary-minutes-page .minutes-table-wrapper {
            min-height: 0 !important;
            padding-top: 0 !important;
          }
          .secretary-minutes-page table {
            font-size: 7.5pt !important;
            line-height: 1.12 !important;
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: fixed !important;
            min-height: 0 !important;
          }
          .secretary-minutes-page tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .secretary-minutes-page td, .secretary-minutes-page th {
            padding: 1.2px 3.5px !important;
            word-break: break-word !important;
          }
          .secretary-minutes-page ul {
            margin: 0 !important;
            padding-left: 12px !important;
          }
          .secretary-minutes-page li {
            margin-bottom: 0.5px !important;
          }
          .secretary-minutes-page ul li + li {
            margin-top: 0.8px !important;
          }
          .secretary-minutes-page img {
            max-height: 48px !important;
            max-width: 48px !important;
          }
          .secretary-minutes-page h1 {
            font-size: 9.5pt !important;
            line-height: 1.15 !important;
          }
          .secretary-minutes-page h2 {
            font-size: 10pt !important;
            line-height: 1.15 !important;
          }
          .secretary-minutes-page textarea,
          .secretary-minutes-page input {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          .secretary-minutes-page textarea::-webkit-scrollbar,
          .secretary-minutes-page input::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          #root .secretary-sheet-paper-container button.print-preserve,
          body:has(.secretary-sheet-paper-container) button.print-preserve,
          .secretary-minutes-page button.print-preserve,
          .print-preserve {
            display: inline-flex !important;
          }
          .secretary-minutes-page .final-signoff-section {
            margin-top: 3mm !important;
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            padding-top: 1.5mm !important;
          }
          .secretary-minutes-page .final-signoff-section > * + * {
            margin-top: 1.5mm !important;
          }
          .secretary-minutes-page .final-signoff-section .signature-block-container {
            margin-top: auto !important;
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
                  <Spinner className="h-3.5 w-3.5" />
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

          {isUserSecretary && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutofillFromProject}
              disabled={!project}
              className="gap-1.5 text-xs h-8"
              title="Autofill project title, proponents, adviser, and panel members from project database"
            >
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              Autofill from Project
            </Button>
          )}

          {isUserSecretary && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setMinutes((prev) => ({
                  ...prev,
                  pages: autoAllocateContinuationSheets(prev.pages),
                }));
                toast.success('Remarks distributed across balanced sheets.');
              }}
              className="gap-1.5 text-xs h-8 text-primary border-primary/40 hover:bg-primary/5"
              title="Automatically balance comments and continuation sheets across pages"
              data-testid="auto-distribute-btn"
            >
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              Balance Pages
            </Button>
          )}

          {isUserSecretary && (
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
          )}

          {isUserSecretary && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddContinuationPage()}
              className="gap-1.5 text-xs h-8 text-primary border-primary/40 hover:bg-primary/5"
              title="Insert a continuation page before the final sign-off sheet"
              data-testid="add-page-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Continuation Page
            </Button>
          )}

          {isUserSecretary && (
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
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              Sync to ADM
            </Button>
          )}

          {canSignMinutes && !isSigned && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenSignModal}
              className="min-h-[44px] gap-1.5 text-xs text-success border-success/40 hover:bg-success/10 sm:min-h-8 sm:h-8"
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
              disabled={isSaving || isReadOnlyMinutes}
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
            disabled={isReadOnlyMinutes}
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
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-primary/40 bg-primary/5 p-4 flex items-center gap-3 no-print"
        >
          <Spinner className="h-5 w-5 shrink-0 text-primary" />
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
      <fieldset
        disabled={isReadOnlyMinutes}
        className="m-0 min-w-0 border-0 p-0"
        data-testid="secretary-minutes-fieldset"
        data-readonly={isReadOnlyMinutes ? 'true' : 'false'}
      >
        <div
          id="secretary-minutes-paper"
          className="secretary-sheet-paper-container max-w-4xl mx-auto space-y-10"
        >
          {minutes.pages.map((page, pageIdx) => {
            const isFirstPage = pageIdx === 0;
            const isLastPage = pageIdx === totalPages - 1;
            const pageNumber = pageIdx + 1;

            return (
              <React.Fragment key={pageIdx}>
                <div
                  className={cn(
                    'secretary-minutes-page bg-white text-black font-serif shadow-lg border border-border min-h-[1050px] p-8 sm:p-12 relative flex flex-col justify-between rounded-xs',
                    isLastPage && 'is-last-page',
                  )}
                  data-testid={`secretary-minutes-page-${pageNumber}`}
                  data-page={isFirstPage ? '1' : isLastPage ? 'final' : 'continuation'}
                  data-last-page={isLastPage ? 'true' : undefined}
                >
                  {/* Top Section */}
                  <div className="page-content-wrapper space-y-3 sm:space-y-4 flex-1 flex flex-col">
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
                      <div className="pt-2 pb-1 flex items-center justify-between border-b border-border print:border-b-0 pb-2">
                        <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                          SECRETARY’S MINUTES (CONTINUATION)
                        </h2>
                        {!isLastPage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePage(pageIdx)}
                            className="min-h-[44px] gap-1 font-sans text-xs font-medium text-destructive hover:underline no-print sm:min-h-8"
                            title="Remove this continuation page"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove Page {pageNumber}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Metadata Fields Section (Rendered on Page 1) */}
                    {isFirstPage && (
                      <div className="space-y-2.5 text-xs sm:text-sm text-black">
                        {/* Title of Paper */}
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-black shrink-0">Title of Paper:</span>
                          <Input
                            type="text"
                            value={minutes.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="Project Workspace: Capstone Management System with Plagiarism Checker"
                            className="h-auto min-h-[44px] min-w-0 flex-1 rounded-none border-0 border-b border-transparent bg-transparent px-1 py-0.5 text-xs font-bold text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden"
                            data-testid="minutes-title-input"
                          />
                          <span className="hidden print:inline flex-1 font-bold text-black text-xs sm:text-sm">
                            {minutes.title ||
                              'Project Workspace: Capstone Management System with Plagiarism Checker'}
                          </span>
                        </div>

                        {/* Name of Proponents (Indented) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-black">Name of Proponents:</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleAddProponent}
                              className="min-h-[44px] gap-1 font-sans text-[11px] text-primary hover:underline no-print sm:min-h-8"
                            >
                              <Plus className="h-3 w-3" /> Add Proponent
                            </Button>
                          </div>
                          <div className="pl-6 sm:pl-10 space-y-0.5 font-normal">
                            {minutes.proponents.length === 0 ? (
                              <div className="italic text-muted-foreground text-xs py-1 no-print">
                                No proponents listed. Click &quot;Autofill from Project&quot; or
                                &quot;+ Add Proponent&quot;.
                              </div>
                            ) : (
                              minutes.proponents.map((proponent, idx) => (
                                <div key={idx} className="flex items-center gap-2 group/prop">
                                  <Input
                                    type="text"
                                    value={proponent}
                                    onChange={(e) => handleProponentChange(idx, e.target.value)}
                                    placeholder="Antipuesto, Throylan"
                                    className="h-auto min-h-[44px] min-w-0 flex-1 rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-xs text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden"
                                    data-testid={`minutes-proponent-${idx}`}
                                  />
                                  <span className="hidden print:inline flex-1 text-xs sm:text-sm text-black font-normal">
                                    {proponent}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveProponent(idx)}
                                    className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive opacity-100 sm:min-h-8 sm:min-w-8 sm:opacity-0 sm:group-hover/prop:opacity-100 sm:group-focus-within/prop:opacity-100 no-print"
                                    title="Remove proponent"
                                    aria-label={`Remove proponent ${idx + 1}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
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
                              <React.Fragment key={dt.value}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    handleFieldChange('defenseType', dt.value);
                                    handleFieldChange('defenseTypeLabel', dt.label);
                                  }}
                                  aria-pressed={isChecked}
                                  className="min-h-[44px] gap-1.5 px-2 text-xs text-black transition-opacity hover:opacity-80 sm:min-h-8 sm:text-sm print:hidden"
                                >
                                  <span className="font-bold text-black">
                                    {isChecked ? '(✓)' : '( )'}
                                  </span>
                                  <span
                                    className={isChecked ? 'font-bold text-black' : 'text-black'}
                                  >
                                    {dt.label}
                                  </span>
                                </Button>
                                <span className="hidden print:inline-flex items-center gap-1.5 text-xs sm:text-sm text-black">
                                  <span className="font-bold text-black">
                                    {isChecked ? '(✓)' : '( )'}
                                  </span>
                                  <span
                                    className={isChecked ? 'font-bold text-black' : 'text-black'}
                                  >
                                    {dt.label}
                                  </span>
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Number of Rounds */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black">Number of Rounds:</span>
                          {['1st', '2nd', '3rd'].map((r) => {
                            const isChecked = minutes.round === r;
                            return (
                              <React.Fragment key={r}>
                                <Button
                                  key={r}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFieldChange('round', r)}
                                  aria-pressed={isChecked}
                                  className="min-h-[44px] gap-1 px-2 text-xs text-black transition-opacity hover:opacity-80 sm:min-h-8 sm:text-sm print:hidden"
                                >
                                  <span className="font-bold text-black">
                                    {isChecked ? '(✓)' : '( )'}
                                  </span>
                                  <span
                                    className={isChecked ? 'font-bold text-black' : 'text-black'}
                                  >
                                    {r.slice(0, 1)}
                                    <sup>{r.slice(1)}</sup>
                                  </span>
                                </Button>
                                <span className="hidden print:inline-flex items-center gap-1 text-xs sm:text-sm text-black">
                                  <span className="font-bold text-black">
                                    {isChecked ? '(✓)' : '( )'}
                                  </span>
                                  <span
                                    className={isChecked ? 'font-bold text-black' : 'text-black'}
                                  >
                                    {r.slice(0, 1)}
                                    <sup>{r.slice(1)}</sup>
                                  </span>
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Date/Time & Venue */}
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-black shrink-0">Date/Time & Venue:</span>
                          <Input
                            type="text"
                            value={minutes.dateTimeVenue}
                            onChange={(e) => handleFieldChange('dateTimeVenue', e.target.value)}
                            placeholder="April 20, 2026 || 9:00am || COT Conference Room"
                            className="h-auto min-h-[44px] min-w-0 flex-1 rounded-none border-0 border-b border-transparent bg-transparent px-1 py-0.5 text-xs text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden"
                            data-testid="minutes-datetime-venue-input"
                          />
                          <span className="hidden print:inline flex-1 text-xs sm:text-sm text-black">
                            {minutes.dateTimeVenue}
                          </span>
                        </div>

                        {/* Adviser */}
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-black shrink-0">Adviser:</span>
                          <Input
                            type="text"
                            value={minutes.adviser}
                            onChange={(e) => handleFieldChange('adviser', e.target.value)}
                            placeholder="Glaiza Mae Libe"
                            className="h-auto min-h-[44px] min-w-0 flex-1 rounded-none border-0 border-b border-transparent bg-transparent px-1 py-0.5 text-xs text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden"
                            data-testid="minutes-adviser-input"
                          />
                          <span className="hidden print:inline flex-1 text-xs sm:text-sm text-black">
                            {minutes.adviser}
                          </span>
                        </div>

                        {/* Panel Chair/REC */}
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-black shrink-0">Panel Chair/REC:</span>
                          <Input
                            type="text"
                            value={minutes.panelChair}
                            onChange={(e) => handleFieldChange('panelChair', e.target.value)}
                            placeholder="Louie Jay S. Labastida"
                            className="h-auto min-h-[44px] min-w-0 flex-1 rounded-none border-0 border-b border-transparent bg-transparent px-1 py-0.5 text-xs font-bold text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden"
                            data-testid="minutes-chair-input"
                          />
                          <span className="hidden print:inline flex-1 font-bold text-xs sm:text-sm text-black">
                            {minutes.panelChair}
                          </span>
                        </div>

                        {/* Panel Members (Indented) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-black">Panel Members:</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleAddPanelMember}
                              className="min-h-[44px] gap-1 font-sans text-[11px] text-primary hover:underline no-print sm:min-h-8"
                            >
                              <Plus className="h-3 w-3" /> Add Member
                            </Button>
                          </div>
                          <div className="pl-6 sm:pl-10 space-y-0.5 font-normal">
                            {minutes.panelMembers.length === 0 ? (
                              <div className="italic text-muted-foreground text-xs py-1 no-print">
                                No panel members listed. Click &quot;Autofill from Project&quot; or
                                &quot;+ Add Member&quot;.
                              </div>
                            ) : (
                              minutes.panelMembers.map((member, idx) => (
                                <div key={idx} className="flex items-center gap-2 group/mem">
                                  <Input
                                    type="text"
                                    value={member}
                                    onChange={(e) => handlePanelMemberChange(idx, e.target.value)}
                                    placeholder="Lecaros, Raul"
                                    className="h-auto min-h-[44px] min-w-0 flex-1 rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-xs text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden"
                                    data-testid={`minutes-panel-member-${idx}`}
                                  />
                                  <span className="hidden print:inline flex-1 text-xs sm:text-sm text-black font-normal">
                                    {member}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemovePanelMember(idx)}
                                    className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive opacity-100 sm:min-h-8 sm:min-w-8 sm:opacity-0 sm:group-hover/mem:opacity-100 sm:group-focus-within/mem:opacity-100 no-print"
                                    title="Remove panel member"
                                    aria-label={`Remove panel member ${idx + 1}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Secretary */}
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-black shrink-0">Secretary:</span>
                          <Input
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
                            className="h-auto min-h-[44px] min-w-0 flex-1 rounded-none border-0 border-b border-transparent bg-transparent px-1 py-0.5 text-xs font-bold text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden"
                            data-testid="minutes-secretary-input"
                          />
                          <span className="hidden print:inline flex-1 font-bold text-xs sm:text-sm text-black">
                            {minutes.secretary}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Table: Name of Panel | COMMENTS/SUGGESTIONS */}
                    <div
                      className={cn(
                        'minutes-table-wrapper pt-2',
                        isFirstPage && 'min-h-[220px]',
                        !isFirstPage && !isLastPage && 'min-h-[460px]',
                        isLastPage && 'min-h-[160px]',
                      )}
                    >
                      <table
                        className={cn(
                          'w-full border-collapse border border-black text-xs sm:text-sm',
                          isFirstPage && 'min-h-[200px]',
                          !isFirstPage && !isLastPage && 'min-h-[440px]',
                          isLastPage && 'min-h-[140px]',
                        )}
                      >
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
                                    <div className="text-xs text-black font-normal mb-0.5">
                                      Client
                                    </div>
                                  )}
                                  <Input
                                    type="text"
                                    value={panel.panelName}
                                    onChange={(e) =>
                                      handlePanelNameChangeOnPage(pageIdx, pIdx, e.target.value)
                                    }
                                    className="h-auto min-h-[44px] w-full rounded-none border-0 border-b border-transparent bg-transparent px-1 py-0.5 text-xs font-bold text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden"
                                    placeholder={
                                      isFirstPage && pIdx === 0
                                        ? 'Louie Jay Labastida'
                                        : 'Panel Member Name'
                                    }
                                    data-testid={`panel-name-input-${pageIdx}-${pIdx}`}
                                  />
                                  <div className="hidden print:block font-bold text-xs sm:text-sm text-black whitespace-pre-wrap">
                                    {panel.panelName}
                                  </div>
                                  <div className="mt-2 flex items-center gap-1.5 opacity-100 transition-opacity no-print sm:opacity-0 sm:group-hover/paneltd:opacity-100 sm:group-focus-within/paneltd:opacity-100">
                                    {pageIdx > 0 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMovePanelRowUp(pageIdx, pIdx)}
                                        className="min-h-[44px] gap-0.5 px-2 font-sans text-[10px] text-primary sm:min-h-8"
                                        title="Move row to previous page"
                                      >
                                        ↑ Page {pageIdx}
                                      </Button>
                                    )}
                                    {pageIdx < totalPages - 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMovePanelRowDown(pageIdx, pIdx)}
                                        className="min-h-[44px] gap-0.5 px-2 font-sans text-[10px] text-primary sm:min-h-8"
                                        title="Move row to next page"
                                      >
                                        ↓ Page {pageIdx + 2}
                                      </Button>
                                    )}
                                    {page.panelRemarks.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemovePanelRowFromPage(pageIdx, pIdx)}
                                        className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive sm:min-h-8 sm:min-w-8"
                                        title="Delete this panel row"
                                        aria-label={`Delete panel row ${pIdx + 1}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
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
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() =>
                                                handleRemoveCommentOnPage(pageIdx, pIdx, cIdx)
                                              }
                                              className="min-h-[44px] min-w-[44px] shrink-0 text-muted-foreground hover:text-destructive opacity-100 sm:min-h-8 sm:min-w-8 sm:opacity-0 sm:group-hover/bullet:opacity-100 sm:group-focus-within/bullet:opacity-100 no-print"
                                              title="Remove comment bullet"
                                              aria-label={`Remove comment ${cIdx + 1} from panel ${pIdx + 1}`}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </li>
                                      ))
                                    ) : (
                                      <li className="italic text-muted-foreground text-xs list-none no-print">
                                        No comments yet. Click &quot;+ Add Suggestion&quot;.
                                      </li>
                                    )}
                                  </ul>
                                  <div className="mt-2 text-right no-print">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAddCommentOnPage(pageIdx, pIdx)}
                                      className="min-h-[44px] gap-1 font-sans text-[11px] text-primary hover:underline sm:min-h-8"
                                    >
                                      <Plus className="h-3 w-3" /> Add Suggestion
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr className="no-print">
                              <td
                                colSpan={2}
                                className="p-6 text-center text-muted-foreground italic text-xs"
                              >
                                No panel remarks recorded yet. Click &quot;+ Add Panelist Row&quot;
                                or &quot;Autofill from Project&quot;.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {/* Option to Add Rows to this Table */}
                      <div className="flex items-center justify-between pt-1.5 no-print">
                        <span className="text-[11px] text-muted-foreground italic">
                          Tables dynamically allocate space as you type.
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddPanelRowToPage(pageIdx)}
                          className="min-h-[44px] gap-1 font-sans text-xs font-medium text-primary hover:underline sm:min-h-8"
                          title="Add another panelist row to this table"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Panelist Row
                        </Button>
                      </div>
                    </div>

                    {/* Last Page Section: Recommendations, Verdict, and Digital Signature */}
                    {isLastPage && (
                      <div className="final-signoff-section space-y-3 sm:space-y-4 pt-3 text-xs sm:text-sm text-black shrink-0">
                        {/* Overall Recommendations */}
                        <div className="space-y-1">
                          <span className="font-bold text-black block">
                            Overall Recommendations:
                          </span>
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
                                <React.Fragment key={v.value}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      handleFieldChange('panelVerdict', v.value);
                                      handleFieldChange('verdictLabel', v.label);
                                    }}
                                    aria-pressed={isChecked}
                                    className="min-h-[44px] justify-start gap-2 px-2 py-0.5 text-left text-xs text-black hover:opacity-85 sm:min-h-8 sm:text-sm print:hidden"
                                  >
                                    <span className="font-bold text-black w-6">
                                      {isChecked ? '(✓)' : '( )'}
                                    </span>
                                    <span
                                      className={isChecked ? 'font-bold text-black' : 'text-black'}
                                    >
                                      {v.label}
                                    </span>
                                  </Button>
                                  <div className="hidden print:flex items-center gap-2 text-xs sm:text-sm text-left py-0.5 text-black">
                                    <span className="font-bold text-black w-6">
                                      {isChecked ? '(✓)' : '( )'}
                                    </span>
                                    <span
                                      className={isChecked ? 'font-bold text-black' : 'text-black'}
                                    >
                                      {v.label}
                                    </span>
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        {/* Secretary Digital Signature Block (Bottom Right) */}
                        <div className="signature-block-container pt-4 sm:pt-6 pb-2 flex justify-end">
                          <div className="w-80 flex flex-col items-center justify-end text-center space-y-1">
                            {/* 1. TOP: Digital Signature Image or Sign Button */}
                            <div className="h-14 sm:h-16 flex flex-col items-center justify-center w-full">
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
                                  <span className="text-[9px] text-muted-foreground font-mono tracking-tight print:hidden">
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
                              ) : canSignMinutes ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleOpenSignModal}
                                  className="min-h-[44px] gap-1.5 px-3 font-sans text-xs text-primary shadow-xs no-print sm:min-h-8 sm:h-8"
                                >
                                  <PenTool className="h-3 w-3" /> Sign Digitally
                                </Button>
                              ) : (
                                <div className="text-[11px] text-muted-foreground italic font-sans flex items-center gap-1 no-print">
                                  <Clock className="h-3 w-3" /> Pending Secretary Signature
                                </div>
                              )}
                            </div>

                            {/* 2. MIDDLE: Bold Uppercase Printed Name */}
                            <Input
                              type="text"
                              value={signatoryNameDisplay}
                              onChange={(e) => {
                                handleFieldChange(
                                  'secretarySignatoryName',
                                  e.target.value.toUpperCase(),
                                );
                              }}
                              disabled={!canSignMinutes || isSigned}
                              placeholder="COMMITTEE SECRETARY"
                              className="h-auto min-h-[44px] w-full rounded-none border-0 bg-transparent px-1 py-0.5 text-center text-xs font-bold uppercase tracking-wide text-black shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-sm print:hidden disabled:cursor-default"
                              data-testid="minutes-signatory-name"
                            />
                            <span className="hidden print:block text-center font-bold text-xs sm:text-sm uppercase tracking-wide text-black w-full">
                              {signatoryNameDisplay || 'COMMITTEE SECRETARY'}
                            </span>

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
                                  <Badge variant="success" className="gap-1 text-[10px]">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Verified
                                  </Badge>
                                  {canSignMinutes && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleClearSignature}
                                      className="min-h-[44px] text-[10px] text-muted-foreground underline hover:text-destructive sm:min-h-8"
                                      title="Remove signature to re-sign"
                                    >
                                      Re-sign
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
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

                {/* Add Continuation Page Button placed strictly on the bottom outside of Page 1 and continuation sheets (never after final sheet) */}
                {!isLastPage && (
                  <div className="flex justify-center my-4 no-print">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddContinuationPage(pageIdx + 1)}
                      className="gap-2 border-primary/50 bg-background text-xs font-semibold text-primary shadow-xs hover:bg-primary/10"
                      data-testid={`add-continuation-page-btn-${pageNumber}`}
                      title="Insert a continuation page before the final sign-off sheet"
                    >
                      <Plus className="h-4 w-4" /> Add Continuation Page (Insert before Final Sheet)
                    </Button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </fieldset>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SECRETARY DIGITAL SIGNATURE MODAL (CONSISTENT WITH ADM) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={isSignModalOpen}
        onOpenChange={(open) => {
          if (!isSubmittingSignature) setIsSignModalOpen(open);
        }}
      >
        <DialogContent
          aria-labelledby="secretary-sign-modal-title"
          showClose={false}
          onEscapeKeyDown={(event) => {
            if (isSubmittingSignature) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (isSubmittingSignature) event.preventDefault();
          }}
          className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg gap-4 overflow-y-auto rounded-xl border-border bg-card p-4 shadow-lg sm:p-6"
        >
          <DialogHeader className="flex-row items-center justify-between border-b border-border/60 pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PenTool className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle id="secretary-sign-modal-title" className="text-base">
                  Secretary Digital Signature
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  Official Defense Hearing Sign-Off (Form OVPAA-F-INS-032)
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsSignModalOpen(false)}
              disabled={isSubmittingSignature}
              className="min-h-[44px] min-w-[44px] shrink-0 sm:min-h-9 sm:min-w-9"
              aria-label="Close signature dialog"
            >
              <span aria-hidden="true">✕</span>
            </Button>
          </DialogHeader>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Applying your digital signature certifies that these hearing minutes and panel verdict
            are authentic records of the capstone proceedings. This digital signature will also
            synchronize with the Action Done Matrix (ADM) Secretary Endorsement Gate.
          </p>

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
              className="h-11 text-xs sm:h-9"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-medium">Digital Signature</Label>
              {user?.digitalSignature && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsDrawingSignature(!isDrawingSignature);
                    if (!isDrawingSignature) {
                      setSignatureDataUrl(null);
                    } else {
                      setSignatureDataUrl(user.digitalSignature);
                    }
                  }}
                  className="min-h-[44px] text-xs font-medium text-primary sm:min-h-9"
                >
                  {isDrawingSignature ? 'Use Saved Profile Signature' : 'Draw New Signature'}
                </Button>
              )}
            </div>

            {!isDrawingSignature && user?.digitalSignature ? (
              <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border border-border/80 bg-card/60 p-3">
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
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                <SignaturePad
                  onChange={(dataUrl) => setSignatureDataUrl(dataUrl)}
                  onClear={() => setSignatureDataUrl(null)}
                  defaultSignatoryName={typedSignatoryName}
                  height={150}
                />
              </div>
            )}
          </div>

          {isDrawingSignature && (
            <label className="flex min-h-[44px] cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Checkbox
                checked={saveSignatureToProfile}
                onCheckedChange={setSaveSignatureToProfile}
                aria-label="Save this signature to my profile for future documents"
                disabled={isSubmittingSignature}
              />
              <span>Save this signature to my profile for future documents</span>
            </label>
          )}

          <DialogFooter className="border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSignModalOpen(false)}
              disabled={isSubmittingSignature}
              className="min-h-[44px] text-xs sm:min-h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSignature}
              disabled={isSubmittingSignature || (!signatureDataUrl && !user?.digitalSignature)}
              className="min-h-[44px] gap-1.5 text-xs font-medium sm:min-h-9"
            >
              {isSubmittingSignature ? (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm &amp; Sign Minutes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

SecretaryMinutesDocumentSheet.propTypes = {
  project: PropTypes.object,
  user: PropTypes.object,
  milestone: PropTypes.string,
  onMinutesSynced: PropTypes.func,
  className: PropTypes.string,
};

/**
 * Authentic BukSU Institutional Document Header matching OVPAA-F-INS-032
 * Note: Horizontal line removed below university info as per official template refinement.
 */
function BuksuDocumentHeader() {
  return (
    <div className="buksu-header relative pb-2 text-center min-h-[76px] flex flex-col justify-center">
      {/* BukSU Official Seal on Left */}
      <div className="absolute left-0 top-0 flex items-center justify-center">
        <img
          src={buksuLogo}
          alt="BukSU Official Seal"
          className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-none"
        />
      </div>

      <div className="space-y-0.5 px-20 sm:px-24">
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
            className="text-primary underline"
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
  className = '',
}) {
  return (
    <div
      className={cn(
        'secretary-minutes-footer border-t border-black pt-1.5 mt-auto text-[10px] sm:text-[11px] text-black font-sans shrink-0',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-1 text-black">
        <span>Document Code: {documentCode}</span>
        <span className="inline-flex items-center gap-0.5">
          Revision No: <span className="hidden print:inline font-medium">{revisionNo}</span>
          <Input
            type="text"
            value={revisionNo}
            onChange={(e) => onFieldChange?.('revisionNo', e.target.value)}
            className="h-auto min-h-[44px] w-9 rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0 text-center font-sans text-[10px] font-medium text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-[11px] print:hidden"
            title="Edit Revision No"
          />
        </span>
        <span className="inline-flex items-center gap-0.5">
          Issue No: <span className="hidden print:inline font-medium">{issueNo}</span>
          <Input
            type="text"
            value={issueNo}
            onChange={(e) => onFieldChange?.('issueNo', e.target.value)}
            className="h-auto min-h-[44px] w-9 rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0 text-center font-sans text-[10px] font-medium text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-[11px] print:hidden"
            title="Edit Issue No"
          />
        </span>
        <span className="inline-flex items-center gap-0.5">
          Issue Date: <span className="hidden print:inline font-medium">{issueDate}</span>
          <Input
            type="text"
            value={issueDate}
            onChange={(e) => onFieldChange?.('issueDate', e.target.value)}
            className="h-auto min-h-[44px] w-28 rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0 text-center font-sans text-[10px] font-medium text-black shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-0 sm:text-[11px] print:hidden"
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

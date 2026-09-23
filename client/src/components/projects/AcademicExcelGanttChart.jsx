import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Download,
  Filter,
  Plus,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  Pencil,
  Check,
  X,
  Save,
  Trash2,
  Paintbrush,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { downloadExcelGantt, normalizeProgress } from '@/utils/exportExcelGantt';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * 8 Academic Color Themes for Gantt fill boxes
 */
export const COLOR_OPTIONS = [
  {
    id: 'yellow',
    label: 'Planning',
    hex: '#FACC15',
    activeHex: '#EAB308',
    bgClass: 'bg-amber-400',
    borderClass: 'border-amber-500',
    doneClass: 'bg-[#FACC15] border-y border-[#CA8A04]',
    planClass: 'bg-[#FEF9C3] dark:bg-yellow-950/40 border-y border-[#EAB308]/40',
  },
  {
    id: 'green',
    label: 'Backend & Infra',
    hex: '#22C55E',
    activeHex: '#16A34A',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-600',
    doneClass: 'bg-[#22C55E] border-y border-[#16A34A]',
    planClass: 'bg-[#DCFCE7] dark:bg-emerald-950/40 border-y border-[#22C55E]/40',
  },
  {
    id: 'blue',
    label: 'UI/UX & Integration',
    hex: '#3B82F6',
    activeHex: '#2563EB',
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-600',
    doneClass: 'bg-[#3B82F6] border-y border-[#2563EB]',
    planClass: 'bg-[#DBEAFE] dark:bg-blue-950/40 border-y border-[#3B82F6]/40',
  },
  {
    id: 'orange',
    label: 'Testing & QA',
    hex: '#F97316',
    activeHex: '#EA580C',
    bgClass: 'bg-orange-500',
    borderClass: 'border-orange-600',
    doneClass: 'bg-[#F97316] border-y border-[#EA580C]',
    planClass: 'bg-[#FFEDD5] dark:bg-orange-950/40 border-y border-[#F97316]/40',
  },
  {
    id: 'purple',
    label: 'Documentation',
    hex: '#A855F7',
    activeHex: '#9333EA',
    bgClass: 'bg-purple-500',
    borderClass: 'border-purple-600',
    doneClass: 'bg-[#A855F7] border-y border-[#9333EA]',
    planClass: 'bg-[#F3E8FF] dark:bg-purple-950/40 border-y border-[#A855F7]/40',
  },
  {
    id: 'rose',
    label: 'Milestones',
    hex: '#F43F5E',
    activeHex: '#E11D48',
    bgClass: 'bg-rose-500',
    borderClass: 'border-rose-600',
    doneClass: 'bg-[#F43F5E] border-y border-[#E11D48]',
    planClass: 'bg-[#FFE4E6] dark:bg-rose-950/40 border-y border-[#F43F5E]/40',
  },
  {
    id: 'teal',
    label: 'DevOps & Cloud',
    hex: '#14B8A6',
    activeHex: '#0D9488',
    bgClass: 'bg-teal-500',
    borderClass: 'border-teal-600',
    doneClass: 'bg-[#14B8A6] border-y border-[#0D9488]',
    planClass: 'bg-[#CCFBF1] dark:bg-teal-950/40 border-y border-[#14B8A6]/40',
  },
  {
    id: 'indigo',
    label: 'Architecture',
    hex: '#6366F1',
    activeHex: '#4F46E5',
    bgClass: 'bg-indigo-500',
    borderClass: 'border-indigo-600',
    doneClass: 'bg-[#6366F1] border-y border-[#4F46E5]',
    planClass: 'bg-[#E0E7FF] dark:bg-indigo-950/40 border-y border-[#6366F1]/40',
  },
];

/**
 * Weeks Metadata: 12 weeks mapped to 4 phases
 */
const WEEKS_METADATA = [
  { weekNum: 1, phaseIndex: 0, label: 'Planning' },
  { weekNum: 2, phaseIndex: 0, label: 'Data collection' },
  { weekNum: 3, phaseIndex: 0, label: 'Annotation & validation' },
  { weekNum: 4, phaseIndex: 1, label: 'Initial training' },
  { weekNum: 5, phaseIndex: 1, label: 'Testing & refinement' },
  { weekNum: 6, phaseIndex: 1, label: 'Integration & real-time detection' },
  { weekNum: 7, phaseIndex: 2, label: 'Crushing risk logic' },
  { weekNum: 8, phaseIndex: 2, label: 'Health & analytics' },
  { weekNum: 9, phaseIndex: 2, label: 'Prediction validation' },
  { weekNum: 10, phaseIndex: 3, label: 'Integration' },
  { weekNum: 11, phaseIndex: 3, label: 'Testing & optimization' },
  { weekNum: 12, phaseIndex: 3, label: 'Documentation & defense prep' },
];

const PHASES = [
  {
    name: 'PHASE ONE',
    weeksSpan: 3,
    daySpan: 15,
    headerBg: 'bg-[#1E293B]',
    weekBg: 'bg-[#334155]',
    colorText: 'text-white',
  },
  {
    name: 'PHASE TWO',
    weeksSpan: 3,
    daySpan: 15,
    headerBg: 'bg-[#14532D]',
    weekBg: 'bg-[#166534]',
    colorText: 'text-white',
  },
  {
    name: 'PHASE THREE',
    weeksSpan: 3,
    daySpan: 15,
    headerBg: 'bg-[#475569]',
    weekBg: 'bg-[#64748B]',
    colorText: 'text-white',
  },
  {
    name: 'PHASE FOUR',
    weeksSpan: 3,
    daySpan: 15,
    headerBg: 'bg-[#854D0E]',
    weekBg: 'bg-[#A16207]',
    colorText: 'text-white',
  },
];

/** Fixed left pane width so we can set the right panel's left offset */
const LEFT_PANE_WIDTH = 510;

/**
 * Calculate working days between two dates (Mon-Fri), inclusive.
 */
function calcWorkingDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start) || isNaN(end) || end < start) return 1;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count);
}

/**
 * Add working days (Mon-Fri) to a start date.
 */
export function addWorkingDays(startDateStr, days) {
  const d = new Date(startDateStr);
  if (isNaN(d)) return startDateStr;
  let added = 1;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Gantt start date (2026-03-09 Monday = col 0).
 */
export const GANTT_START = new Date('2026-03-09');

/**
 * Derive the day column index (0-based Mon-Fri) from a date string.
 */
export function dateToDayCol(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return 0;
  let col = 0;
  const cur = new Date(GANTT_START);
  while (cur < d) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) col++;
    cur.setDate(cur.getDate() + 1);
  }
  return col;
}

/**
 * Convert a day column index (0-based Mon-Fri) back to YYYY-MM-DD.
 */
export function dayColToDate(col) {
  const d = new Date(GANTT_START);
  let counted = 0;
  while (counted < col) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) counted++;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Canonical proponent list fallback — used when no team members exist.
 * Ordered "Last, First" for display.
 */
export const CANONICAL_MEMBERS = [
  'Añedez, Patrick Josh',
  'Antipuesto, Throylan',
  'Bautista, Steven Joe',
  'Canoy, Chijay',
];

/**
 * Extract actual active team members from project object.
 * Checks teamId.leaderId, teamId.members, teamId.memberRoles, project.team.members.
 */
export function extractProjectMembers(project) {
  const teamObj = project?.teamId || project?.team;
  const members = [];
  const seen = new Set();

  const add = (rawUser) => {
    if (!rawUser) return;
    const user = rawUser.userId || rawUser;
    if (!user) return;

    if (typeof user === 'string') {
      const trimmed = user.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        members.push(trimmed);
      }
      return;
    }
    const id = user._id || user.id || user.email;
    if (id && seen.has(id)) return;
    if (id) seen.add(id);

    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    const full = (user.fullName || '').trim();

    let formatted = '';
    if (last && first) {
      formatted = `${last}, ${first}`;
    } else if (full) {
      formatted = full;
    } else if (first) {
      formatted = first;
    } else if (last) {
      formatted = last;
    } else if (user.email) {
      formatted = user.email;
    }

    if (formatted && !seen.has(formatted)) {
      seen.add(formatted);
      members.push(formatted);
    }
  };

  // 1. Team Leader
  if (teamObj?.leaderId) {
    add(teamObj.leaderId);
  }

  // 2. Team Members
  if (Array.isArray(teamObj?.members)) {
    teamObj.members.forEach(add);
  }

  // 3. Member Roles
  if (Array.isArray(teamObj?.memberRoles)) {
    teamObj.memberRoles.forEach((mr) => add(mr.userId));
  }

  // 4. Project direct members
  if (Array.isArray(project?.members)) {
    project.members.forEach(add);
  }

  return members;
}

/**
 * Extract adviser display name from project object.
 */
export function extractProjectAdviser(project) {
  const adv = project?.adviserId || project?.teamId?.adviserId || project?.team?.adviserId;
  if (!adv) return 'Pending';
  if (typeof adv === 'string') return adv;
  if (adv.fullName) return adv.fullName;
  if (adv.firstName || adv.lastName) {
    return `${adv.firstName || ''} ${adv.lastName || ''}`.trim();
  }
  if (adv.name) return adv.name;
  return 'Pending';
}

/**
 * Extract instructor display name from project object.
 */
export function extractProjectInstructor(project) {
  const inst =
    project?.instructorId ||
    project?.teamId?.instructorId ||
    project?.team?.instructorId ||
    project?.teamId?.leaderId?.instructorId ||
    project?.team?.leaderId?.instructorId;
  if (!inst) return 'Pending';
  if (typeof inst === 'string') return inst;
  if (inst.fullName) return inst.fullName;
  if (inst.firstName || inst.lastName) {
    return `${inst.firstName || ''} ${inst.lastName || ''}`.trim();
  }
  if (inst.name) return inst.name;
  return 'Pending';
}

export const DEFAULT_ACADEMIC_SECTIONS = [
  'SECTION 1 — PROJECT PLANNING & RESEARCH',
  'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
  'SECTION 3 — INFRASTRUCTURE SETUP',
  'SECTION 4 — BACKEND FOUNDATION',
  'SECTION 18 — SPLIT-SCREEN DOCUMENT VIEWER',
  'SECTION 19 — INTEGRATION & SECURITY HARDENING',
  'SECTION 20 — TESTING & QA',
  'SECTION 21 — DEPLOYMENT & DOCUMENTATION',
];

export const DEFAULT_ACADEMIC_TASKS = [
  // SECTION 1
  {
    id: 'PLAN-01',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Project kickoff, scope alignment and deliverables sign-off',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-09',
    dueDate: '2026-03-11',
    durationDays: 3,
    progress: 1.0,
    startDayCol: 0,
    category: 'yellow',
  },
  {
    id: 'PLAN-02',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Objective 1 — existing literature review and research gap analysis',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-09',
    dueDate: '2026-03-11',
    durationDays: 3,
    progress: 1.0,
    startDayCol: 0,
    category: 'yellow',
  },
  {
    id: 'PLAN-03',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Stakeholder interviews (students, advisers, instructors, panelists)',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-09',
    dueDate: '2026-03-12',
    durationDays: 4,
    progress: 1.0,
    startDayCol: 0,
    category: 'yellow',
  },
  {
    id: 'PLAN-04',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Survey design, distribution and data collection',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-10',
    dueDate: '2026-03-12',
    durationDays: 3,
    progress: 1.0,
    startDayCol: 1,
    category: 'yellow',
  },
  {
    id: 'PLAN-05',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Compile survey / interview results into requirements data table',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-12',
    dueDate: '2026-03-13',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 3,
    category: 'yellow',
  },
  {
    id: 'PLAN-06',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Map functional requirements to CMS features',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-12',
    dueDate: '2026-03-13',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 3,
    category: 'yellow',
  },
  {
    id: 'PLAN-07',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Identify non-functional requirements (performance, security, uptime)',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-13',
    dueDate: '2026-03-13',
    durationDays: 1,
    progress: 1.0,
    startDayCol: 4,
    category: 'yellow',
  },
  // SECTION 2
  {
    id: 'ARCH-01',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'Finalize SRS and requirements baseline document',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-16',
    dueDate: '2026-03-18',
    durationDays: 3,
    progress: 1.0,
    startDayCol: 5,
    category: 'yellow',
  },
  {
    id: 'ARCH-02',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'Objective 2 — architectural pattern selection and justification',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-16',
    dueDate: '2026-03-17',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 5,
    category: 'yellow',
  },
  {
    id: 'ARCH-03',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'System context diagram (Level 0 DFD) and actor boundary',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-17',
    dueDate: '2026-03-17',
    durationDays: 1,
    progress: 1.0,
    startDayCol: 6,
    category: 'yellow',
  },
  {
    id: 'ARCH-04',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'Level 1 DFD — data flows across all CMS subsystems',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-17',
    dueDate: '2026-03-18',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 6,
    category: 'yellow',
  },
  {
    id: 'ARCH-05',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'Entity Relationship Diagram (ERD) — all MongoDB collections',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-18',
    dueDate: '2026-03-19',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 7,
    category: 'yellow',
  },
  {
    id: 'ARCH-06',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'MongoDB schema design — User, Team, OTP, RefreshToken collections',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-18',
    dueDate: '2026-03-19',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 7,
    category: 'yellow',
  },
  {
    id: 'ARCH-07',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'MongoDB schema design — Project, Submission, Notification, Audit',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-19',
    dueDate: '2026-03-20',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 8,
    category: 'yellow',
  },
  {
    id: 'ARCH-08',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'MongoDB indexing strategy (compound, TTL, text indexes)',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-20',
    dueDate: '2026-03-20',
    durationDays: 1,
    progress: 1.0,
    startDayCol: 9,
    category: 'yellow',
  },
  {
    id: 'ARCH-09',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'Use case diagram (all 4 roles — complete system scope)',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-03-20',
    dueDate: '2026-03-24',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 9,
    category: 'yellow',
  },
  {
    id: 'ARCH-11',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'REST API contract — auth, user, team endpoints (OpenAPI spec)',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-23',
    dueDate: '2026-03-24',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 10,
    category: 'green',
  },
  {
    id: 'ARCH-14',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'UI wireframes — Shared dashboard and all workflow views',
    owner: 'Canoy, Chijay',
    startDate: '2026-03-23',
    dueDate: '2026-03-25',
    durationDays: 3,
    progress: 1.0,
    startDayCol: 10,
    category: 'orange',
  },
  {
    id: 'ARCH-15',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'UI wireframes — Section and Panelist dashboard pages',
    owner: 'Canoy, Chijay',
    startDate: '2026-03-25',
    dueDate: '2026-03-26',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 12,
    category: 'orange',
  },
  // SECTION 3
  {
    id: 'INFRA-01',
    section: 'SECTION 3 — INFRASTRUCTURE SETUP',
    title: 'Docker Compose service orchestration (MongoDB, Redis, MinIO, CMS)',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-23',
    dueDate: '2026-03-25',
    durationDays: 3,
    progress: 1.0,
    startDayCol: 10,
    category: 'green',
  },
  {
    id: 'INFRA-02',
    section: 'SECTION 3 — INFRASTRUCTURE SETUP',
    title: 'MinIO S3-compatible bucket provisioning and CORS policy setup',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-25',
    dueDate: '2026-03-26',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 12,
    category: 'green',
  },
  // SECTION 4
  {
    id: 'BE-01',
    section: 'SECTION 4 — BACKEND FOUNDATION',
    title: 'Express.js 5 route scaffolding and middleware pipeline',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-26',
    dueDate: '2026-03-27',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 13,
    category: 'green',
  },
  {
    id: 'BE-02',
    section: 'SECTION 4 — BACKEND FOUNDATION',
    title: 'JWT authentication, OTP verification and refresh token rotation',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-27',
    dueDate: '2026-03-30',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 14,
    category: 'green',
  },
  {
    id: 'BE-03',
    section: 'SECTION 4 — BACKEND FOUNDATION',
    title: 'Role-based access control (RBAC) middleware and permissions layer',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-03-30',
    dueDate: '2026-04-01',
    durationDays: 3,
    progress: 1.0,
    startDayCol: 15,
    category: 'green',
  },
  // SECTION 18
  {
    id: 'DOC-01',
    section: 'SECTION 18 — SPLIT-SCREEN DOCUMENT VIEWER',
    title: 'SophisticatedDocumentViewer — zoom, fullscreen, metadata inspector',
    owner: 'Bautista, Steven Joe',
    startDate: '2026-04-21',
    dueDate: '2026-04-24',
    durationDays: 4,
    progress: 1.0,
    startDayCol: 34,
    category: 'blue',
  },
  {
    id: 'DOC-02',
    section: 'SECTION 18 — SPLIT-SCREEN DOCUMENT VIEWER',
    title: 'Git-style revision diffing and anchored committee comments',
    owner: 'Bautista, Steven Joe',
    startDate: '2026-04-24',
    dueDate: '2026-04-25',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 37,
    category: 'blue',
  },
  // SECTION 19
  {
    id: 'SEC-01',
    section: 'SECTION 19 — INTEGRATION & SECURITY HARDENING',
    title: 'MinIO SigV4 HMAC streaming endpoint fix and cache headers',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-04-24',
    dueDate: '2026-04-25',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 37,
    category: 'blue',
  },
  {
    id: 'SEC-02',
    section: 'SECTION 19 — INTEGRATION & SECURITY HARDENING',
    title: 'WCAG accessibility contrast tokens and semantic CSS variables',
    owner: 'Canoy, Chijay',
    startDate: '2026-04-28',
    dueDate: '2026-04-29',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 38,
    category: 'blue',
  },
  // SECTION 20
  {
    id: 'TEST-01',
    section: 'SECTION 20 — TESTING & QA',
    title: 'Unit tests — auth service (register, login, OTP, JWT, refresh)',
    owner: 'Antipuesto, Throylan',
    startDate: '2026-04-28',
    dueDate: '2026-04-29',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 38,
    category: 'orange',
  },
  {
    id: 'TEST-03',
    section: 'SECTION 20 — TESTING & QA',
    title: 'Unit tests — project service (title, feasibility, phase advance)',
    owner: 'Bautista, Steven Joe',
    startDate: '2026-04-29',
    dueDate: '2026-04-30',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 39,
    category: 'orange',
  },
  {
    id: 'TEST-09',
    section: 'SECTION 20 — TESTING & QA',
    title: 'End-to-end UI tests (Playwright) — full happy path user audit',
    owner: 'Bautista, Steven Joe',
    startDate: '2026-04-29',
    dueDate: '2026-05-01',
    durationDays: 3,
    progress: 1.0,
    startDayCol: 39,
    category: 'orange',
  },
  // SECTION 21
  {
    id: 'DEPLOY-01',
    section: 'SECTION 21 — DEPLOYMENT & DOCUMENTATION',
    title: 'GitHub Classroom production workspace deployment build',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-04-29',
    dueDate: '2026-04-30',
    durationDays: 2,
    progress: 1.0,
    startDayCol: 38,
    category: 'orange',
  },
  {
    id: 'DEPLOY-06',
    section: 'SECTION 21 — DEPLOYMENT & DOCUMENTATION',
    title: 'System demo recording and live presentation rehearsal',
    owner: 'Añedez, Patrick Josh',
    startDate: '2026-05-02',
    dueDate: '2026-05-02',
    durationDays: 1,
    progress: 1.0,
    startDayCol: 41,
    category: 'orange',
  },
];

export function isOwnerMatch(taskOwner, targetOwner) {
  if (!targetOwner || targetOwner === 'ALL') return true;
  if (!taskOwner) return false;
  if (taskOwner === targetOwner) return true;
  const norm = (s) =>
    s.toLowerCase().replace(/[,.]/g, '').split(/\s+/).filter(Boolean).sort().join(' ');
  return norm(taskOwner) === norm(targetOwner);
}

/**
 * InlineEditCell — renders text by default, input on click.
 */
function InlineEditCell({
  value,
  onChange,
  type = 'text',
  className = '',
  inputClassName = '',
  multiLine = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }, [draft, value, onChange]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiLine) {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (editing) {
    return multiLine ? (
      <textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        rows={2}
        className={cn(
          'w-full resize-none bg-transparent border border-primary/50 rounded px-1 py-0.5 text-inherit focus:outline-none focus:ring-1 focus:ring-primary/70',
          inputClassName,
        )}
      />
    ) : (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full bg-transparent border border-primary/50 rounded px-1 py-0.5 text-inherit focus:outline-none focus:ring-1 focus:ring-primary/70',
          inputClassName,
        )}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={cn(
        'cursor-text hover:bg-primary/5 rounded px-0.5 transition-colors block',
        className,
      )}
    >
      {value || <span className="text-muted-foreground/50 italic text-[10px]">click to edit</span>}
    </span>
  );
}

/**
 * InlineSelectCell — renders a <select> for owner field.
 */
function InlineSelectCell({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full bg-transparent border border-border/40 rounded px-1 py-0.5 text-inherit text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/70 cursor-pointer hover:border-primary/50',
        className,
      )}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

/**
 * InlineProgressCell — numeric input 0–100.
 */
function InlineProgressCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const norm = normalizeProgress(value);
  const [draft, setDraft] = useState(Math.round(norm * 100));
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(Math.round(normalizeProgress(value) * 100));
  }, [value]);

  const commit = () => {
    setEditing(false);
    const clamped = Math.min(100, Math.max(0, Number(draft) || 0));
    onChange(clamped / 100);
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full bg-transparent border border-primary/50 rounded px-1 py-0.5 text-center text-inherit focus:outline-none focus:ring-1 focus:ring-primary/70"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit percentage"
      className="cursor-text font-bold hover:bg-primary/5 rounded px-0.5 transition-colors block text-center"
    >
      {Math.round(norm * 100)}%
    </span>
  );
}

/**
 * InlineDaysCell — numeric input for duration days.
 */
function InlineDaysCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    const parsed = Math.max(0, parseInt(draft, 10) || 0);
    if (parsed !== value) onChange(parsed);
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={60}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full bg-transparent border border-primary/50 rounded px-1 py-0.5 text-center text-inherit text-[11px] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary/70"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit duration days"
      className="cursor-pointer font-mono font-bold hover:bg-primary/10 hover:text-primary rounded px-1 py-0.5 transition-colors block text-center"
    >
      {value}d
    </span>
  );
}

export default function AcademicExcelGanttChart({
  project = null,
  tasks: controlledTasks,
  setTasks: controlledSetTasks,
  sections: controlledSections,
  setSections: controlledSetSections,
  onAddSection: propOnAddSection,
  onAddRow: propOnAddRow,
  onDeleteRow: propOnDeleteRow,
  onDeleteSection: propOnDeleteSection,
  selectedOwner: propOwner,
  onOwnerChange: propOnOwnerChange,
  onAddTask = null,
  isReadOnly = false,
}) {
  // ── Storage key ──────────────────────────────────────────────────────────────
  const storageKey = useMemo(() => {
    const pid = project?._id || project?.id || 'default';
    return `gantt_state_${pid}`;
  }, [project]);
  const sectionsStorageKey = `${storageKey}_sections`;
  const headerStorageKey = `${storageKey}_header`;

  // ── Load from localStorage on mount (uncontrolled fallback) ─────────────────
  const [internalTasks, setInternalTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {
      /* ignore */
    }
    return [];
  });

  const [internalSections, setInternalSections] = useState(() => {
    try {
      const saved = localStorage.getItem(sectionsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {
      /* ignore */
    }
    return [];
  });

  const isTasksControlled = Array.isArray(controlledTasks);
  const tasks = isTasksControlled ? controlledTasks : internalTasks;

  const isSectionsControlled = Array.isArray(controlledSections);

  // ── Autosave: debounced write to localStorage ─────────────────────────────
  const saveTimerRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  const setTasks = useCallback(
    (updaterOrValue) => {
      if (isTasksControlled && controlledSetTasks) {
        controlledSetTasks(updaterOrValue);
        return;
      }
      setInternalTasks((prev) => {
        const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
        setSaveStatus('saving');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
          } catch (_) {
            setSaveStatus('idle');
          }
        }, 600);
        return next;
      });
    },
    [isTasksControlled, controlledSetTasks, storageKey],
  );

  const setSections = useCallback(
    (updaterOrValue) => {
      if (isSectionsControlled && controlledSetSections) {
        controlledSetSections(updaterOrValue);
        return;
      }
      setInternalSections((prev) => {
        const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
        try {
          localStorage.setItem(sectionsStorageKey, JSON.stringify(next));
        } catch (_) {
          // Ignore storage quota or private browsing errors
        }
        return next;
      });
    },
    [isSectionsControlled, controlledSetSections, sectionsStorageKey],
  );

  // ── Canonical proponent list for dropdowns and filter ────────────────────
  const proponentList = useMemo(() => extractProjectMembers(project), [project]);

  // ── Auto-reconcile tasks with project team members ─────────────────────────
  useEffect(() => {
    if (proponentList.length > 0 && proponentList !== CANONICAL_MEMBERS) {
      setTasks((prev) => {
        let changed = false;
        const next = prev.map((t, idx) => {
          if (CANONICAL_MEMBERS.includes(t.owner) && !proponentList.includes(t.owner)) {
            changed = true;
            return { ...t, owner: proponentList[idx % proponentList.length] };
          }
          return t;
        });
        return changed ? next : prev;
      });
    }
  }, [proponentList, setTasks]);

  // ── Header state (also editable, persisted) ──────────────────────────────
  const [headerState, setHeaderStateInternal] = useState(() => {
    try {
      const saved = localStorage.getItem(headerStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {
      /* ignore */
    }
    return null;
  });

  const setHeaderState = useCallback(
    (updater) => {
      setHeaderStateInternal((prev) => {
        const next = typeof updater === 'function' ? updater(prev || {}) : updater;
        try {
          localStorage.setItem(headerStorageKey, JSON.stringify(next));
        } catch (_) {
          /* ignore */
        }
        return next;
      });
    },
    [headerStorageKey],
  );

  // ── Derive display values (project > saved header > defaults) ────────────
  const derivedProjectTitle = project?.title || 'Pending';

  const derivedStudents = useMemo(() => {
    return proponentList.length > 0 ? proponentList.join(', ') : 'Pending';
  }, [proponentList]);

  const derivedAdviser = useMemo(() => extractProjectAdviser(project), [project]);
  const derivedInstructor = useMemo(() => extractProjectInstructor(project), [project]);

  const derivedSection = useMemo(() => {
    const secCode =
      project?.sectionId?.code ||
      project?.teamId?.sectionId?.code ||
      project?.team?.sectionId?.code ||
      project?.sectionId?.name ||
      null;
    const schedule =
      project?.sectionId?.schedule ||
      project?.teamId?.sectionId?.schedule ||
      project?.schedule ||
      null;

    if (!secCode && !schedule) return 'Pending';
    if (secCode && schedule) return `${secCode} / ${schedule}`;
    if (secCode) return `${secCode} / Pending Schedule`;
    return schedule;
  }, [project]);

  // Resolved header values (edits override derived)
  const projectTitle = headerState?.projectTitle ?? derivedProjectTitle;
  const students = headerState?.students ?? derivedStudents;
  const adviser = headerState?.adviser ?? derivedAdviser;
  const sectionCodeAndSchedule = headerState?.sectionCodeAndSchedule ?? derivedSection;

  // ── Owner filter ─────────────────────────────────────────────────────────
  const [internalOwner, setInternalOwner] = useState('ALL');
  const selectedOwner = propOwner !== undefined ? propOwner : internalOwner;
  const setSelectedOwner = propOnOwnerChange || setInternalOwner;

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // ── Filtered tasks ────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    if (selectedOwner === 'ALL') return tasks;
    return tasks.filter((t) => isOwnerMatch(t.owner, selectedOwner));
  }, [tasks, selectedOwner]);

  // All sections across entire project (for comprehensive export and display)
  const rawSections = isSectionsControlled ? controlledSections : internalSections;
  const allSections = useMemo(() => {
    const fromTasks = tasks.map((t) => t.section).filter(Boolean);
    return Array.from(new Set([...rawSections, ...fromTasks]));
  }, [rawSections, tasks]);

  const sections = useMemo(() => {
    if (selectedOwner === 'ALL') return allSections;
    return allSections.filter((sec) => filteredTasks.some((t) => t.section === sec));
  }, [allSections, filteredTasks, selectedOwner]);

  // ── Overall accomplishment ─────────────────────────────────────────────
  const overallAccomplishment = useMemo(() => {
    const valid = tasks.filter((t) => t && (t.id || t.title));
    if (!valid.length) return 'Pending';
    const total = valid.reduce((sum, t) => sum + normalizeProgress(t.progress), 0);
    return `${((total / valid.length) * 100).toFixed(2)}%`;
  }, [tasks]);

  const asOfDate =
    headerState?.asOfDate ??
    (tasks.length > 0 ? new Date().toLocaleDateString('en-GB') : 'Pending');

  // ── Task mutation helpers ─────────────────────────────────────────────────
  const updateTaskField = useCallback(
    (taskId, field, value) => {
      if (isReadOnly) return;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const updated = { ...t, [field]: value };

          // If durationDays changed
          if (field === 'durationDays') {
            const days = Math.max(0, parseInt(value, 10) || 0);
            updated.durationDays = days;
            if (t.startDate) {
              updated.dueDate = addWorkingDays(t.startDate, days);
            }
            const startCol = t.startDayCol || 0;
            updated.filledDays = Array.from({ length: days }, (_, i) => startCol + i);
          }

          // If start or due date changed, recalculate duration and startDayCol
          if (field === 'startDate' || field === 'dueDate') {
            const start = field === 'startDate' ? value : t.startDate;
            const due = field === 'dueDate' ? value : t.dueDate;
            const days = calcWorkingDays(start, due);
            const startCol = dateToDayCol(start);
            updated.durationDays = days;
            updated.startDayCol = startCol;
            updated.filledDays = Array.from({ length: days }, (_, i) => startCol + i);
          }

          // If progress changed keep it as fraction
          if (field === 'progress' && value > 1) updated.progress = value / 100;
          return updated;
        }),
      );
    },
    [isReadOnly, setTasks],
  );

  // ── Drag to paint / fill state ──────────────────────────────────────────
  const [activeColor, setActiveColor] = useState('yellow');
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState(null); // 'fill' | 'unfill'
  const dragTaskIdRef = useRef(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      dragTaskIdRef.current = null;
      setDragAction(null);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleCellMouseDown = useCallback(
    (taskId, dIdx) => {
      if (isReadOnly) return;
      setIsDragging(true);
      dragTaskIdRef.current = taskId;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const currentFilled = Array.isArray(t.filledDays)
            ? [...t.filledDays]
            : Array.from({ length: t.durationDays || 1 }, (_, i) => (t.startDayCol || 0) + i);

          const alreadyFilled = currentFilled.includes(dIdx);
          const action = alreadyFilled ? 'unfill' : 'fill';
          setDragAction(action);

          const nextFilled = alreadyFilled
            ? currentFilled.filter((d) => d !== dIdx)
            : [...currentFilled, dIdx];
          nextFilled.sort((a, b) => a - b);

          const newDuration = nextFilled.length;
          const newStartCol = nextFilled.length > 0 ? nextFilled[0] : t.startDayCol || 0;
          const newStartDate = nextFilled.length > 0 ? dayColToDate(newStartCol) : t.startDate;
          const newDueDate =
            nextFilled.length > 0 ? dayColToDate(nextFilled[nextFilled.length - 1]) : t.dueDate;

          return {
            ...t,
            category: t.category || activeColor,
            filledDays: nextFilled,
            durationDays: newDuration,
            startDayCol: newStartCol,
            startDate: newStartDate,
            dueDate: newDueDate,
          };
        }),
      );
    },
    [isReadOnly, activeColor, setTasks],
  );

  const handleCellMouseEnter = useCallback(
    (taskId, dIdx) => {
      if (!isDragging || dragTaskIdRef.current !== taskId || isReadOnly) return;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const currentFilled = Array.isArray(t.filledDays)
            ? [...t.filledDays]
            : Array.from({ length: t.durationDays || 1 }, (_, i) => (t.startDayCol || 0) + i);

          let nextFilled = [...currentFilled];
          if (dragAction === 'fill' && !nextFilled.includes(dIdx)) {
            nextFilled.push(dIdx);
          } else if (dragAction === 'unfill' && nextFilled.includes(dIdx)) {
            nextFilled = nextFilled.filter((d) => d !== dIdx);
          }
          nextFilled.sort((a, b) => a - b);

          const newDuration = nextFilled.length;
          const newStartCol = nextFilled.length > 0 ? nextFilled[0] : t.startDayCol || 0;
          const newStartDate = nextFilled.length > 0 ? dayColToDate(newStartCol) : t.startDate;
          const newDueDate =
            nextFilled.length > 0 ? dayColToDate(nextFilled[nextFilled.length - 1]) : t.dueDate;

          return {
            ...t,
            category: t.category || activeColor,
            filledDays: nextFilled,
            durationDays: newDuration,
            startDayCol: newStartCol,
            startDate: newStartDate,
            dueDate: newDueDate,
          };
        }),
      );
    },
    [isDragging, dragAction, isReadOnly, activeColor, setTasks],
  );

  // ── Section & Row helpers ────────────────────────────────────────────────
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const handleAddSection = useCallback(
    (customTitle = null) => {
      if (isReadOnly) return;
      const title = (typeof customTitle === 'string' ? customTitle : newSectionTitle).trim();
      if (!title) {
        toast.error('Please enter a section name.');
        return;
      }
      if (propOnAddSection) {
        propOnAddSection(title);
        setNewSectionTitle('');
        setIsAddSectionOpen(false);
        return;
      }
      setSections((prev) => {
        if (prev.includes(title)) {
          toast.info(`Section "${title}" already exists.`);
          return prev;
        }
        return [...prev, title];
      });
      setNewSectionTitle('');
      setIsAddSectionOpen(false);
      toast.success(`Section "${title}" added.`);
    },
    [isReadOnly, newSectionTitle, propOnAddSection, setSections],
  );

  const handleDeleteSection = useCallback(
    (sectionName) => {
      if (isReadOnly) return;
      if (propOnDeleteSection) {
        propOnDeleteSection(sectionName);
        return;
      }
      setSections((prev) => prev.filter((s) => s !== sectionName));
      setTasks((prev) => prev.filter((t) => t.section !== sectionName));
      toast.info(`Deleted ${sectionName}.`);
    },
    [isReadOnly, propOnDeleteSection, setSections, setTasks],
  );

  const handleAddRow = useCallback(
    (targetSection = null) => {
      if (isReadOnly) return;
      if (propOnAddRow) {
        propOnAddRow(targetSection);
        return;
      }
      let sectionName = targetSection;
      if (!sectionName) {
        if (allSections.length > 0) {
          sectionName = allSections[0];
        } else {
          sectionName = 'SECTION 1 — PROJECT PLANNING & RESEARCH';
          setSections([sectionName]);
        }
      }
      const secTasks = tasks.filter((t) => t.section === sectionName);
      const newIndex = secTasks.length + 1;
      const secPrefix = sectionName.includes('PLAN')
        ? 'PLAN'
        : sectionName.includes('ARCH')
          ? 'ARCH'
          : sectionName.includes('INFRA')
            ? 'INFRA'
            : sectionName.includes('BACKEND')
              ? 'BE'
              : sectionName.includes('TEST')
                ? 'TEST'
                : sectionName.includes('DEPLOY')
                  ? 'DEPLOY'
                  : 'TSK';
      const newId = `${secPrefix}-${String(newIndex).padStart(2, '0')}`;

      const lastTask = secTasks[secTasks.length - 1];
      const startDay = lastTask ? (lastTask.startDayCol || 0) + (lastTask.durationDays || 1) : 0;
      const startDate = dayColToDate(startDay);
      const dueDate = addWorkingDays(startDate, 2);

      const newTask = {
        id: newId,
        section: sectionName,
        title: 'New Capstone Deliverable',
        owner: proponentList[0] || 'Pending',
        startDate,
        dueDate,
        durationDays: 2,
        progress: 0,
        startDayCol: startDay,
        category: activeColor || 'yellow',
        filledDays: [startDay, startDay + 1],
      };

      setTasks((prev) => [...prev, newTask]);
      toast.success(`Row ${newId} added to ${sectionName}. Click any cell to edit.`);
    },
    [
      isReadOnly,
      propOnAddRow,
      allSections,
      tasks,
      setSections,
      proponentList,
      activeColor,
      setTasks,
    ],
  );

  const handleDeleteRow = useCallback(
    (taskId) => {
      if (isReadOnly) return;
      if (propOnDeleteRow) {
        propOnDeleteRow(taskId);
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.info(`Deleted row ${taskId}.`);
    },
    [isReadOnly, propOnDeleteRow, setTasks],
  );

  // ── Excel export ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    downloadExcelGantt({
      projectTitle,
      students,
      adviser,
      instructor: derivedInstructor,
      sectionCode: sectionCodeAndSchedule,
      accomplishment: overallAccomplishment,
      asOfDate,
      tasks,
      sections: allSections,
      proponentList,
      filename: `CAPSTONE_GANTT_CHART_${new Date().toISOString().slice(0, 10)}.xls`,
    });
    toast.success('Excel Gantt Chart exported successfully.');
  };

  // ── Sticky left pane width in px ─────────────────────────────────────────
  // TASK ID=75, TASK TITLE=240, TASK OWNER=130 = 445px
  const STICKY_WIDTH = 445;

  return (
    <div
      className={cn(
        'w-full flex flex-col space-y-4 font-sans text-xs select-text',
        isFullscreen &&
          'fixed inset-0 z-50 bg-background p-4 sm:p-6 overflow-y-auto max-h-screen w-screen h-screen shadow-2xl',
      )}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 border border-border/70 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
            <TableIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Academic Excel Gantt Chart
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Strict BukSU Academic Capstone Schedule — Click any cell to edit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Autosave indicator */}
          {saveStatus !== 'idle' && (
            <span
              className={cn(
                'flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border',
                saveStatus === 'saving'
                  ? 'text-amber-600 dark:text-amber-400 border-amber-400/40 bg-amber-50 dark:bg-amber-950/30'
                  : 'text-emerald-600 dark:text-emerald-400 border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/30',
              )}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Save className="h-3 w-3 animate-pulse" /> Saving…
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" /> Saved
                </>
              )}
            </span>
          )}

          {/* Color Fill Palette */}
          {!isReadOnly && (
            <div className="flex items-center gap-1 bg-background border border-border/70 rounded-md px-2 py-1">
              <span className="text-[10px] text-muted-foreground font-medium mr-1 flex items-center gap-1">
                <Paintbrush className="h-3 w-3" /> Paint:
              </span>
              <div className="flex items-center gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveColor(c.id)}
                    title={`Fill Color: ${c.label}`}
                    className={cn(
                      'w-4 h-4 rounded-full transition-transform',
                      c.bgClass,
                      activeColor === c.id
                        ? 'ring-2 ring-primary ring-offset-1 scale-110'
                        : 'opacity-70 hover:opacity-100',
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Owner Filter — canonical proponents with true member count */}
          <div className="flex items-center gap-1.5 bg-background border border-border/70 rounded-md px-2.5 py-1 text-xs">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select
              aria-label="Filter by task owner"
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="bg-transparent border-0 text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Members ({proponentList.length})</option>
              {proponentList.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>

          {/* Add Section Button (Separate Button) */}
          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddSectionOpen(true)}
              className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Section
            </Button>
          )}

          {/* Add Row Button */}
          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => handleAddRow()}
              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
            </Button>
          )}

          {/* Export to Excel */}
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="h-8 w-8 p-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Excel Sheet Canvas */}
      <div className="rounded-xl border-2 border-slate-700 dark:border-slate-700 bg-white dark:bg-card shadow-sm overflow-hidden text-slate-900 dark:text-slate-100">
        {/* 1. Editable Document Header Table */}
        <div className="m-4 mb-0 border-2 border-slate-900 dark:border-slate-300">
          {/* Main Title Row */}
          <div className="bg-[#FFFFFF] dark:bg-muted/30 border-b-2 border-slate-900 dark:border-slate-300 p-2.5 px-4">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 font-mono">
              CAPSTONE PROJECT AND RESEARCH 2 GANTT CHART
            </h2>
          </div>

          {/* Row 1: Capstone Project Title */}
          <div className="grid grid-cols-12 border-b border-slate-900 dark:border-slate-400">
            <div className="col-span-3 bg-slate-100 dark:bg-muted/60 p-2 px-3 font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200 border-r border-slate-900 dark:border-slate-400 flex items-center">
              CAPSTONE PROJECT TITLE
            </div>
            <div className="col-span-9 p-2 px-3 font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center">
              <InlineEditCell
                value={projectTitle}
                onChange={(v) => setHeaderState((h) => ({ ...(h || {}), projectTitle: v }))}
                multiLine
                className="font-semibold"
              />
            </div>
          </div>

          {/* Row 2: Name of Students */}
          <div className="grid grid-cols-12 border-b border-slate-900 dark:border-slate-400">
            <div className="col-span-3 bg-slate-100 dark:bg-muted/60 p-2 px-3 font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200 border-r border-slate-900 dark:border-slate-400 flex items-center">
              NAME OF STUDENTS
            </div>
            <div className="col-span-9 p-2 px-3 text-xs text-slate-900 dark:text-slate-100 flex items-center font-medium">
              <InlineEditCell
                value={students}
                onChange={(v) => setHeaderState((h) => ({ ...(h || {}), students: v }))}
                multiLine
                className="font-medium"
              />
            </div>
          </div>

          {/* Row 3: Name of Adviser */}
          <div className="grid grid-cols-12 border-b border-slate-900 dark:border-slate-400">
            <div className="col-span-3 bg-slate-100 dark:bg-muted/60 p-2 px-3 font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200 border-r border-slate-900 dark:border-slate-400 flex items-center">
              NAME OF ADVISER
            </div>
            <div className="col-span-9 p-2 px-3 text-xs text-slate-900 dark:text-slate-100 flex items-center font-medium">
              <InlineEditCell
                value={adviser}
                onChange={(v) => setHeaderState((h) => ({ ...(h || {}), adviser: v }))}
                className="font-medium"
              />
            </div>
          </div>

          {/* Row 4: Section Code / Schedule */}
          <div className="grid grid-cols-12 border-b border-slate-900 dark:border-slate-400">
            <div className="col-span-3 bg-slate-100 dark:bg-muted/60 p-2 px-3 font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200 border-r border-slate-900 dark:border-slate-400 flex items-center">
              SECTION CODE / SCHEDULE
            </div>
            <div className="col-span-9 p-2 px-3 text-xs text-slate-900 dark:text-slate-100 flex items-center font-medium">
              <InlineEditCell
                value={sectionCodeAndSchedule}
                onChange={(v) =>
                  setHeaderState((h) => ({ ...(h || {}), sectionCodeAndSchedule: v }))
                }
                className="font-medium"
              />
            </div>
          </div>

          {/* Row 5: Overall Accomplishment */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-100 dark:bg-muted/60 p-2 px-3 font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200 border-r border-slate-900 dark:border-slate-400 flex items-center">
              OVERALL ACCOMPLISHMENT
            </div>
            <div className="col-span-9 p-2 px-3 grid grid-cols-3 text-xs text-slate-900 dark:text-slate-100 font-bold items-center">
              <div className="text-left font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                {overallAccomplishment}
              </div>
              <div className="text-center font-normal text-muted-foreground italic text-[11px]">
                as of
              </div>
              <div className="text-right font-mono text-slate-700 dark:text-slate-300">
                {!isReadOnly ? (
                  <InlineEditCell
                    value={asOfDate}
                    onChange={(v) => setHeaderState((h) => ({ ...(h || {}), asOfDate: v }))}
                    className="font-mono text-right"
                  />
                ) : (
                  <span>{asOfDate}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Scrollable Grid */}
        <div className="relative overflow-x-auto border-2 border-slate-900 dark:border-slate-500 m-4 mt-4">
          <table
            className="border-collapse text-[11px]"
            style={{ minWidth: `${STICKY_WIDTH + 60 * 19 + 350}px` }}
          >
            <thead>
              {/* TIER 1: 4 Phases — 8 header cols sticky/fixed + 4 phase headers */}
              <tr className="border-b border-slate-900 dark:border-slate-400">
                <th
                  rowSpan={4}
                  className="sticky left-0 z-30 bg-[#E5E7EB] dark:bg-slate-800 border-r border-b border-slate-900 dark:border-slate-500 p-2 text-center font-bold text-slate-800 dark:text-slate-200 w-[75px] min-w-[75px]"
                >
                  TASK ID
                </th>
                <th
                  rowSpan={4}
                  className="sticky left-[75px] z-30 bg-[#E5E7EB] dark:bg-slate-800 border-r border-b border-slate-900 dark:border-slate-500 p-2 text-left font-bold text-slate-800 dark:text-slate-200 w-[240px] min-w-[240px]"
                >
                  TASK TITLE
                </th>
                <th
                  rowSpan={4}
                  className="sticky left-[315px] z-30 bg-[#E5E7EB] dark:bg-slate-800 border-r border-b border-slate-900 dark:border-slate-500 p-2 text-left font-bold text-slate-800 dark:text-slate-200 w-[130px] min-w-[130px]"
                >
                  TASK OWNER
                </th>
                <th
                  rowSpan={4}
                  className="bg-[#E5E7EB] dark:bg-slate-800 border-r border-b border-slate-900 dark:border-slate-500 p-2 text-center font-bold text-slate-800 dark:text-slate-200 w-[80px] min-w-[80px]"
                >
                  START DATE
                </th>
                <th
                  rowSpan={4}
                  className="bg-[#E5E7EB] dark:bg-slate-800 border-r border-b border-slate-900 dark:border-slate-500 p-2 text-center font-bold text-slate-800 dark:text-slate-200 w-[80px] min-w-[80px]"
                >
                  DUE DATE
                </th>
                <th
                  rowSpan={4}
                  className="bg-[#E5E7EB] dark:bg-slate-800 border-r border-b border-slate-900 dark:border-slate-500 p-2 text-center font-bold text-slate-800 dark:text-slate-200 w-[55px] min-w-[55px]"
                >
                  DAYS
                </th>
                <th
                  rowSpan={4}
                  className="bg-[#E5E7EB] dark:bg-slate-800 border-r border-b border-slate-900 dark:border-slate-500 p-2 text-center font-bold text-slate-800 dark:text-slate-200 w-[65px] min-w-[65px]"
                >
                  % DONE
                </th>
                <th
                  rowSpan={4}
                  className="bg-[#E5E7EB] dark:bg-slate-800 border-r-2 border-b border-slate-900 dark:border-slate-500 p-1 text-center font-bold text-slate-800 dark:text-slate-200 w-[40px] min-w-[40px]"
                >
                  ACT
                </th>
                {PHASES.map((p) => (
                  <th
                    key={p.name}
                    colSpan={p.daySpan}
                    className={cn(
                      'p-1.5 text-center font-black tracking-wider text-[11px] border-r border-slate-900 dark:border-slate-400',
                      p.headerBg,
                      p.colorText,
                    )}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>

              {/* TIER 2: 12 Weeks */}
              <tr className="border-b border-slate-900 dark:border-slate-400">
                {WEEKS_METADATA.map((w) => {
                  const phase = PHASES[w.phaseIndex];
                  return (
                    <th
                      key={w.weekNum}
                      colSpan={5}
                      className={cn(
                        'p-1 text-center font-bold text-[10px] text-white border-r border-slate-900 dark:border-slate-400',
                        phase.weekBg,
                      )}
                    >
                      WEEK {w.weekNum}
                    </th>
                  );
                })}
              </tr>

              {/* TIER 3: M T W R F per week */}
              <tr className="border-b border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-muted/40">
                {Array.from({ length: 12 }).flatMap((_, wIdx) =>
                  ['M', 'T', 'W', 'R', 'F'].map((day, dIdx) => (
                    <th
                      key={`w${wIdx}-d${dIdx}`}
                      className="p-1 text-center font-semibold text-[9px] text-slate-700 dark:text-slate-300 w-[19px] min-w-[19px] max-w-[19px] border-r border-slate-300 dark:border-slate-700"
                    >
                      {day}
                    </th>
                  )),
                )}
              </tr>

              {/* TIER 4: Sub-labels */}
              <tr className="border-b-2 border-slate-900 dark:border-slate-400 bg-slate-200 dark:bg-muted/80">
                {WEEKS_METADATA.map((w) => (
                  <th
                    key={`sub-${w.weekNum}`}
                    colSpan={5}
                    className="p-1 text-center font-medium italic text-[8px] text-slate-700 dark:text-slate-300 border-r border-slate-400 dark:border-slate-600 truncate"
                    title={w.label}
                  >
                    {w.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {allSections.length === 0 && (
                <tr>
                  <td colSpan={68} className="p-12 text-center bg-card">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <TableIcon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">No Gantt Roadmap Data</h4>
                        <p className="text-xs text-muted-foreground">
                          No milestone sections or deliverable tasks have been created yet. Click
                          &quot;Add Section&quot; to create your first milestone section, or add
                          deliverable rows.
                        </p>
                      </div>
                      {!isReadOnly && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => setIsAddSectionOpen(true)}
                            className="h-8 text-xs bg-primary text-primary-foreground gap-1.5 shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Section
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {allSections.length > 0 && sections.length === 0 && (
                <tr>
                  <td colSpan={68} className="p-8 text-center text-muted-foreground font-medium">
                    No tasks found matching the selected filter.
                  </td>
                </tr>
              )}

              {sections.map((sec) => {
                const secTasks = filteredTasks.filter((t) => t.section === sec);
                return (
                  <React.Fragment key={sec}>
                    {/* SECTION DIVIDER */}
                    <tr className="border-y-2 border-slate-900 dark:border-slate-400">
                      <td className="sticky left-0 z-20 bg-slate-300 dark:bg-slate-700 p-2 px-3 font-black text-[11px] text-slate-900 dark:text-slate-100 tracking-wide uppercase whitespace-nowrap border-r border-slate-400 dark:border-slate-500" />
                      <td className="sticky left-[75px] z-20 bg-slate-300 dark:bg-slate-700 p-2 font-black text-[11px] text-slate-900 dark:text-slate-100 tracking-wide uppercase border-r border-slate-400 dark:border-slate-500">
                        <div className="flex items-center justify-between pr-2">
                          <span>{sec}</span>
                          {!isReadOnly && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAddRow(sec)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-foreground hover:bg-primary px-1.5 py-0.5 rounded bg-background border border-primary/30 shadow-2xs transition-colors cursor-pointer"
                                title={`Add row under ${sec}`}
                              >
                                <Plus className="h-3 w-3" /> Add
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(sec)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive hover:text-destructive-foreground hover:bg-destructive px-1.5 py-0.5 rounded bg-background border border-destructive/30 shadow-2xs transition-colors cursor-pointer"
                                title={`Delete ${sec}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="sticky left-[315px] z-20 bg-slate-300 dark:bg-slate-700 border-r border-slate-400 dark:border-slate-500" />
                      <td colSpan={65} className="bg-slate-300 dark:bg-slate-700" />
                    </tr>

                    {secTasks.length === 0 && (
                      <tr className="border-b border-slate-300 dark:border-slate-700 bg-muted/5">
                        <td
                          colSpan={68}
                          className="p-4 text-center text-xs text-muted-foreground italic"
                        >
                          No tasks in {sec} yet.{' '}
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleAddRow(sec)}
                              className="text-primary font-semibold underline hover:text-primary/80 ml-1 cursor-pointer"
                            >
                              + Add a deliverable row
                            </button>
                          )}
                        </td>
                      </tr>
                    )}

                    {secTasks.map((task, idx) => {
                      const pct = Number(task.progress) || 0;
                      const startCol = Number(task.startDayCol ?? 0);
                      const spanDays = Number(task.durationDays || 1);
                      const category =
                        task.category ||
                        (task.id.startsWith('PLAN') || task.id.startsWith('ARCH')
                          ? 'yellow'
                          : task.id.startsWith('INFRA') || task.id.startsWith('BE')
                            ? 'green'
                            : task.id.startsWith('SEC') || task.id.startsWith('DOC')
                              ? 'blue'
                              : 'orange');

                      const isAlt = idx % 2 === 1;

                      return (
                        <tr
                          key={task.id}
                          className="border-b border-slate-300 dark:border-slate-700 hover:brightness-95 dark:hover:brightness-125 transition-all"
                        >
                          {/* 1. Task ID (Sticky) with color picker pill */}
                          <td
                            className={cn(
                              'sticky left-0 z-20 border-r border-slate-300 dark:border-slate-700 p-1 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap',
                              isAlt
                                ? 'bg-slate-50 dark:bg-slate-800'
                                : 'bg-white dark:bg-[#111827]',
                            )}
                          >
                            <div className="flex items-center justify-between px-1">
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curIdx = COLOR_OPTIONS.findIndex(
                                      (c) => c.id === category,
                                    );
                                    const nextId =
                                      COLOR_OPTIONS[(curIdx + 1) % COLOR_OPTIONS.length].id;
                                    updateTaskField(task.id, 'category', nextId);
                                  }}
                                  title={`Theme: ${category}. Click to change color.`}
                                  className={cn(
                                    'w-2.5 h-2.5 rounded-full shrink-0 transition-transform hover:scale-125 cursor-pointer',
                                    COLOR_OPTIONS.find((c) => c.id === category)?.bgClass ||
                                      'bg-amber-400',
                                  )}
                                />
                              )}
                              {!isReadOnly ? (
                                <InlineEditCell
                                  value={task.id}
                                  onChange={(v) => updateTaskField(task.id, 'id', v.toUpperCase())}
                                  className="font-mono font-bold text-center flex-1"
                                />
                              ) : (
                                <span className="flex-1 text-center">{task.id}</span>
                              )}
                            </div>
                          </td>

                          {/* 2. Task Title (Sticky) */}
                          <td
                            className={cn(
                              'sticky left-[75px] z-20 border-r border-slate-300 dark:border-slate-700 p-1.5 font-medium text-slate-900 dark:text-slate-100',
                              isAlt
                                ? 'bg-slate-50 dark:bg-slate-800'
                                : 'bg-white dark:bg-[#111827]',
                            )}
                          >
                            {!isReadOnly ? (
                              <InlineEditCell
                                value={task.title}
                                onChange={(v) => updateTaskField(task.id, 'title', v)}
                                multiLine
                              />
                            ) : (
                              task.title
                            )}
                          </td>

                          {/* 3. Task Owner (Sticky) */}
                          <td
                            className={cn(
                              'sticky left-[315px] z-20 border-r border-slate-300 dark:border-slate-700 p-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap',
                              isAlt
                                ? 'bg-slate-50 dark:bg-slate-800'
                                : 'bg-white dark:bg-[#111827]',
                            )}
                          >
                            {!isReadOnly ? (
                              <InlineSelectCell
                                value={task.owner}
                                onChange={(v) => updateTaskField(task.id, 'owner', v)}
                                options={proponentList}
                              />
                            ) : (
                              task.owner
                            )}
                          </td>

                          {/* 4. Start Date */}
                          <td className="border-r border-slate-300 dark:border-slate-700 p-1 text-center text-slate-700 dark:text-slate-300">
                            {!isReadOnly ? (
                              <input
                                type="date"
                                value={task.startDate}
                                onChange={(e) =>
                                  updateTaskField(task.id, 'startDate', e.target.value)
                                }
                                className="bg-transparent border border-border/40 rounded px-1 py-0.5 text-[11px] text-inherit focus:outline-none focus:ring-1 focus:ring-primary/70 w-full"
                              />
                            ) : (
                              task.startDate
                            )}
                          </td>

                          {/* 5. Due Date */}
                          <td className="border-r border-slate-300 dark:border-slate-700 p-1 text-center text-slate-700 dark:text-slate-300">
                            {!isReadOnly ? (
                              <input
                                type="date"
                                value={task.dueDate}
                                onChange={(e) =>
                                  updateTaskField(task.id, 'dueDate', e.target.value)
                                }
                                className="bg-transparent border border-border/40 rounded px-1 py-0.5 text-[11px] text-inherit focus:outline-none focus:ring-1 focus:ring-primary/70 w-full"
                              />
                            ) : (
                              task.dueDate
                            )}
                          </td>

                          {/* 6. Duration — inline editable */}
                          <td className="border-r border-slate-300 dark:border-slate-700 p-1 text-center font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {!isReadOnly ? (
                              <InlineDaysCell
                                value={spanDays}
                                onChange={(v) => updateTaskField(task.id, 'durationDays', v)}
                              />
                            ) : (
                              `${spanDays}d`
                            )}
                          </td>

                          {/* 7. % Complete — inline editable */}
                          <td className="border-r border-slate-300 dark:border-slate-700 p-1 text-center font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {!isReadOnly ? (
                              <InlineProgressCell
                                value={pct}
                                onChange={(v) => updateTaskField(task.id, 'progress', v)}
                              />
                            ) : (
                              `${Math.round(pct * 100)}%`
                            )}
                          </td>

                          {/* 8. Action: Delete Row */}
                          <td className="border-r-2 border-slate-900 dark:border-slate-500 p-1 text-center whitespace-nowrap">
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(task.id)}
                                title={`Delete row ${task.id}`}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>

                          {/* 60 Day Interactive Timeline Cells */}
                          {Array.from({ length: 60 }).map((_, dIdx) => {
                            const currentFilled = Array.isArray(task.filledDays)
                              ? task.filledDays
                              : Array.from({ length: spanDays }, (_, i) => startCol + i);
                            const isFilled = currentFilled.includes(dIdx);
                            const filledIdx = currentFilled.indexOf(dIdx);
                            const isDoneDay =
                              isFilled &&
                              (filledIdx !== -1
                                ? filledIdx < Math.ceil(currentFilled.length * pct)
                                : false);

                            const colorOpt =
                              COLOR_OPTIONS.find((c) => c.id === category) || COLOR_OPTIONS[0];
                            let cellStyle = '';
                            if (isFilled) {
                              cellStyle = isDoneDay ? colorOpt.doneClass : colorOpt.planClass;
                            }

                            return (
                              <td
                                key={`cell-${task.id}-d${dIdx}`}
                                data-task-id={task.id}
                                data-day-col={dIdx}
                                data-is-filled={isFilled ? 'true' : 'false'}
                                onMouseDown={() => handleCellMouseDown(task.id, dIdx)}
                                onMouseEnter={() => handleCellMouseEnter(task.id, dIdx)}
                                title={`Day ${dIdx + 1} (${isFilled ? (isDoneDay ? 'Completed' : 'Planned') : 'Empty'}) — Click/drag to toggle`}
                                className={cn(
                                  'p-0 h-7 border-r border-slate-200 dark:border-slate-800 transition-colors cursor-pointer select-none',
                                  cellStyle,
                                  !isFilled && 'hover:bg-primary/20',
                                )}
                              />
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3. Academic Signatures Block */}
        <div className="mx-4 mb-4 pt-6 border-t-2 border-slate-900 dark:border-slate-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {/* Column 1: Researchers 1 & 3 */}
            <div className="space-y-6">
              <div className="space-y-0.5">
                <div className="border-b border-slate-900 dark:border-slate-400 mb-1 pb-8" />
                <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {proponentList[0] || 'Pending'}
                </p>
                <p className="text-[11px] text-muted-foreground italic">Researcher</p>
              </div>
              {proponentList[2] && (
                <div className="space-y-0.5">
                  <div className="border-b border-slate-900 dark:border-slate-400 mb-1 pb-8" />
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {proponentList[2]}
                  </p>
                  <p className="text-[11px] text-muted-foreground italic">Researcher</p>
                </div>
              )}
            </div>

            {/* Column 2: Researchers 2 & 4 */}
            <div className="space-y-6">
              {proponentList[1] && (
                <div className="space-y-0.5">
                  <div className="border-b border-slate-900 dark:border-slate-400 mb-1 pb-8" />
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {proponentList[1]}
                  </p>
                  <p className="text-[11px] text-muted-foreground italic">Researcher</p>
                </div>
              )}
              {proponentList[3] && (
                <div className="space-y-0.5">
                  <div className="border-b border-slate-900 dark:border-slate-400 mb-1 pb-8" />
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {proponentList[3]}
                  </p>
                  <p className="text-[11px] text-muted-foreground italic">Researcher</p>
                </div>
              )}
            </div>

            {/* Column 3: Adviser */}
            <div className="space-y-0.5">
              <div className="border-b border-slate-900 dark:border-slate-400 mb-1 pb-8" />
              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase">
                {adviser || 'Pending'}
              </p>
              <p className="text-[11px] text-muted-foreground italic">Adviser</p>
            </div>

            {/* Column 4: Instructor */}
            <div className="space-y-0.5">
              <div className="border-b border-slate-900 dark:border-slate-400 mb-1 pb-8" />
              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                {derivedInstructor || 'Pending'}
              </p>
              <p className="text-[11px] text-muted-foreground italic">Instructor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {isAddSectionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-section-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 id="add-section-modal-title" className="text-base font-bold text-foreground">
                Create Milestone Section
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSectionOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label htmlFor="new-section-input" className="font-semibold text-foreground">
                  Section Name *
                </label>
                <input
                  id="new-section-input"
                  placeholder="e.g. SECTION 1 — PROJECT PLANNING & RESEARCH"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/70"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSection();
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Standard Capstone Suggestions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'SECTION 1 — PROJECT PLANNING & RESEARCH',
                    'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
                    'SECTION 3 — DEVELOPMENT & SYSTEM INTEGRATION',
                    'SECTION 4 — TESTING & QA',
                    'SECTION 5 — DEPLOYMENT & DOCUMENTATION',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewSectionTitle(preset)}
                      className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors cursor-pointer"
                    >
                      {preset.split('—')[1]?.trim() || preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddSectionOpen(false);
                    setNewSectionTitle('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddSection()}
                  className="bg-primary text-primary-foreground gap-1.5 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Section
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AcademicExcelGanttChart.propTypes = {
  project: PropTypes.object,
  tasks: PropTypes.array,
  setTasks: PropTypes.func,
  sections: PropTypes.array,
  setSections: PropTypes.func,
  onAddSection: PropTypes.func,
  onAddRow: PropTypes.func,
  onDeleteRow: PropTypes.func,
  onDeleteSection: PropTypes.func,
  selectedOwner: PropTypes.string,
  onOwnerChange: PropTypes.func,
  onAddTask: PropTypes.func,
  isReadOnly: PropTypes.bool,
};

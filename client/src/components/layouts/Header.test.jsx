import { describe, it, expect } from 'vitest';
import { getPageTitle } from './Header';

describe('Header - getPageTitle', () => {
  it('correctly maps specific parameterized submission sub-routes without shadowing', () => {
    // Nested specific routes
    expect(getPageTitle('/project/submissions/652f1a2b3c4d5e6f7a8b9c0d/plagiarism-report')).toBe(
      'Plagiarism Report',
    );
    expect(getPageTitle('/project/submissions/652f1a2b3c4d5e6f7a8b9c0d/review')).toBe(
      'Submission Review',
    );
    expect(getPageTitle('/project/submissions/upload')).toBe('Upload Chapter');
    expect(getPageTitle('/project/submissions/652f1a2b3c4d5e6f7a8b9c0d')).toBe('Submission Detail');
    expect(getPageTitle('/project/submissions')).toBe('Submissions');
  });

  it('correctly maps specific project sub-routes', () => {
    expect(getPageTitle('/projects/652f1a2b3c4d5e6f7a8b9c0d/certificate')).toBe(
      'Certificate of Completion',
    );
    expect(getPageTitle('/projects/652f1a2b3c4d5e6f7a8b9c0d/documents/chapter_1')).toBe(
      'Document Editor',
    );
    expect(getPageTitle('/projects/652f1a2b3c4d5e6f7a8b9c0d')).toBe('Project Details');
    expect(getPageTitle('/projects')).toBe('Instructor Review');
    expect(getPageTitle('/projects', '?filter=advisees')).toBe('Adviser Reviews');
    expect(getPageTitle('/projects', '?filter=panel')).toBe('Panel Review');
  });

  it('correctly maps admin, documents, and governance routes', () => {
    expect(getPageTitle('/admin/evaluation-templates')).toBe('Evaluation Rubric Builder');
    expect(getPageTitle('/admin/audit')).toBe('Activity Log');
    expect(getPageTitle('/admin/audit-log')).toBe('Activity Log');
    expect(getPageTitle('/admin/users')).toBe('User Management');
    expect(getPageTitle('/users')).toBe('Users');
    expect(getPageTitle('/documents/manuscripts')).toBe('Manuscript Management');
    expect(getPageTitle('/documents/templates')).toBe('Document Templates');
  });

  it('correctly maps archive, reports, and team routes', () => {
    expect(getPageTitle('/archive/upload/capstone')).toBe('Upload Archived Capstone');
    expect(getPageTitle('/archive/upload/academic-paper')).toBe('Upload Academic Paper');
    expect(getPageTitle('/archive/upload/academic-journal')).toBe('Upload Academic Journal');
    expect(getPageTitle('/archive')).toBe('Research Archive');
    expect(getPageTitle('/plagiarism-checker')).toBe('Plagiarism Checker');
    expect(getPageTitle('/reports/bulk-upload')).toBe('Bulk Upload');
    expect(getPageTitle('/reports')).toBe('Reports');
    expect(getPageTitle('/teams')).toBe('My Team');
    expect(getPageTitle('/teams/invites/abc123token/accept')).toBe('Team Invitation');
  });

  it('falls back to Dashboard for unknown or root paths', () => {
    expect(getPageTitle('/dashboard')).toBe('Dashboard');
    expect(getPageTitle('/unknown-path')).toBe('Dashboard');
    expect(getPageTitle('')).toBe('Dashboard');
  });
});

import { describe, expect, it } from 'vitest';
import { ROLES } from '@cms/shared';
import documentService from '../../modules/documents/document.service.js';

describe('DocumentService — Committee & Secretary Visibility Unit Tests', () => {
  const baseProject = {
    _id: '6af501764996bfe56492a850',
    teamId: '6af501764996bfe56492a84f',
    adviserId: 'adviser-user-id',
    secretaryId: 'secretary-user-id',
    panelistIds: ['panelist-legacy-id'],
    panelists: [
      { userId: 'panelist-chair-id', role: 'chair' },
      { userId: 'panelist-member-id', role: 'member' },
    ],
  };

  it('allows adviser, secretary, panelistIds members, panelists[] entries, instructors, and students to view', () => {
    expect(() =>
      documentService._assertCanView({ _id: 'adviser-user-id', role: ROLES.FACULTY }, baseProject),
    ).not.toThrow();

    expect(() =>
      documentService._assertCanView(
        { _id: 'secretary-user-id', role: ROLES.FACULTY },
        baseProject,
      ),
    ).not.toThrow();

    expect(() =>
      documentService._assertCanView(
        { _id: 'panelist-legacy-id', role: ROLES.FACULTY },
        baseProject,
      ),
    ).not.toThrow();

    expect(() =>
      documentService._assertCanView(
        { _id: 'panelist-chair-id', role: ROLES.FACULTY },
        baseProject,
      ),
    ).not.toThrow();

    expect(() =>
      documentService._assertCanView({ _id: 'instructor-id', role: ROLES.INSTRUCTOR }, baseProject),
    ).not.toThrow();

    expect(() =>
      documentService._assertCanView(
        { _id: 'student-id', role: ROLES.STUDENT, teamId: '6af501764996bfe56492a84f' },
        baseProject,
      ),
    ).not.toThrow();
  });

  it('rejects unassigned faculty and students from other teams with 403 FORBIDDEN', () => {
    expect(() =>
      documentService._assertCanView(
        { _id: 'stranger-faculty-id', role: ROLES.FACULTY },
        baseProject,
      ),
    ).toThrowError('You are not allowed to access this manuscript.');

    expect(() =>
      documentService._assertCanView(
        { _id: 'other-student', role: ROLES.STUDENT, teamId: 'different-team-id' },
        baseProject,
      ),
    ).toThrowError('You are not allowed to access this manuscript.');
  });

  it('resolves preview links for panelists and non-adviser secretaries while keeping edit links for advisers', () => {
    const manuscript = {
      externalDocUrl: 'https://docs.google.com/document/d/doc-123/edit?embedded=true',
    };

    expect(
      documentService._resolveOpenLink(
        { _id: 'adviser-user-id', role: ROLES.FACULTY },
        manuscript,
        baseProject,
      ),
    ).toBe('https://docs.google.com/document/d/doc-123/edit?embedded=true');

    expect(
      documentService._resolveOpenLink(
        { _id: 'secretary-user-id', role: ROLES.FACULTY },
        manuscript,
        baseProject,
      ),
    ).toBe('https://docs.google.com/document/d/doc-123/preview');

    expect(
      documentService._resolveOpenLink(
        { _id: 'panelist-chair-id', role: ROLES.FACULTY },
        manuscript,
        baseProject,
      ),
    ).toBe('https://docs.google.com/document/d/doc-123/preview');

    expect(
      documentService._resolveOpenLink({ _id: 'legacy-panel', role: ROLES.PANELIST }, manuscript),
    ).toBe('https://docs.google.com/document/d/doc-123/preview');
  });

  it('deduplicates panelist IDs across legacy panelistIds and structured panelists', () => {
    const ids = documentService._extractPanelistIds({
      panelistIds: ['p1', 'p2'],
      panelists: [
        { userId: 'p2', role: 'chair' },
        { userId: 'p3', role: 'member' },
      ],
    });
    expect(ids).toEqual(['p1', 'p2', 'p3']);
  });
});

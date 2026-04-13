import { describe, expect, it } from 'vitest';
import {
  formatCitation,
  getFullName,
  getProjectAuthors,
  resolveArchiveBackContext,
} from './ProjectDetailPage';

describe('ProjectDetailPage archive helpers', () => {
  it('builds full names from person objects and falls back to email', () => {
    expect(getFullName({ firstName: 'Pat', middleName: 'J', lastName: 'Rios' })).toBe('Pat J Rios');
    expect(getFullName({ email: 'user@example.com' })).toBe('user@example.com');
    expect(getFullName('Already Formatted')).toBe('Already Formatted');
  });

  it('collects authors from member role assignments and falls back to team name', () => {
    const projectWithAssignments = {
      memberRoleAssignments: [
        { userId: { firstName: 'A', lastName: 'One' } },
        { userId: { firstName: 'B', lastName: 'Two' } },
      ],
    };
    const projectWithTeamOnly = { teamId: { name: 'Team Alpha' } };

    expect(getProjectAuthors(projectWithAssignments)).toEqual(['A One', 'B Two']);
    expect(getProjectAuthors(projectWithTeamOnly)).toEqual(['Team Alpha']);
  });

  it('formats citation text for apa, ieee, and mla styles', () => {
    const project = {
      academicYear: '2025-2026',
      title: 'Smart Archive Discovery',
      adviserId: { firstName: 'Ada', lastName: 'Lovelace' },
      courseId: { name: 'BS Information Technology' },
    };
    const authors = ['Alice Example', 'Bob Example'];

    expect(formatCitation(project, 'apa', authors)).toBe(
      'Alice Example, Bob Example (2026). Smart Archive Discovery. BS Information Technology. Adviser: Ada Lovelace.',
    );
    expect(formatCitation(project, 'ieee', authors)).toBe(
      'Alice Example, Bob Example, "Smart Archive Discovery," BS Information Technology, 2026. Adviser: Ada Lovelace.',
    );
    expect(formatCitation(project, 'mla', authors)).toBe(
      'Alice Example, Bob Example. "Smart Archive Discovery." BS Information Technology, 2026. Adviser: Ada Lovelace.',
    );
  });

  it('resolves archive back context from location state and query string', () => {
    expect(resolveArchiveBackContext({ fromArchive: true, returnTo: '/archive?q=ai&p=2' }, '')).toEqual({
      fromArchive: true,
      backDestination: '/archive?q=ai&p=2',
      backLabel: 'Back to Search Results',
    });

    expect(resolveArchiveBackContext({}, '?from=archive')).toEqual({
      fromArchive: true,
      backDestination: '/archive',
      backLabel: 'Back to Search Results',
    });

    expect(resolveArchiveBackContext({}, '')).toEqual({
      fromArchive: false,
      backDestination: '/projects',
      backLabel: 'Back to Projects',
    });
  });
});

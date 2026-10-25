import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PROJECT_STATUSES, TITLE_STATUSES } from '@cms/shared';
import ProjectStatusBadge from './ProjectStatusBadge';
import TitleStatusBadge from './TitleStatusBadge';

afterEach(() => cleanup());

describe('project workflow status badges', () => {
  it('shows the approved-with-revision title state as a readable warning badge', () => {
    render(<TitleStatusBadge status={TITLE_STATUSES.APPROVED_WITH_REVISION} />);

    const badge = screen.getByText('Approved with Revision');
    expect(badge.className).toContain('bg-warning/10');
  });

  it('keeps project review status mapped to the shared warning badge', () => {
    render(<ProjectStatusBadge status={PROJECT_STATUSES.REVIEW} />);

    expect(screen.getByText('In Review').className).toContain('bg-warning/10');
  });

  it('does not duplicate the final approved status badge', () => {
    const { container } = render(<ProjectStatusBadge status={PROJECT_STATUSES.FINAL_APPROVED} />);

    expect(container).toBeEmptyDOMElement();
  });
});

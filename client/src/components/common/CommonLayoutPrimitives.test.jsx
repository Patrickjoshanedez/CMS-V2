import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Layers } from 'lucide-react';
import { PageHeader, StatCard, MetricGrid, SectionHeader, FilterToolbar } from './index';

describe('shared layout composition primitives', () => {
  it('renders PageHeader with a single h1 heading, eyebrow, description, and actions', () => {
    render(
      <PageHeader
        eyebrow="Workspace"
        icon={Layers}
        title="Projects Overview"
        description="Review active capstone submissions."
        actions={<button type="button">Create Project</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Projects Overview' })).toBeVisible();
    expect(screen.getByText('Workspace')).toBeVisible();
    expect(screen.getByText('Review active capstone submissions.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeVisible();
  });

  it('renders interactive StatCard as a native button with aria-pressed state', () => {
    const onSelect = vi.fn();
    render(
      <MetricGrid cols={2}>
        <StatCard label="Ready for Defense" value={4} active onClick={onSelect} />
        <StatCard label="Total Teams" value={6} hint="Active cohort" />
      </MetricGrid>,
    );

    const filterBtn = screen.getByRole('button', { name: /Ready for Defense/i });
    expect(filterBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(filterBtn);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Active cohort')).toBeVisible();
  });

  it('renders SectionHeader and FilterToolbar consistently', () => {
    render(
      <>
        <SectionHeader title="Committee Roster" description="Manage advisers and panelists." />
        <FilterToolbar footer={<span>Showing 3 results</span>}>
          <input aria-label="Search teams" placeholder="Search..." />
        </FilterToolbar>
      </>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Committee Roster' })).toBeVisible();
    expect(screen.getByLabelText('Search teams')).toBeVisible();
    expect(screen.getByText('Showing 3 results')).toBeVisible();
  });
});

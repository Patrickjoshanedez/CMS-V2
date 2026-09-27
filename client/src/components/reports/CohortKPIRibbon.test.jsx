import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import CohortKPIRibbon from './CohortKPIRibbon';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('CohortKPIRibbon', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it('renders exactly 4 executive KPI cards and eliminates the static milestone card', () => {
    const summary = {
      totalEnrolledStudents: 128,
      totalTeams: 42,
      totalCapstonesArchived: 42,
      sectionsCount: 4,
      yieldRate: 100,
      yieldCompleted: 42,
      yieldTotal: 42,
      sampleDenominator: '42/42 Teams Completed',
    };

    act(() => {
      root.render(<CohortKPIRibbon summary={summary} activeYear="2025-2026" />);
    });

    // 4 KPI cards present
    expect(container.textContent).toContain('Enrolled Proponents');
    expect(container.textContent).toContain('128');
    expect(container.textContent).toContain('Capstone Teams');
    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('Academic Sections');
    expect(container.textContent).toContain('ADM Yield Rate');

    // Static milestone card is eliminated
    expect(container.textContent).not.toContain('Current Milestone');
    expect(container.textContent).not.toContain('Capstone 3 (Final)');
  });

  it('renders explicit sample denominator and handles small sample sizes with Sample N=1 badge', () => {
    const smallCohortSummary = {
      totalEnrolledStudents: 4,
      totalTeams: 1,
      totalCapstonesArchived: 1,
      sectionsCount: 1,
      yieldRate: 100,
      yieldCompleted: 1,
      yieldTotal: 1,
      sampleDenominator: '1/1 Teams Completed',
    };

    act(() => {
      root.render(<CohortKPIRibbon summary={smallCohortSummary} activeYear="2025-2026" />);
    });

    // Explicit sample denominator rendered directly beside yield metric
    expect(container.textContent).toContain('100% (1/1 Teams Completed)');
    // Small sample size indicator prevents inflated "Institutional High" badge
    expect(container.textContent).toContain('Sample N=1');
    expect(container.textContent).not.toContain('Institutional High');
  });

  it('harmonizes lifecycle states between proponents and teams for active cohorts', () => {
    const activeCohortSummary = {
      totalEnrolledStudents: 120,
      totalTeams: 30,
      totalCapstonesActive: 28,
      totalCapstonesArchived: 2,
      sectionsCount: 4,
      yieldRate: 93,
      yieldCompleted: 28,
      yieldTotal: 30,
      sampleDenominator: '28/30 Teams Completed',
    };

    act(() => {
      root.render(<CohortKPIRibbon summary={activeCohortSummary} activeYear="2025-2026" />);
    });

    // Proponents and teams have harmonious status badges
    expect(container.textContent).toContain('Active Enrolled');
    expect(container.textContent).toContain('28 In-Progress');
    expect(container.textContent).toContain('Institutional High');
  });
});

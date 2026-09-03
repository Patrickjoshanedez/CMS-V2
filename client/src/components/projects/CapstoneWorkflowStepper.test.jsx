import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CapstoneWorkflowStepper, {
  resolveCurrentStep,
  CAPSTONE_STEPS,
} from './CapstoneWorkflowStepper';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('CapstoneWorkflowStepper Component', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders all 5 standardized capstone milestone cards', async () => {
    await act(async () => {
      root.render(<CapstoneWorkflowStepper currentStep={2} />);
    });

    expect(container.textContent).toContain('Team Formation');
    expect(container.textContent).toContain('Capstone 1');
    expect(container.textContent).toContain('Capstone 2');
    expect(container.textContent).toContain('Capstone 3');
    expect(container.textContent).toContain('Capstone 4');

    expect(container.textContent).toContain('Phase 0');
    expect(container.textContent).toContain('Phase 1');
    expect(container.textContent).toContain('Phase 2');
    expect(container.textContent).toContain('Phase 3');
    expect(container.textContent).toContain('Phase 4');
  });

  it('correctly resolves active currentStep from project metadata', () => {
    // Archived / Defended
    expect(resolveCurrentStep({ projectStatus: 'defended' })).toBe(4);
    expect(resolveCurrentStep({ isArchived: true })).toBe(4);

    // Phase 3 (Dev)
    expect(resolveCurrentStep({ capstonePhase: 3 })).toBe(3);

    // Phase 2 (Ch 1-3)
    expect(resolveCurrentStep({ capstonePhase: 2 })).toBe(2);

    // Phase 1 (Title approved)
    expect(resolveCurrentStep({ titleStatus: 'approved' })).toBe(1);

    // Default Phase 0
    expect(resolveCurrentStep({})).toBe(0);
    expect(resolveCurrentStep(null)).toBe(0);
  });

  it('triggers onStepClick callback when a milestone card is clicked', async () => {
    const handleStepClick = vi.fn();
    await act(async () => {
      root.render(<CapstoneWorkflowStepper currentStep={1} onStepClick={handleStepClick} />);
    });

    const clickableDiv = container.querySelector('[role="button"]');
    expect(clickableDiv).toBeTruthy();

    await act(async () => {
      clickableDiv.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleStepClick).toHaveBeenCalled();
  });
});

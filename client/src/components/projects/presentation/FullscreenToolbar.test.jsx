import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FullscreenToolbar from './FullscreenToolbar';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('FullscreenToolbar', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('renders slide counter, default 100% font size, and Edit Slide button', async () => {
    await act(async () => {
      root.render(
        <FullscreenToolbar
          title="AgriNode: IoT Telemetry"
          teamName="Team Gamma"
          activeSlideIndex={0}
          totalSlides={8}
          currentFontSize={100}
          onClose={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('01');
    expect(container.textContent).toContain('08');
    expect(container.textContent).toContain('100%');
    expect(container.textContent).toContain('Edit Slide');
    expect(container.textContent).toContain('AgriNode: IoT Telemetry');
    expect(container.textContent).toContain('Team Gamma');
  });

  it('triggers font size increase, decrease, and reset handlers on click', async () => {
    const onIncrease = vi.fn();
    const onDecrease = vi.fn();
    const onReset = vi.fn();

    await act(async () => {
      root.render(
        <FullscreenToolbar
          title="AgriNode: IoT Telemetry"
          activeSlideIndex={1}
          totalSlides={8}
          currentFontSize={115}
          onIncreaseFontSize={onIncrease}
          onDecreaseFontSize={onDecrease}
          onResetFontSize={onReset}
          onClose={vi.fn()}
        />,
      );
    });

    const minusBtn = container.querySelector('button[aria-label="Decrease text size"]');
    const plusBtn = container.querySelector('button[aria-label="Increase text size"]');
    const percentBtn = container.querySelector('button[title*="reset slide text size"]');

    expect(minusBtn).toBeTruthy();
    expect(plusBtn).toBeTruthy();
    expect(percentBtn).toBeTruthy();
    expect(percentBtn.getAttribute('aria-label')).toBe('Reset slide text size');

    await act(async () => {
      minusBtn.click();
    });
    expect(onDecrease).toHaveBeenCalledTimes(1);

    await act(async () => {
      plusBtn.click();
    });
    expect(onIncrease).toHaveBeenCalledTimes(1);

    await act(async () => {
      percentBtn.click();
    });
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows Done Editing when isEditMode is true and triggers toggle', async () => {
    const onToggle = vi.fn();

    await act(async () => {
      root.render(
        <FullscreenToolbar
          title="AgriNode: IoT Telemetry"
          activeSlideIndex={0}
          totalSlides={5}
          currentFontSize={100}
          isEditMode={true}
          onToggleEditMode={onToggle}
          onClose={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Done Editing');
    expect(container.textContent).toContain('Edit Mode');

    const toggleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Done Editing'),
    );
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      toggleBtn.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows Revert button when hasSlideEdits is true and triggers revert handler', async () => {
    const onResetEdits = vi.fn();

    await act(async () => {
      root.render(
        <FullscreenToolbar
          title="AgriNode: IoT Telemetry"
          activeSlideIndex={2}
          totalSlides={5}
          currentFontSize={130}
          hasSlideEdits={true}
          onResetSlideEdits={onResetEdits}
          onClose={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Revert');
    const revertBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Revert'),
    );
    expect(revertBtn).toBeTruthy();

    await act(async () => {
      revertBtn.click();
    });
    expect(onResetEdits).toHaveBeenCalledTimes(1);
  });

  it('names fullscreen and close actions and exposes the active fullscreen state', async () => {
    await act(async () => {
      root.render(
        <FullscreenToolbar
          isNativeFullscreen
          onToggleNativeFullscreen={vi.fn()}
          onClose={vi.fn()}
        />,
      );
    });

    const fullscreenButton = container.querySelector('button[aria-label="Exit fullscreen"]');
    expect(fullscreenButton).toBeTruthy();
    expect(fullscreenButton.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('button[aria-label="Close rehearsal"]')).toBeTruthy();
  });

  it('announces export progress and disables the export action while busy', async () => {
    await act(async () => {
      root.render(<FullscreenToolbar isExportingPdf onExportPdf={vi.fn()} onClose={vi.fn()} />);
    });

    const exportButton = container.querySelector('button[aria-busy="true"]');
    expect(exportButton).toBeTruthy();
    expect(exportButton.disabled).toBe(true);
    expect(exportButton.textContent).toContain('Exporting PDF...');
  });
});

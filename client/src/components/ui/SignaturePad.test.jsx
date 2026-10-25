import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignaturePad } from './SignaturePad';

const canvasContext = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  stroke: vi.fn(),
};

beforeEach(() => {
  Object.values(canvasContext).forEach((value) => value?.mockClear?.());
  delete canvasContext.fillStyle;
  document.documentElement.style.setProperty('--slide-brand-navy', '215 80% 22%');
  document.documentElement.style.setProperty('--slide-brand-ink', '222 47% 11%');
  document.documentElement.style.setProperty('--primary', '221 83% 53%');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,signature',
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty('--slide-brand-navy');
  document.documentElement.style.removeProperty('--slide-brand-ink');
  document.documentElement.style.removeProperty('--primary');
});

describe('SignaturePad', () => {
  it('renders accessible signature modes, ink colors, and canvas instructions', () => {
    render(<SignaturePad onChange={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'Signature entry mode' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Signature ink color' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Draw Signature' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Institutional Navy' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.querySelector('canvas')).toHaveAttribute(
      'aria-label',
      'Signature drawing canvas',
    );
  });

  it('switches to typed signing, keeps the name label associated, and exports the signature', () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} defaultSignatoryName="Patri Ada" />);

    fireEvent.click(screen.getByRole('button', { name: 'Type to Sign' }));

    const nameInput = screen.getByRole('textbox', { name: 'Legal Full Name' });
    expect(nameInput.id).toMatch(/^signature-name-/);
    expect(screen.getByRole('button', { name: 'Type to Sign' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(canvasContext.fillText).toHaveBeenCalledWith('Patri Ada', 0, 0, 1);
    expect(onChange).toHaveBeenCalledWith('data:image/png;base64,signature');

    fireEvent.change(nameInput, { target: { value: 'Patri B. Ada' } });
    expect(canvasContext.fillText).toHaveBeenCalledWith('Patri B. Ada', 0, 0, 1);
  });

  it('updates ink selection and the typed signature with the selected theme token', () => {
    render(<SignaturePad onChange={vi.fn()} defaultSignatoryName="Patri Ada" />);
    fireEvent.click(screen.getByRole('button', { name: 'Type to Sign' }));
    fireEvent.click(screen.getByRole('button', { name: 'Royal Blue' }));

    expect(screen.getByRole('button', { name: 'Royal Blue' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(canvasContext.fillStyle).toBe('hsl(221 83% 53%)');
  });

  it('draws through pointer events and exports a transparent PNG', () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);
    const canvas = document.querySelector('canvas');

    fireEvent.pointerDown(canvas, { clientX: 12, clientY: 14, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 22, clientY: 24, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(canvasContext.beginPath).toHaveBeenCalled();
    expect(canvasContext.lineTo).toHaveBeenCalled();
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(onChange).toHaveBeenCalledWith('data:image/png;base64,signature');
  });

  it('clears the pad and notifies both clear and value callbacks', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<SignaturePad onChange={onChange} onClear={onClear} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(canvasContext.clearRect).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(onClear).toHaveBeenCalledOnce();
  });
});

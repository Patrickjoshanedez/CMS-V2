import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders an accessible range control with the supplied bounds and value', () => {
    render(
      <Slider
        aria-label="Comments overlay opacity"
        min={15}
        max={100}
        value={80}
        onChange={vi.fn()}
      />,
    );

    const slider = screen.getByRole('slider', { name: 'Comments overlay opacity' });
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '15');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveValue('80');
  });

  it('forwards range changes to the consumer', () => {
    const onChange = vi.fn();
    render(<Slider aria-label="Overlay opacity" value={80} onChange={onChange} />);

    fireEvent.change(screen.getByRole('slider', { name: 'Overlay opacity' }), {
      target: { value: '65' },
    });

    expect(onChange).toHaveBeenCalledOnce();
  });
});

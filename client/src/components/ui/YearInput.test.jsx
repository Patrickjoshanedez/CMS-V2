import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { YearInput } from './YearInput';

describe('YearInput', () => {
  it('normalizes four numeric digits to a two-year academic year', () => {
    const onChange = vi.fn();
    render(<YearInput id="academic-year" value="" onChange={onChange} required />);

    const input = screen.getByRole('textbox', { name: 'Academic year' });
    expect(input).toBeRequired();
    fireEvent.change(input, { target: { value: '2027' } });
    expect(onChange).toHaveBeenCalledWith('2027-2028');
  });

  it('ignores non-digit input and increments or decrements complete years', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <YearInput id="academic-year" value="2024-2025" onChange={onChange} />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Academic year' }), {
      target: { value: '20a4' },
    });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Increase year' }));
    expect(onChange).toHaveBeenLastCalledWith('2025-2026');

    rerender(<YearInput id="academic-year" value="2024-2025" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Decrease year' }));
    expect(onChange).toHaveBeenLastCalledWith('2023-2024');
  });

  it('does not decrement earlier than the supported 2000 boundary', () => {
    const onChange = vi.fn();
    render(<YearInput id="academic-year" value="2000-2001" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Decrease year' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

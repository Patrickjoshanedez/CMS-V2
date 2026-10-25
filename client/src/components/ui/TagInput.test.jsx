import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TagInput } from './TagInput';

afterEach(cleanup);

describe('TagInput', () => {
  it('renders controlled tags and an accessible maximum counter', () => {
    render(
      <TagInput
        value={['Capstone 1']}
        onChange={vi.fn()}
        suggestions={[]}
        maxTags={3}
        placeholder="Search committee members"
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Search committee members' })).toBeTruthy();
    expect(screen.getByText('Capstone 1')).toBeTruthy();
    expect(screen.getByText('1/3 tags')).toBeTruthy();
  });

  it('adds a typed tag on Enter and prevents duplicates', () => {
    const onChange = vi.fn();
    render(<TagInput value={['Research']} onChange={onChange} />);

    const input = screen.getByRole('combobox', { name: 'Type to add...' });
    fireEvent.change(input, { target: { value: 'Research' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Capstone 2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Research', 'Capstone 2']);
  });

  it('selects an autocomplete suggestion with the keyboard and exposes the active option', () => {
    const onChange = vi.fn();
    render(
      <TagInput
        value={[]}
        onChange={onChange}
        suggestions={['Capstone 1', 'Capstone 2']}
        aria-label="Committee member search"
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Committee member search' });
    fireEvent.change(input, { target: { value: 'Cap' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const firstOption = screen.getByRole('option', { name: 'Capstone 1' });
    expect(firstOption.getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe(firstOption.id);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['Capstone 1']);
  });

  it('uses unique listbox ids for multiple autocomplete inputs', () => {
    render(
      <>
        <TagInput
          value={[]}
          onChange={vi.fn()}
          suggestions={['Adviser One']}
          aria-label="Adviser"
        />
        <TagInput
          value={[]}
          onChange={vi.fn()}
          suggestions={['Panelist One']}
          aria-label="Panelist"
        />
      </>,
    );

    const adviserInput = screen.getByRole('combobox', { name: 'Adviser' });
    const panelistInput = screen.getByRole('combobox', { name: 'Panelist' });
    fireEvent.change(adviserInput, { target: { value: 'Adviser' } });
    fireEvent.change(panelistInput, { target: { value: 'Panelist' } });

    expect(adviserInput.getAttribute('aria-controls')).not.toBe(
      panelistInput.getAttribute('aria-controls'),
    );
    expect(document.getElementById(adviserInput.getAttribute('aria-controls'))).toHaveAttribute(
      'role',
      'listbox',
    );
  });

  it('disables entry and tag removal when disabled or at the maximum', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TagInput value={['One']} onChange={onChange} disabled />);

    expect(screen.getByRole('button', { name: 'Remove One' }).disabled).toBe(true);
    expect(screen.getByRole('combobox', { name: 'Type to add...' }).disabled).toBe(true);

    rerender(<TagInput value={['One']} onChange={onChange} maxTags={1} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('1/1 tags')).toBeTruthy();
  });
});

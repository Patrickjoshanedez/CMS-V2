import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportsFilterDrawer from './ReportsFilterDrawer';

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

function renderDrawer(overrides = {}) {
  const props = {
    filters: {},
    onFilterChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    yearOptions: ['2025-2026', '2024-2025'],
    sectionOptions: ['BSIT 4A', 'BSIT 4B'],
    adviserOptions: [{ value: 'faculty-1', label: 'Faculty One' }],
    programOptions: [{ value: 'program-1', label: 'BSIT' }],
    authorOptions: [{ value: 'Student One', label: 'Student One' }],
    keywordOptions: [{ value: 'Machine Learning', label: 'Machine Learning' }],
    setSortBy: vi.fn(),
    setSortOrder: vi.fn(),
    setLimit: vi.fn(),
    onToggleOpen: vi.fn(),
    ...overrides,
  };

  return { ...render(<ReportsFilterDrawer {...props} />), props };
}

describe('ReportsFilterDrawer', () => {
  it('applies quick academic-year changes immediately through the shared Select', async () => {
    const { props } = renderDrawer();

    await act(async () =>
      screen.getByRole('combobox', { name: 'Filter by academic year' }).click(),
    );
    const yearOption = await screen.findByRole('option', { name: '2025-2026' });
    await act(async () => yearOption.click());

    expect(props.onFilterChange).toHaveBeenCalledWith('year', '2025-2026');
    expect(props.onApply).toHaveBeenCalledWith({ year: '2025-2026' });
  });

  it('renders advanced filters in a shared Sheet and applies their values', async () => {
    const { props } = renderDrawer({
      isOpen: true,
      filters: { year: '2025-2026', title: 'Archive' },
    });

    const panel = await screen.findByTestId('reports-filter-drawer-panel');
    expect(within(panel).getByRole('heading', { name: 'Advanced Query Studio' })).toBeTruthy();
    expect(within(panel).getByLabelText('Project Title Query').value).toBe('Archive');

    await act(async () =>
      fireEvent.click(within(panel).getByRole('button', { name: 'Apply Filters' })),
    );

    expect(props.onApply).toHaveBeenCalledWith({ year: '2025-2026', title: 'Archive' });
    expect(props.onToggleOpen).toHaveBeenCalledOnce();
  });

  it('requests Sheet closure from Escape', async () => {
    const { props } = renderDrawer({ isOpen: true, filters: { title: 'Archive' } });

    await screen.findByTestId('reports-filter-drawer-panel');
    await act(async () => fireEvent.keyDown(document, { key: 'Escape' }));

    expect(props.onToggleOpen).toHaveBeenCalledOnce();
  });

  it('removes active filters through shared Buttons', async () => {
    const { props } = renderDrawer({ filters: { title: 'Archive' } });
    const removeButton = screen.getByRole('button', { name: 'Remove title filter' });
    await act(async () => fireEvent.click(removeButton));
    expect(props.onFilterChange).toHaveBeenCalledWith('title', '');
    expect(props.onApply).toHaveBeenCalledWith({ title: '' });
  });
});

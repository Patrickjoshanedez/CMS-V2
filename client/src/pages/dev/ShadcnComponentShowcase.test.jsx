import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShadcnComponentShowcase from './ShadcnComponentShowcase';

describe('ShadcnComponentShowcase', () => {
  it('presents primitive examples and switches to the form controls', async () => {
    render(<ShadcnComponentShowcase />);

    expect(screen.getByRole('heading', { name: /one consistent interface/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Forms' }), { button: 0 });
    fireEvent.click(screen.getByRole('tab', { name: 'Forms' }));

    expect(screen.getByRole('heading', { name: 'Form controls' })).toBeTruthy();
    expect(screen.getByLabelText('Project title')).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Preview density' })).toBeTruthy();
  });

  it('shows a dialog preview and dismisses it with Escape', async () => {
    render(<ShadcnComponentShowcase />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Overlays & feedback' }), { button: 0 });
    fireEvent.click(screen.getByRole('tab', { name: 'Overlays & feedback' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    const dialog = await screen.findByRole('dialog', { name: 'Review the update' });
    expect(dialog.textContent).toContain('This preview does not submit or save data.');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('updates the local slider example without affecting workflow data', async () => {
    render(<ShadcnComponentShowcase />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Forms' }), { button: 0 });
    fireEvent.click(screen.getByRole('tab', { name: 'Forms' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Preview density' }), {
      target: { value: '80' },
    });

    expect(screen.getByText('80%')).toBeTruthy();
  });

  it('renders representative workflow surfaces from inert local examples', async () => {
    render(<ShadcnComponentShowcase />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Workflow surfaces' }), { button: 0 });
    fireEvent.click(screen.getByRole('tab', { name: 'Workflow surfaces' }));

    expect(screen.getByRole('heading', { name: 'Workflow surfaces' })).toBeTruthy();
    expect(screen.getByText('Action Done Matrix (ADM)')).toBeTruthy();
    expect(
      screen.getByRole('region', { name: 'Action Done Matrix recommendations table' }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Action taken')).toBeTruthy();
    expect(screen.getByText('Adviser Consultation Log (Research Mentorship)')).toBeTruthy();
    expect(screen.getByText('Proposal Defense Rehearsal')).toBeTruthy();
    expect(screen.getByText('Community health monitoring in rural barangays')).toBeTruthy();
  });
});

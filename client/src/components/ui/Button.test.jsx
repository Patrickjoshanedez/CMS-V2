import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('lets caller layout classes override the shared shadcn base', () => {
    render(
      <Button variant="ghost" size="sm" className="h-8 min-h-0 w-full justify-start">
        Archive suggestion
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Archive suggestion' });
    expect(button.className).toContain('justify-start');
    expect(button.className).not.toContain('justify-center');
    expect(button.className).toContain('min-h-0');
    expect(button.className).not.toContain('min-h-11');
    expect(button.className).toContain('h-8');
    expect(button.className).toContain('w-full');
  });

  it('provides semantic outline variants for destructive and warning actions', () => {
    render(
      <div>
        <Button variant="destructiveOutline">Reject</Button>
        <Button variant="warningOutline">Request revision</Button>
      </div>,
    );

    expect(screen.getByRole('button', { name: 'Reject' })).toHaveClass('text-destructive-text');
    expect(screen.getByRole('button', { name: 'Request revision' })).toHaveClass(
      'text-warning-foreground',
    );
  });

  it('uses the shared accessible spinner and disables the button while busy', () => {
    render(
      <Button loading loadingText="Saving changes">
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Saving changes' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg[aria-hidden="true"]')).toHaveClass(
      'motion-reduce:animate-none',
    );
    expect(button).toHaveTextContent('Saving changes');
  });
});

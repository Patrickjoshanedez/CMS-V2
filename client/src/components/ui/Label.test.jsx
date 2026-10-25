import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';
import { Label } from './Label';

describe('Label', () => {
  it('keeps its shadcn typography and associates the accessible name with the input', () => {
    render(
      <>
        <Label htmlFor="academic-year">Academic year</Label>
        <Input id="academic-year" />
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Academic year' })).toBeTruthy();
    expect(screen.getByText('Academic year').className).toContain('text-foreground');
  });
});

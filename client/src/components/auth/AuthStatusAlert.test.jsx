import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AuthStatusAlert from './AuthStatusAlert';

describe('AuthStatusAlert', () => {
  afterEach(() => cleanup());

  it('renders nothing while there is no message', () => {
    const { container } = render(<AuthStatusAlert message="" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders destructive errors as one assertive alert region', () => {
    render(<AuthStatusAlert message="Invalid email or password." />);

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('renders success feedback as a polite status region', () => {
    render(<AuthStatusAlert message="Your email has been verified." variant="success" />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent('Your email has been verified.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

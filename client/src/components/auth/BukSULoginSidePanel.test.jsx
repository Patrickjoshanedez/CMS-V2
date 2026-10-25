import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BukSULoginSidePanel from '@/components/auth/BukSULoginSidePanel';

describe('BukSULoginSidePanel', () => {
  it('retains institutional navigation and all four lifecycle stages', () => {
    render(
      <MemoryRouter>
        <BukSULoginSidePanel />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: /Bukidnon State University.*College of Technologies/ }),
    ).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { name: /Academic capstone governance/ })).toBeInTheDocument();
    expect(screen.getByText('System Architecture & Lifecycle Engine')).toBeInTheDocument();
    expect(screen.getByText('Secretary Compliance Gate')).toBeInTheDocument();
    expect(screen.getByText('MinIO Vault')).toBeInTheDocument();

    for (const stage of [
      'Proposal & Title Defense',
      'Chapters 1–3 Manuscript',
      'Prototype & Gantt Milestones',
      'Final Defense & Archival',
    ]) {
      expect(screen.getByRole('heading', { name: stage })).toBeInTheDocument();
    }
  });
});

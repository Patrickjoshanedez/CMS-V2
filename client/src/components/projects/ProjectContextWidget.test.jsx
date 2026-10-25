import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TITLE_STATUSES } from '@cms/shared';
import ProjectContextWidget from './ProjectContextWidget';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ProjectContextWidget', () => {
  let container;
  let root;

  const render = async (project) => {
    await act(async () => {
      root.render(<ProjectContextWidget project={project} />);
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows proposal context and omits repository action when no repository is configured', async () => {
    await render({
      academicYear: '2026–2027',
      titleStatus: TITLE_STATUSES.SUBMITTED,
      courseId: { name: 'Bachelor of Science in Information Technology' },
    });

    expect(container.textContent).toContain('2026–2027');
    expect(container.textContent).toContain('Proposal');
    expect(container.textContent).toContain('Bachelor of Science in Information Technology');
    expect(container.querySelector('a')).toBeNull();
  });

  it('shows the approved capstone phase and prefers the development-assets repository URL', async () => {
    await render({
      titleStatus: TITLE_STATUSES.APPROVED,
      capstonePhase: 2,
      developmentAssets: { githubRepoUrl: 'https://github.com/example/capstone-2' },
      teamId: { githubUrl: 'https://github.com/example/team-fallback' },
    });

    expect(container.textContent).toContain('Capstone 2');
    const repositoryLink = container.querySelector('a');
    expect(repositoryLink?.getAttribute('href')).toBe('https://github.com/example/capstone-2');
    expect(repositoryLink?.getAttribute('target')).toBe('_blank');
    expect(repositoryLink?.getAttribute('rel')).toContain('noreferrer');
  });

  it('falls back through team and project repository fields', async () => {
    await render({
      titleStatus: TITLE_STATUSES.APPROVED,
      teamId: { githubUrl: 'https://github.com/example/team' },
    });
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      'https://github.com/example/team',
    );

    await render({
      titleStatus: TITLE_STATUSES.APPROVED,
      githubRepoUrl: 'https://github.com/example/project',
    });
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      'https://github.com/example/project',
    );
  });
});

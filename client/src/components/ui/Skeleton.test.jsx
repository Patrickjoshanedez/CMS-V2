import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Skeleton,
  SkeletonCard,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonBadge,
} from './Skeleton.jsx';
import PageSkeleton, {
  DashboardSkeleton,
  TableSkeleton,
  DetailSkeleton,
  CardGridSkeleton,
  FormSkeleton,
  LazyComponent,
} from './PageSkeleton.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Skeleton Components', () => {
  let container = null;
  let root = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }

    if (container) {
      container.remove();
    }

    container = null;
    root = null;
  });

  it('renders base Skeleton with shimmer class', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<Skeleton className="h-6 w-32" data-testid="skeleton-el" />);
    });

    const el = container.querySelector('[data-testid="skeleton-el"]');
    expect(el).not.toBeNull();
    expect(el.className).toContain('cms-skeleton-shimmer');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders SkeletonText with multiple lines', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<SkeletonText lines={3} />);
    });

    const lines = container.querySelectorAll('.cms-skeleton-shimmer');
    expect(lines.length).toBe(3);
  });

  it('renders SkeletonAvatar, SkeletonButton, and SkeletonBadge with size classes', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <div>
          <SkeletonAvatar size="lg" data-testid="avatar" />
          <SkeletonButton size="sm" data-testid="button" />
          <SkeletonBadge data-testid="badge" />
        </div>,
      );
    });

    const avatar = container.querySelector('[data-testid="avatar"]');
    const button = container.querySelector('[data-testid="button"]');
    const badge = container.querySelector('[data-testid="badge"]');

    expect(avatar.className).toContain('rounded-full');
    expect(avatar.className).toContain('h-12 w-12');
    expect(button.className).toContain('h-9 w-20');
    expect(badge.className).toContain('rounded-full');
  });

  it('renders DashboardSkeleton with aria-busy', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<DashboardSkeleton />);
    });

    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy.getAttribute('aria-label')).toBe('Loading dashboard...');
  });

  it('renders PageSkeleton with explicit variant', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<PageSkeleton variant="table" />);
    });

    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy.getAttribute('aria-label')).toBe('Loading data table...');
  });

  it('renders LazyComponent with fallback skeleton', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <LazyComponent fallback={<div data-testid="fallback">Skeleton loading...</div>}>
          <div>Loaded Content</div>
        </LazyComponent>,
      );
    });

    expect(container.textContent).toContain('Loaded Content');
  });
});

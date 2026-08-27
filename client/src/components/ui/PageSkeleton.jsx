import { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Skeleton,
  SkeletonCard,
  SkeletonText,
  SkeletonButton,
  SkeletonBadge,
  SkeletonAvatar,
} from './Skeleton';

/**
 * Safely resolves current pathname even when rendered outside a Router (e.g. in tests).
 */
function useSafePathname() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const location = useLocation();
    return location?.pathname || '';
  } catch {
    return '';
  }
}

/**
 * DashboardSkeleton — skeleton loading layout for dashboard views.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard...">
      {/* Welcome Banner */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBadge className="h-6 w-24" />
            <SkeletonBadge className="h-6 w-28" />
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/70 bg-card/60 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-3 w-44 rounded" />
          </div>
        ))}
      </div>

      {/* Main Multi-column Area */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Left main card */}
        <div className="xl:col-span-3 rounded-xl border border-border/70 bg-card/60 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44 rounded-md" />
            <SkeletonButton size="sm" />
          </div>
          <SkeletonText lines={3} />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>

        {/* Right status card */}
        <div className="xl:col-span-2 rounded-xl border border-border/70 bg-card/60 p-6 space-y-4 shadow-sm">
          <Skeleton className="h-6 w-36 rounded-md" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
          <SkeletonButton className="w-full h-10" />
        </div>
      </div>
    </div>
  );
}

/**
 * TableSkeleton — skeleton loading layout for tabular views (users, reports, audit, etc.).
 */
export function TableSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading data table...">
      {/* Header with Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonButton size="sm" />
          <SkeletonButton />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-sm">
        {/* Table Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-6 py-3.5">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border/40">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <SkeletonAvatar size="sm" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
              <SkeletonBadge />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <SkeletonButton size="sm" className="w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * DetailSkeleton — skeleton loading layout for detail views (project detail, submission review).
 */
export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading details...">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      {/* Banner */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-80 rounded-lg" />
            <Skeleton className="h-4 w-60 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonButton />
            <SkeletonButton variant="outline" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Detail Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-4">
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

/**
 * CardGridSkeleton — skeleton loading layout for gallery and card grids.
 */
export function CardGridSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading items...">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <SkeletonButton />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * FormSkeleton — skeleton loading layout for forms (settings, project creation, upload).
 */
export function FormSkeleton() {
  return (
    <div
      className="space-y-6 max-w-3xl animate-pulse"
      aria-busy="true"
      aria-label="Loading form..."
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-52 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 p-6 space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <SkeletonButton variant="outline" />
          <SkeletonButton />
        </div>
      </div>
    </div>
  );
}

/**
 * PageSkeleton — Dynamic router-aware skeleton fallback.
 * Determines the most appropriate skeleton layout based on current route or explicit variant.
 *
 * @param {Object} props
 * @param {'dashboard'|'table'|'detail'|'cards'|'form'|'auto'} [props.variant='auto']
 */
export default function PageSkeleton({ variant = 'auto', className = '' }) {
  const pathname = useSafePathname();

  let ResolvedComponent = DashboardSkeleton;

  if (variant !== 'auto') {
    switch (variant) {
      case 'table':
        ResolvedComponent = TableSkeleton;
        break;
      case 'detail':
        ResolvedComponent = DetailSkeleton;
        break;
      case 'cards':
        ResolvedComponent = CardGridSkeleton;
        break;
      case 'form':
        ResolvedComponent = FormSkeleton;
        break;
      case 'dashboard':
      default:
        ResolvedComponent = DashboardSkeleton;
        break;
    }
  } else {
    // Automatic route deduction
    if (pathname === '/dashboard' || pathname === '/') {
      ResolvedComponent = DashboardSkeleton;
    } else if (
      pathname.includes('/projects/') ||
      pathname.includes('/submissions/') ||
      pathname.includes('/documents/')
    ) {
      ResolvedComponent = DetailSkeleton;
    } else if (
      pathname.includes('/users') ||
      pathname.includes('/reports') ||
      pathname.includes('/audit') ||
      pathname.includes('/archive')
    ) {
      ResolvedComponent = TableSkeleton;
    } else if (
      pathname.includes('/settings') ||
      pathname.includes('/profile') ||
      pathname.includes('/create') ||
      pathname.includes('/upload')
    ) {
      ResolvedComponent = FormSkeleton;
    } else if (pathname === '/projects' || pathname === '/teams') {
      ResolvedComponent = CardGridSkeleton;
    }
  }

  return (
    <div className={`w-full min-h-[400px] p-6 cms-route-enter ${className}`}>
      <ResolvedComponent />
    </div>
  );
}

/**
 * LazyComponent — Modular helper component for lazy-loading sub-components
 * with customizable skeleton fallbacks when clicking buttons or switching tabs.
 */
export function LazyComponent({ children, fallback = <DashboardSkeleton /> }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

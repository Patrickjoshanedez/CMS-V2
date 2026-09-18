import { useState, useId } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  Filter,
  X,
  RefreshCcw,
  Search,
  Check,
  Calendar,
  User,
  GraduationCap,
  SlidersHorizontal,
} from 'lucide-react';

/**
 * ReportsFilterDrawer — Slide-out filter configuration studio & persistent quick ribbon.
 */
export default function ReportsFilterDrawer({
  filters = {},
  onFilterChange,
  onApply,
  onReset,
  yearOptions = [],
  authorOptions = [],
  adviserOptions = [],
  programOptions = [],
  keywordOptions = [],
  sortBy = 'archivedAt',
  setSortBy,
  sortOrder = 'desc',
  setSortOrder,
  limit = 10,
  setLimit,
  isOpen = false,
  onToggleOpen,
}) {
  const titleInputId = useId();
  const authorInputId = useId();
  const yearSelectId = useId();
  const adviserSelectId = useId();
  const programSelectId = useId();
  const keywordSelectId = useId();
  const limitSelectId = useId();

  // Count active non-empty filters
  const activeFilterCount = Object.entries(filters).filter(
    ([, v]) => v !== undefined && v !== '' && v !== null,
  ).length;

  return (
    <>
      {/* 1. Persistent Slim Quick Filter Ribbon */}
      <div
        data-testid="reports-filter-ribbon"
        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card shadow-xs"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleOpen}
            className="h-8 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer border-border hover:border-primary/50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-bold">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Quick Academic Year dropdown directly on ribbon */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
            <select
              value={filters.year || ''}
              onChange={(e) => {
                onFilterChange('year', e.target.value);
                onApply({ ...filters, year: e.target.value });
              }}
              className="h-8 text-xs rounded-md border border-border bg-background px-2 py-1 font-medium focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Academic Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Active filter chips */}
          {filters.title && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
              Title: <strong>{filters.title}</strong>
              <button
                type="button"
                onClick={() => {
                  onFilterChange('title', '');
                  onApply({ ...filters, title: '' });
                }}
                className="hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.adviserId && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
              Adviser Filter
              <button
                type="button"
                onClick={() => {
                  onFilterChange('adviserId', '');
                  onApply({ ...filters, adviserId: '' });
                }}
                className="hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.courseId && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
              Program Filter
              <button
                type="button"
                onClick={() => {
                  onFilterChange('courseId', '');
                  onApply({ ...filters, courseId: '' });
                }}
                className="hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RefreshCcw className="mr-1 h-3 w-3" />
              Clear All
            </Button>
          )}

          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-md border border-border/60">
            <span className="text-[10px] text-muted-foreground px-1 font-semibold uppercase">
              Sort
            </span>
            <Button
              type="button"
              size="sm"
              variant={sortBy === 'archivedAt' ? 'secondary' : 'ghost'}
              className="h-6 px-1.5 text-[10px]"
              onClick={() => {
                if (sortBy === 'archivedAt') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('archivedAt');
                  setSortOrder('desc');
                }
              }}
            >
              Date {sortBy === 'archivedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sortBy === 'title' ? 'secondary' : 'ghost'}
              className="h-6 px-1.5 text-[10px]"
              onClick={() => {
                if (sortBy === 'title') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('title');
                  setSortOrder('asc');
                }
              }}
            >
              Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Slide-out Drawer / Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex justify-end transition-opacity">
          <div
            data-testid="reports-filter-drawer-panel"
            className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto space-y-6"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Advanced Query Studio</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={onToggleOpen}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Form fields */}
              <div className="space-y-4 text-xs">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor={titleInputId} className="text-xs font-semibold">
                    Project Title Query
                  </Label>
                  <Input
                    id={titleInputId}
                    placeholder="Search by keywords or title..."
                    value={filters.title || ''}
                    onChange={(e) => onFilterChange('title', e.target.value)}
                  />
                </div>

                {/* Author */}
                <div className="space-y-1.5">
                  <Label htmlFor={authorInputId} className="text-xs font-semibold">
                    Author / Proponent
                  </Label>
                  <Input
                    id={authorInputId}
                    placeholder="Filter by student author name..."
                    value={filters.author || ''}
                    onChange={(e) => onFilterChange('author', e.target.value)}
                  />
                </div>

                {/* Academic Year */}
                <div className="space-y-1.5">
                  <Label htmlFor={yearSelectId} className="text-xs font-semibold">
                    Academic Year
                  </Label>
                  <select
                    id={yearSelectId}
                    value={filters.year || ''}
                    onChange={(e) => onFilterChange('year', e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary shadow-2xs"
                  >
                    <option value="">All Academic Years</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adviser */}
                <div className="space-y-1.5">
                  <Label htmlFor={adviserSelectId} className="text-xs font-semibold">
                    Faculty Adviser
                  </Label>
                  <select
                    id={adviserSelectId}
                    value={filters.adviserId || ''}
                    onChange={(e) => onFilterChange('adviserId', e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary shadow-2xs"
                  >
                    <option value="">All Faculty Advisers</option>
                    {adviserOptions.map((adv) => (
                      <option key={adv.value} value={adv.value}>
                        {adv.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Degree Program */}
                <div className="space-y-1.5">
                  <Label htmlFor={programSelectId} className="text-xs font-semibold">
                    Degree Program
                  </Label>
                  <select
                    id={programSelectId}
                    value={filters.courseId || ''}
                    onChange={(e) => onFilterChange('courseId', e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary shadow-2xs"
                  >
                    <option value="">All Programs (BSIT, BSIS, etc.)</option>
                    {programOptions.map((prog) => (
                      <option key={prog.value} value={prog.value}>
                        {prog.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Keyword */}
                <div className="space-y-1.5">
                  <Label htmlFor={keywordSelectId} className="text-xs font-semibold">
                    Research Keyword
                  </Label>
                  <Input
                    id={keywordSelectId}
                    placeholder="e.g. Machine Learning, IoT, Agriculture"
                    value={filters.keyword || ''}
                    onChange={(e) => onFilterChange('keyword', e.target.value)}
                  />
                </div>

                {/* Rows per page */}
                <div className="space-y-1.5">
                  <Label htmlFor={limitSelectId} className="text-xs font-semibold">
                    Page Size
                  </Label>
                  <select
                    id={limitSelectId}
                    value={String(limit)}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary shadow-2xs"
                  >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onReset();
                  onToggleOpen();
                }}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onApply(filters);
                  onToggleOpen();
                }}
                className="flex-1 bg-primary text-primary-foreground font-semibold"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

ReportsFilterDrawer.propTypes = {
  filters: PropTypes.object,
  onFilterChange: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  yearOptions: PropTypes.array,
  authorOptions: PropTypes.array,
  adviserOptions: PropTypes.array,
  programOptions: PropTypes.array,
  keywordOptions: PropTypes.array,
  sortBy: PropTypes.string,
  setSortBy: PropTypes.func.isRequired,
  sortOrder: PropTypes.string,
  setSortOrder: PropTypes.func.isRequired,
  limit: PropTypes.number,
  setLimit: PropTypes.func.isRequired,
  isOpen: PropTypes.bool,
  onToggleOpen: PropTypes.func.isRequired,
};

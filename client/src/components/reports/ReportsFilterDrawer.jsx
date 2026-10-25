import { useId } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/Sheet';
import { Filter, X, RefreshCcw, Calendar, GraduationCap, SlidersHorizontal } from 'lucide-react';

const ALL_FILTER_VALUE = '__all__';

const selectValue = (value) => value || ALL_FILTER_VALUE;

const filterValue = (value) => (value === ALL_FILTER_VALUE ? '' : value);

function ReportFilterSelect({ id, value, onValueChange, placeholder, options, includeAll = true }) {
  return (
    <Select value={includeAll ? selectValue(value) : String(value)} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="h-11 min-h-11 w-full text-xs sm:h-9 sm:min-h-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value={ALL_FILTER_VALUE}>{placeholder}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * ReportsFilterDrawer — Slide-out filter configuration studio & persistent quick ribbon.
 */
export default function ReportsFilterDrawer({
  filters = {},
  onFilterChange,
  onApply,
  onReset,
  yearOptions = [],
  sectionOptions = ['BSIT 4A', 'BSIT 4B', 'BSIT 4C', 'BSIT 4D'],
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
  const sectionSelectId = useId();
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
      <Card
        data-testid="reports-filter-ribbon"
        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card shadow-xs"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleOpen}
            className="h-11 sm:h-8 min-h-[44px] sm:min-h-0 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer border-border hover:border-primary/50"
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
            <Select
              value={selectValue(filters.year)}
              onValueChange={(value) => {
                const year = filterValue(value);
                onFilterChange('year', year);
                onApply({ ...filters, year });
              }}
            >
              <SelectTrigger
                aria-label="Filter by academic year"
                className="h-11 min-h-11 w-auto min-w-40 text-xs sm:h-8 sm:min-h-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All Academic Years</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Section dropdown directly on ribbon (Cohort-Driven Aggregation) */}
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
            <Select
              value={selectValue(filters.section)}
              onValueChange={(value) => {
                const section = filterValue(value);
                onFilterChange('section', section);
                onApply({ ...filters, section });
              }}
            >
              <SelectTrigger
                aria-label="Filter by section"
                className="h-11 min-h-11 w-auto min-w-44 text-xs sm:h-8 sm:min-h-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All Sections (BSIT 4A - 4D)</SelectItem>
                {sectionOptions.map((sectionOption) => {
                  const val =
                    typeof sectionOption === 'string' ? sectionOption : sectionOption.name;
                  const label =
                    typeof sectionOption === 'string'
                      ? sectionOption
                      : sectionOption.label || sectionOption.name;
                  return (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Active filter chips */}
          {filters.title && (
            <Badge
              variant="secondary"
              className="inline-flex h-auto items-center gap-1 px-2 py-1 text-[11px] font-normal"
            >
              Title: <strong>{filters.title}</strong>
              <Button
                type="button"
                onClick={() => {
                  onFilterChange('title', '');
                  onApply({ ...filters, title: '' });
                }}
                variant="ghost"
                size="icon"
                className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive sm:size-8 sm:min-h-8 sm:min-w-8"
                aria-label="Remove title filter"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.section && (
            <Badge
              variant="secondary"
              className="inline-flex h-auto items-center gap-1 px-2 py-1 text-[11px] font-normal"
            >
              Section: <strong>{filters.section}</strong>
              <Button
                type="button"
                onClick={() => {
                  onFilterChange('section', '');
                  onApply({ ...filters, section: '' });
                }}
                variant="ghost"
                size="icon"
                className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive sm:size-8 sm:min-h-8 sm:min-w-8"
                aria-label="Remove section filter"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.adviserId && (
            <Badge
              variant="secondary"
              className="inline-flex h-auto items-center gap-1 px-2 py-1 text-[11px] font-normal"
            >
              Adviser Filter
              <Button
                type="button"
                onClick={() => {
                  onFilterChange('adviserId', '');
                  onApply({ ...filters, adviserId: '' });
                }}
                variant="ghost"
                size="icon"
                className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive sm:size-8 sm:min-h-8 sm:min-w-8"
                aria-label="Remove adviser filter"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.courseId && (
            <Badge
              variant="secondary"
              className="inline-flex h-auto items-center gap-1 px-2 py-1 text-[11px] font-normal"
            >
              Program Filter
              <Button
                type="button"
                onClick={() => {
                  onFilterChange('courseId', '');
                  onApply({ ...filters, courseId: '' });
                }}
                variant="ghost"
                size="icon"
                className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive sm:size-8 sm:min-h-8 sm:min-w-8"
                aria-label="Remove program filter"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
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
              className="h-11 sm:h-8 min-h-[44px] sm:min-h-0 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
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
              className="h-11 sm:h-6 min-h-[44px] sm:min-h-0 px-2.5 sm:px-1.5 text-xs sm:text-[10px]"
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
              className="h-11 sm:h-6 min-h-[44px] sm:min-h-0 px-2.5 sm:px-1.5 text-xs sm:text-[10px]"
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
      </Card>

      {/* 2. Slide-out Drawer / Modal Overlay */}
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (open !== isOpen) onToggleOpen?.();
        }}
      >
        <SheetContent
          data-testid="reports-filter-drawer-panel"
          side="right"
          className="h-dvh w-full max-w-md justify-between space-y-6 border-l border-border bg-card p-6 shadow-lg sm:max-w-md"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <SheetTitle className="text-base font-bold">Advanced Query Studio</SheetTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full cursor-pointer flex items-center justify-center"
                onClick={onToggleOpen}
                aria-label="Close filters drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SheetDescription className="sr-only">
              Set filters for archived capstone reports, then apply or reset your selection.
            </SheetDescription>

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
                  className="h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                />
              </div>

              {/* Author */}
              <div className="space-y-1.5">
                <Label htmlFor={authorInputId} className="text-xs font-semibold">
                  Author / Proponent
                </Label>
                <Input
                  id={authorInputId}
                  list={`${authorInputId}-options`}
                  placeholder="Filter by student author name..."
                  value={filters.author || ''}
                  onChange={(e) => onFilterChange('author', e.target.value)}
                  className="h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                />
                <datalist id={`${authorInputId}-options`}>
                  {authorOptions.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
              </div>

              {/* Academic Year */}
              <div className="space-y-1.5">
                <Label htmlFor={yearSelectId} className="text-xs font-semibold">
                  Academic Year
                </Label>
                <ReportFilterSelect
                  id={yearSelectId}
                  value={filters.year || ''}
                  onValueChange={(value) => onFilterChange('year', filterValue(value))}
                  placeholder="All Academic Years"
                  options={yearOptions.map((year) => ({ value: year, label: year }))}
                />
              </div>

              {/* Academic Section */}
              <div className="space-y-1.5">
                <Label htmlFor={sectionSelectId} className="text-xs font-semibold">
                  Academic Section (Cohort)
                </Label>
                <ReportFilterSelect
                  id={sectionSelectId}
                  value={filters.section || ''}
                  onValueChange={(value) => onFilterChange('section', filterValue(value))}
                  placeholder="All Sections (BSIT 4A - 4D)"
                  options={sectionOptions.map((sectionOption) => ({
                    value: typeof sectionOption === 'string' ? sectionOption : sectionOption.name,
                    label:
                      typeof sectionOption === 'string'
                        ? sectionOption
                        : sectionOption.label || sectionOption.name,
                  }))}
                />
              </div>

              {/* Adviser */}
              <div className="space-y-1.5">
                <Label htmlFor={adviserSelectId} className="text-xs font-semibold">
                  Faculty Adviser
                </Label>
                <ReportFilterSelect
                  id={adviserSelectId}
                  value={filters.adviserId || ''}
                  onValueChange={(value) => onFilterChange('adviserId', filterValue(value))}
                  placeholder="All Faculty Advisers"
                  options={adviserOptions}
                />
              </div>

              {/* Degree Program */}
              <div className="space-y-1.5">
                <Label htmlFor={programSelectId} className="text-xs font-semibold">
                  Degree Program
                </Label>
                <ReportFilterSelect
                  id={programSelectId}
                  value={filters.courseId || ''}
                  onValueChange={(value) => onFilterChange('courseId', filterValue(value))}
                  placeholder="All Programs (BSIT, BSIS, etc.)"
                  options={programOptions}
                />
              </div>

              {/* Keyword */}
              <div className="space-y-1.5">
                <Label htmlFor={keywordSelectId} className="text-xs font-semibold">
                  Research Keyword
                </Label>
                <Input
                  id={keywordSelectId}
                  list={`${keywordSelectId}-options`}
                  placeholder="e.g. Machine Learning, IoT, Agriculture"
                  value={filters.keyword || ''}
                  onChange={(e) => onFilterChange('keyword', e.target.value)}
                  className="h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                />
                <datalist id={`${keywordSelectId}-options`}>
                  {keywordOptions.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
              </div>

              {/* Rows per page */}
              <div className="space-y-1.5">
                <Label htmlFor={limitSelectId} className="text-xs font-semibold">
                  Page Size
                </Label>
                <ReportFilterSelect
                  id={limitSelectId}
                  value={limit}
                  onValueChange={(value) => setLimit(Number(value))}
                  includeAll={false}
                  options={[
                    { value: 10, label: '10 per page' },
                    { value: 20, label: '20 per page' },
                    { value: 50, label: '50 per page' },
                  ]}
                />
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
              className="min-w-0 flex-1 h-11 sm:h-9 min-h-[44px] sm:min-h-0 whitespace-normal cursor-pointer"
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
              className="min-w-0 flex-1 h-11 sm:h-9 min-h-[44px] sm:min-h-0 whitespace-normal bg-primary text-primary-foreground font-semibold cursor-pointer"
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

ReportsFilterDrawer.propTypes = {
  filters: PropTypes.object,
  onFilterChange: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  yearOptions: PropTypes.array,
  sectionOptions: PropTypes.array,
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

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, Search, Layers, Globe, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { IT_DISCIPLINES, SDG_GOALS } from '@cms/shared';

/**
 * AlignmentSelectorDialog — Accessible, high-performance modal dialog for managing
 * one-to-many relationships for IT Fields of Discipline and UN Sustainable Development Goals.
 */
export function AlignmentSelectorDialog({
  open,
  onOpenChange,
  type = 'discipline', // 'discipline' | 'sdg'
  selectedItems = [],
  proposalIndex = 0,
  onSave,
}) {
  const [activeType, setActiveType] = useState(type);
  const [tempSelection, setTempSelection] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');

  useEffect(() => {
    setActiveType(type);
  }, [type, open]);

  useEffect(() => {
    if (open) {
      setTempSelection([...selectedItems]);
      setSearchTerm('');
      setSelectedDomain('ALL');
    }
  }, [open, selectedItems]);

  // Unique domains for discipline filtering
  const uniqueDomains = useMemo(() => {
    const domains = new Set(IT_DISCIPLINES.map((d) => d.domain));
    return ['ALL', ...Array.from(domains)];
  }, []);

  // Filtered items based on active tab and search
  const filteredDisciplines = useMemo(() => {
    let list = IT_DISCIPLINES;
    if (selectedDomain !== 'ALL') {
      list = list.filter((d) => d.domain === selectedDomain);
    }
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.domain.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    );
  }, [searchTerm, selectedDomain]);

  const filteredSdgs = useMemo(() => {
    if (!searchTerm.trim()) return SDG_GOALS;
    const q = searchTerm.toLowerCase().trim();
    return SDG_GOALS.filter(
      (g) => String(g.id) === q || `sdg ${g.id}`.includes(q) || g.name.toLowerCase().includes(q),
    );
  }, [searchTerm]);

  const isDisciplineMode = activeType === 'discipline';

  const toggleItem = (itemKey) => {
    setTempSelection((prev) => {
      if (prev.includes(itemKey)) {
        return prev.filter((k) => k !== itemKey);
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, itemKey];
    });
  };

  const handleSave = () => {
    onSave?.(tempSelection, activeType);
    onOpenChange(false);
  };

  const handleClear = () => {
    setTempSelection([]);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl flex flex-col gap-0 overflow-hidden p-0 sm:rounded-xl"
        showClose={false}
      >
        {/* Modal Header */}
        <DialogHeader className="shrink-0 flex-row items-center justify-between border-b border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-2 text-primary border border-primary/20">
              {isDisciplineMode ? <Layers className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold text-foreground">
                  {isDisciplineMode ? 'Select IT Fields of Discipline' : 'Select Target UN SDGs'}
                </DialogTitle>
                <Badge variant="secondary" className="shrink-0 whitespace-nowrap text-[10px]">
                  Proposal {proposalIndex + 1}
                </Badge>
              </div>
              <DialogDescription className="mt-0.5 text-xs">
                {isDisciplineMode
                  ? 'Select one or more specializations aligned with your capstone title proposal (1–10 max).'
                  : 'Select one or more UN 2030 Sustainable Development Goals aligned with your project (1–10 max).'}
              </DialogDescription>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Search & Domain Filter Toolbar */}
        <div className="shrink-0 p-3.5 border-b border-border/50 bg-muted/10 space-y-2.5">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              aria-label={isDisciplineMode ? 'Search IT disciplines' : 'Search UN SDGs'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isDisciplineMode
                  ? 'Search 18+ disciplines by keyword, domain, or description...'
                  : 'Search 17 UN SDGs by number, title, or keywords...'
              }
              className="h-9 rounded-lg pl-9 pr-8 text-xs"
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {isDisciplineMode && (
            <div
              role="group"
              aria-label="Filter disciplines by domain"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]"
            >
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider shrink-0 mr-1">
                Domain:
              </span>
              {uniqueDomains.map((domain) => (
                <Button
                  key={domain}
                  type="button"
                  variant={selectedDomain === domain ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDomain(domain)}
                  aria-pressed={selectedDomain === domain}
                  className="h-7 shrink-0 whitespace-nowrap px-2 text-[10.5px] font-medium"
                >
                  {domain}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Checkbox List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2 max-h-[420px] scrollbar-thin">
          {isDisciplineMode ? (
            filteredDisciplines.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No matching IT disciplines found.
              </div>
            ) : (
              filteredDisciplines.map((item) => {
                const isChecked = tempSelection.includes(item.name);
                const checkboxId = `discipline-${item.id}`;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative flex items-start gap-3 rounded-lg border p-3 transition-all',
                      isChecked
                        ? 'border-primary/50 bg-primary/5 shadow-2xs'
                        : 'border-border/70 bg-card hover:border-border hover:bg-muted/30',
                    )}
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={isChecked}
                      onCheckedChange={() => toggleItem(item.name)}
                      className="mt-0.5"
                    />

                    <Label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            isChecked ? 'text-foreground' : 'text-foreground/90',
                          )}
                        >
                          {item.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-background text-primary border-primary/30 text-[9.5px] py-0"
                        >
                          {item.domain}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-normal leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </Label>
                  </div>
                );
              })
            )
          ) : filteredSdgs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No matching UN SDGs found.
            </div>
          ) : (
            filteredSdgs.map((goal) => {
              const formattedTag = `SDG ${goal.id}: ${goal.name}`;
              const isChecked = tempSelection.includes(formattedTag);
              const checkboxId = `sdg-${goal.id}`;

              return (
                <div
                  key={goal.id}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg border p-2.5 transition-all',
                    isChecked
                      ? 'border-primary/50 bg-primary/5 shadow-2xs'
                      : 'border-border/70 bg-card hover:border-border hover:bg-muted/30',
                  )}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={isChecked}
                    onCheckedChange={() => toggleItem(formattedTag)}
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                  >
                    <Badge
                      variant={isChecked ? 'default' : 'secondary'}
                      className="shrink-0 rounded font-mono px-1.5 py-0.5 text-[10px]"
                    >
                      SDG {goal.id}
                    </Badge>
                    <span
                      className={cn(
                        'truncate text-xs',
                        isChecked ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {goal.name}
                    </span>
                  </Label>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-between border-t border-border/60 bg-muted/20 p-3.5 sm:space-x-0">
          <div className="flex items-center gap-2 text-xs">
            <span
              className="font-medium text-foreground"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              Selected: {tempSelection.length}
            </span>
            <span className="text-muted-foreground">(Max 10 per proposal)</span>
            {tempSelection.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="ml-1 h-7 px-2 text-[11px] text-destructive"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-8 gap-1.5 px-3.5 text-xs shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Apply Selection ({tempSelection.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

AlignmentSelectorDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['discipline', 'sdg']),
  selectedItems: PropTypes.arrayOf(PropTypes.string),
  proposalIndex: PropTypes.number,
  onSave: PropTypes.func,
};

export default AlignmentSelectorDialog;

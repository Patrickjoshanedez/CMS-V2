import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { X, Search, Check, Layers, Globe, CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  portal = true,
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

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alignment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
    >
      <div className="fixed inset-0" onClick={() => onOpenChange(false)} aria-hidden="true" />

      <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col border-border/80 bg-card shadow-2xl overflow-hidden rounded-xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-border/60 p-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-2 text-primary border border-primary/20">
              {isDisciplineMode ? <Layers className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="alignment-modal-title" className="text-base font-semibold text-foreground">
                  {isDisciplineMode ? 'Select IT Fields of Discipline' : 'Select Target UN SDGs'}
                </h2>
                <Badge variant="secondary" className="text-[10px]">
                  Proposal {proposalIndex + 1}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDisciplineMode
                  ? 'Select one or more specializations aligned with your capstone title proposal (1–10 max).'
                  : 'Select one or more UN 2030 Sustainable Development Goals aligned with your project (1–10 max).'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search & Domain Filter Toolbar */}
        <div className="shrink-0 p-3.5 border-b border-border/50 bg-muted/10 space-y-2.5">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isDisciplineMode
                  ? 'Search 18+ disciplines by keyword, domain, or description...'
                  : 'Search 17 UN SDGs by number, title, or keywords...'
              }
              className="h-9 w-full rounded-lg bg-background pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground border border-input focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isDisciplineMode && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider shrink-0 mr-1">
                Domain:
              </span>
              {uniqueDomains.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setSelectedDomain(domain)}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-medium text-[10.5px] whitespace-nowrap transition-colors border',
                    selectedDomain === domain
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/60',
                  )}
                >
                  {domain}
                </button>
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

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.name)}
                    className={cn(
                      'group relative flex items-start gap-3 rounded-lg border p-3 cursor-pointer select-none transition-all',
                      isChecked
                        ? 'border-primary/50 bg-primary/5 shadow-2xs'
                        : 'border-border/70 bg-card hover:border-border hover:bg-muted/30',
                    )}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={cn(
                        'h-4 w-4 rounded-sm border shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                        isChecked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40 bg-background group-hover:border-primary/60',
                      )}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
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
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
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

              return (
                <div
                  key={goal.id}
                  onClick={() => toggleItem(formattedTag)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer select-none transition-all',
                    isChecked
                      ? 'border-primary/50 bg-primary/5 shadow-2xs'
                      : 'border-border/70 bg-card hover:border-border hover:bg-muted/30',
                  )}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={cn(
                      'h-4 w-4 rounded-sm border shrink-0 flex items-center justify-center transition-colors',
                      isChecked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40 bg-background group-hover:border-primary/60',
                    )}
                  >
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>

                  <span
                    className={cn(
                      'shrink-0 rounded font-mono font-bold px-1.5 py-0.5 text-[10px] border',
                      isChecked
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/80 text-foreground border-border/80 group-hover:border-primary/40',
                    )}
                  >
                    SDG {goal.id}
                  </span>

                  <span
                    className={cn(
                      'text-xs flex-1 truncate font-medium',
                      isChecked ? 'text-foreground font-semibold' : 'text-foreground/90',
                    )}
                  >
                    {goal.name}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-border/60 p-3.5 bg-muted/20">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">Selected: {tempSelection.length}</span>
            <span className="text-muted-foreground">(Max 10 per proposal)</span>
            {tempSelection.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-destructive hover:underline ml-1"
              >
                Clear
              </button>
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
              className="text-xs h-8 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Apply Selection ({tempSelection.length})
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  if (!portal || typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}

AlignmentSelectorDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['discipline', 'sdg']),
  selectedItems: PropTypes.arrayOf(PropTypes.string),
  proposalIndex: PropTypes.number,
  onSave: PropTypes.func,
  portal: PropTypes.bool,
};

export default AlignmentSelectorDialog;

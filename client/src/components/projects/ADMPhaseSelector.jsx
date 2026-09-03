import React from 'react';
import PropTypes from 'prop-types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, Clock, Award, Layers } from 'lucide-react';

export default function ADMPhaseSelector({
  selectedPhase = 'CAPSTONE_2',
  onPhaseChange,
  academicYear = '2025–2026',
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 border border-border/60 p-3 rounded-lg min-w-0">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Matrix Milestone Revision Scope
          </span>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
            AY {academicYear}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Select milestone phase to review or log defense action items.
        </p>
      </div>

      <Tabs value={selectedPhase} onValueChange={onPhaseChange} className="shrink-0">
        <TabsList className="bg-card border border-border/60 h-9 p-1 inline-flex">
          <TabsTrigger value="ALL" className="text-xs gap-1.5 px-2.5">
            <Layers className="h-3 w-3" />
            All Phases
          </TabsTrigger>
          <TabsTrigger value="CAPSTONE_2" className="text-xs gap-1.5 px-3">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Cap 2 (Ch. 1–3)
          </TabsTrigger>
          <TabsTrigger value="CAPSTONE_3" className="text-xs gap-1.5 px-3">
            <Clock className="h-3 w-3 text-primary animate-pulse" />
            Cap 3 (Dev / Midterm)
          </TabsTrigger>
          <TabsTrigger value="CAPSTONE_4" className="text-xs gap-1.5 px-3">
            <Award className="h-3 w-3 text-purple-500" />
            Cap 4 (Final Defense)
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

ADMPhaseSelector.propTypes = {
  selectedPhase: PropTypes.string,
  onPhaseChange: PropTypes.func.isRequired,
  academicYear: PropTypes.string,
};

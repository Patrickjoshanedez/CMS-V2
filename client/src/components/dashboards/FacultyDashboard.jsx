import { useMemo, useState } from 'react';
import { ROLES } from '@cms/shared';
import AdviserDashboard from './AdviserDashboard';
import PanelistDashboard from './PanelistDashboard';

const VIEW_MODES = {
  REVIEW: 'review',
  PANEL: 'panel',
};

export default function FacultyDashboard({ user }) {
  const defaultMode = useMemo(() => {
    if (user?.role === ROLES.PANELIST) {
      return VIEW_MODES.PANEL;
    }

    return VIEW_MODES.REVIEW;
  }, [user?.role]);

  const [mode, setMode] = useState(defaultMode);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Faculty Member Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              One workspace for both adviser and panel responsibilities.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setMode(VIEW_MODES.REVIEW)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === VIEW_MODES.REVIEW
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Adviser Review
            </button>
            <button
              type="button"
              onClick={() => setMode(VIEW_MODES.PANEL)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === VIEW_MODES.PANEL
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Panel Topics
            </button>
          </div>
        </div>
      </div>

      {mode === VIEW_MODES.REVIEW ? <AdviserDashboard /> : <PanelistDashboard />}
    </div>
  );
}

import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import TeamCommitteeAssignmentsView from '@/components/users/TeamCommitteeAssignmentsView';

/**
 * CommitteeAssignmentsPage — Dedicated instructor page for managing and appointing
 * capstone defense committees (Adviser, Secretary, and Defense Panelists) across teams.
 */
export default function CommitteeAssignmentsPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 max-w-[1600px] mx-auto min-w-0 w-full">
        <TeamCommitteeAssignmentsView />
      </div>
    </DashboardLayout>
  );
}

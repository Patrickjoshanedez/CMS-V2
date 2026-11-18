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
      <div className="min-w-0 w-full space-y-6">
        <TeamCommitteeAssignmentsView />
      </div>
    </DashboardLayout>
  );
}

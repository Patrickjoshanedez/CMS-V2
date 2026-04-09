import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';
import PanelistTopicCard from './PanelistTopicCard';

const PanelistDashboard = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['panelistTopics'],
    queryFn: async () => {
      const response = await dashboardService.getPanelistTopics();
      return response.data?.data || response.data;
    },
    staleTime: 60 * 1000,
  });

  const selectMutation = useMutation({
    mutationFn: (projectId) => dashboardService.selectPanelistTopic(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panelistTopics'] });
    },
  });

  const assigned = data?.assigned || [];
  const available = data?.available || [];

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-3 text-slate-600">Loading panelist topics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load panelist topics: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-8">
      <header>
        <h1 className="text-4xl font-bold text-slate-900">Panelist Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Review proposed topics and select project groups you will evaluate.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Assigned Topics</h2>
          <span className="text-sm font-semibold text-slate-600">{assigned.length} assigned</span>
        </div>
        {assigned.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">
            You have not selected any topics yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assigned.map((topic) => (
              <PanelistTopicCard
                key={topic._id}
                topic={topic}
                onSelect={() => {}}
                selecting={false}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Available Topics</h2>
          <span className="text-sm font-semibold text-slate-600">{available.length} available</span>
        </div>
        {available.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">
            No open topics available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {available.map((topic) => (
              <PanelistTopicCard
                key={topic._id}
                topic={topic}
                onSelect={(projectId) => selectMutation.mutate(projectId)}
                selecting={selectMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default React.memo(PanelistDashboard);

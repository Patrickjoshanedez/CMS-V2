/**
 * VersionHistory.jsx
 * Displays all versions (upload history) for a submission.
 * Shows version number, date, status, and originality score.
 * Allows comparing two versions side-by-side (with VersionCompare).
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { submissionService } from '@/services/submissionService';
import VersionCompare from './VersionCompare';

const formatVersionDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : format(date, 'MMM dd, yyyy h:mm aa');
};

const VersionHistory = ({ submissionId }) => {
  const [selectedVersions, setSelectedVersions] = useState([null, null]);
  const [showCompare, setShowCompare] = useState(false);

  // Fetch version history
  const {
    data: versionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['submissionVersions', submissionId],
    queryFn: () => submissionService.getSubmissionVersions(submissionId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const versions = versionsData?.data?.versions || [];

  if (isLoading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle className="text-base">Version history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3" role="status" aria-live="polite">
            <Spinner className="text-primary" />
            <span className="text-sm text-muted-foreground">Loading submission versions…</span>
          </div>
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-20 w-full" />
            <SkeletonText lines={2} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Version history unavailable</AlertTitle>
        <AlertDescription>Failed to load version history. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  if (versions.length === 0) {
    return (
      <EmptyState
        title="No previous versions"
        description="Earlier uploads will appear here when this submission has more than one version."
        compact
      />
    );
  }

  const handleSelectVersion = (index, versionId) => {
    setSelectedVersions((current) => {
      const next = [...current];
      next[index] = versionId;
      return next;
    });
  };

  const canCompare = selectedVersions[0] && selectedVersions[1];
  const selectedVersionRecords = selectedVersions.map((id) =>
    versions.find((version) => version._id === id),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">All versions</h3>
        {versions.map((version, index) => {
          const isSelected = selectedVersions.includes(version._id);
          const originality = Number.isFinite(version.plagiarismScore)
            ? `${version.plagiarismScore}%`
            : null;

          return (
            <Card
              key={version._id}
              className={
                isSelected ? 'border-primary bg-primary/5' : 'transition-colors hover:bg-muted/30'
              }
              data-selected={isSelected || undefined}
            >
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">v{version.version}</span>
                    {index === 0 && <Badge variant="info">Latest</Badge>}
                    <Badge variant="outline" className="capitalize">
                      {version.status?.replaceAll('_', ' ') || 'Status unavailable'}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {formatVersionDate(version.submittedAt)}
                  </p>

                  {originality !== null && (
                    <p className="text-sm text-muted-foreground">
                      Originality: <strong className="text-foreground">{originality}</strong>
                    </p>
                  )}

                  {version.reviewNote && (
                    <p className="mt-2 break-words text-sm italic text-muted-foreground">
                      &ldquo;{version.reviewNote}&rdquo;
                    </p>
                  )}
                </div>

                <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 focus-within:ring-2 focus-within:ring-ring">
                  <Checkbox
                    checked={isSelected}
                    aria-label={`Select version ${version.version} for comparison`}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const emptyIndex = selectedVersions.findIndex((selected) => !selected);
                        if (emptyIndex !== -1) handleSelectVersion(emptyIndex, version._id);
                      } else {
                        setSelectedVersions((current) =>
                          current.map((selected) => (selected === version._id ? null : selected)),
                        );
                      }
                    }}
                  />
                  <span className="sr-only">Select for comparison</span>
                </label>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {canCompare && (
        <Button className="w-full" onClick={() => setShowCompare(true)}>
          Compare selected versions
        </Button>
      )}

      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare versions</DialogTitle>
            <DialogDescription>
              Compare the saved submission details for the selected versions.
            </DialogDescription>
          </DialogHeader>
          {selectedVersionRecords[0] && selectedVersionRecords[1] && (
            <VersionCompare
              version1={selectedVersionRecords[0]}
              version2={selectedVersionRecords[1]}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

VersionHistory.propTypes = {
  submissionId: PropTypes.string.isRequired,
};

export default VersionHistory;

import React, { useState } from 'react';
import {
  ExternalLink,
  Video,
  LineChart,
  Save,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { useUpdateGanttChartUrl, useUpdateDemoVideoUrl } from '@/hooks/useProjects';
import { toast } from 'sonner';

/**
 * DevelopmentAssetsForm
 *
 * Allows students to manage project assets by providing external links:
 * 1. Gantt Chart URL (e.g., Google Sheets, Excel Online)
 * 2. Demo Video URL (e.g., Google Drive, YouTube)
 */
const DevelopmentAssetsForm = ({ project, isReadOnly = false }) => {
  const [ganttUrl, setGanttUrl] = useState(project?.ganttChartUrl || '');
  const [demoUrl, setDemoUrl] = useState(project?.demoVideoUrl || '');

  const updateGanttMutation = useUpdateGanttChartUrl();
  const updateDemoMutation = useUpdateDemoVideoUrl();

  const handleUpdateGantt = async () => {
    if (!ganttUrl.trim()) {
      toast.error('Gantt Chart URL is required');
      return;
    }

    try {
      await updateGanttMutation.mutateAsync({
        projectId: project._id,
        ganttChartUrl: ganttUrl.trim(),
      });
      toast.success('Gantt Chart URL updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to update Gantt Chart URL');
    }
  };

  const handleUpdateDemo = async () => {
    if (!demoUrl.trim()) {
      toast.error('Demo Video URL is required');
      return;
    }

    try {
      await updateDemoMutation.mutateAsync({
        projectId: project._id,
        demoVideoUrl: demoUrl.trim(),
      });
      toast.success('Demo Video URL updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to update Demo Video URL');
    }
  };

  return (
    <div className="space-y-6">
      {!isReadOnly && (
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold">Asset Management</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Provide links to your project&apos;s development assets. These will be reviewed by your
            adviser and panel during evaluations.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gantt Chart Section */}
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <LineChart className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Gantt Chart</CardTitle>
            </div>
            <CardDescription>
              {isReadOnly
                ? 'Project timeline and schedule'
                : 'Link to your project timeline (e.g., Google Sheets, Online Excel)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isReadOnly && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Gantt Chart URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://docs.google.com/spreadsheets/..."
                      value={ganttUrl}
                      onChange={(e) => setGanttUrl(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                  <Button
                    onClick={handleUpdateGantt}
                    disabled={updateGanttMutation.isPending || ganttUrl === project?.ganttChartUrl}
                    className="h-10 px-4"
                  >
                    {updateGanttMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {project?.ganttChartUrl ? (
              <div className={`pt-2 ${!isReadOnly ? 'border-t border-border/50' : ''}`}>
                <a
                  href={project.ganttChartUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline group"
                >
                  View current Gantt Chart
                  <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            ) : (
              isReadOnly && (
                <p className="text-sm text-muted-foreground italic">
                  No Gantt Chart link provided.
                </p>
              )
            )}
          </CardContent>
        </Card>

        {/* Demo Video Section */}
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Video className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-lg">Demo Video</CardTitle>
            </div>
            <CardDescription>
              {isReadOnly
                ? 'Prototype demonstration video'
                : 'Link to your prototype demo (e.g., Google Drive, YouTube)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isReadOnly && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Demo Video URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://drive.google.com/file/..."
                      value={demoUrl}
                      onChange={(e) => setDemoUrl(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                  <Button
                    onClick={handleUpdateDemo}
                    disabled={updateDemoMutation.isPending || demoUrl === project?.demoVideoUrl}
                    className="h-10 px-4"
                  >
                    {updateDemoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {project?.demoVideoUrl ? (
              <div className={`pt-2 ${!isReadOnly ? 'border-t border-border/50' : ''}`}>
                <a
                  href={project.demoVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline group"
                >
                  Watch current Demo Video
                  <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            ) : (
              isReadOnly && (
                <p className="text-sm text-muted-foreground italic">No Demo Video link provided.</p>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {!isReadOnly && !project?.ganttChartUrl && !project?.demoVideoUrl && (
        <Alert variant="warning" className="bg-amber-500/5 border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-600">Assets Missing</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            You haven&apos;t provided links to your Gantt Chart or Demo Video yet. Please provide
            these assets to help your reviewers track your progress.
          </AlertDescription>
        </Alert>
      )}

      {!isReadOnly && (project?.ganttChartUrl || project?.demoVideoUrl) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg border border-border/50">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span>Your assets are available for faculty review in the evaluation panel.</span>
        </div>
      )}
    </div>
  );
};

export default DevelopmentAssetsForm;

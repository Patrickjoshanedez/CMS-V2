import { Download, Globe, Lock, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useProjectSubmissions, useSubmissionViewUrl } from '@/hooks/useSubmissions';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';

/**
 * Renders exactly the final repository documents.
 */
export default function FinalDocumentsList({ project }) {
  const user = useAuthStore(s => s.user);
  const { data, isLoading } = useProjectSubmissions(project?._id, { limit: 100 });
  
  if (isLoading || !data) return null;

  const submissions = data.submissions || [];

  const finalAcademic = submissions.find(s => s.type === 'final_academic');
  const finalJournal = submissions.find(s => s.type === 'final_journal');

  if (!finalAcademic && !finalJournal) return null;

  // Evaluate if current user can see the protected Full Academic Version
  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const isAdviser = user?.role === ROLES.ADVISER && project?.adviserId?._id === user._id;
  const isPanelist = user?.role === ROLES.PANELIST && project?.panelistIds?.some(p => p._id === user._id);
  const isTeamMember = user?.role === ROLES.STUDENT && project?.teamId?._id === user.teamId;

  const canViewAcademic = isInstructor || isAdviser || isPanelist || isTeamMember;

  return (
    <Card className="border-primary/20">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Central Archiving Repository
        </CardTitle>
        <CardDescription>
          Finalized documents compiled for this capstone project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {finalJournal && (
          <div className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-blue-500" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Journal / Publishable Version</h4>
                  <Badge variant="outline" className="text-[10px]">Public</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{finalJournal.fileName}</p>
              </div>
            </div>
            <PresignedDownloadButton submissionId={finalJournal._id} />
          </div>
        )}

        {finalAcademic && canViewAcademic && (
          <div className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-8 w-8 text-amber-500" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Full Academic Version</h4>
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">Restricted</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{finalAcademic.fileName}</p>
              </div>
            </div>
            <PresignedDownloadButton submissionId={finalAcademic._id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PresignedDownloadButton({ submissionId }) {
  // Use lazy fetch to avoid burning URLs on render
  const { refetch, isFetching } = useSubmissionViewUrl(submissionId, { enabled: false });

  const handleDownload = async () => {
    try {
      const { data, isError, error } = await refetch();
      if (isError) {
        toast.error(error?.response?.data?.message || 'Download forbidden or unavailable.');
        return;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to retrieve document link.');
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={isFetching}>
      <Download className="mr-2 h-4 w-4" />
      View / Download
    </Button>
  );
}
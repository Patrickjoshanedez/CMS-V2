import { useState, useRef } from 'react';
import { useAddPrototypeLink, useAddPrototypeMedia } from '@/hooks/useProjects';
import { useUpdateGithubLink } from '@/hooks/useTeams';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  Github,
  Upload,
  Loader2,
  Plus,
  Calendar,
  Video,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_MEDIA =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,application/pdf';
const MAX_FILE_SIZE_MB = 50;

export default function DevelopmentAssetsForm({ project }) {
  const teamId = typeof project?.teamId === 'object' ? project?.teamId?._id : project?.teamId;
  const currentGithubUrl = project?.teamId?.githubUrl || '';

  return (
    <div className="space-y-4">
      <GithubLinkForm teamId={teamId} currentUrl={currentGithubUrl} />
      <AssetUploadForm projectId={project._id} />
    </div>
  );
}

function GithubLinkForm({ teamId, currentUrl }) {
  const [url, setUrl] = useState(currentUrl || '');
  const [isEditing, setIsEditing] = useState(!currentUrl);

  const updateGithub = useUpdateGithubLink();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    updateGithub.mutate(
      { teamId, githubUrl: url.trim() },
      {
        onSuccess: () => {
          toast.success('GitHub link updated successfully.');
          setIsEditing(false);
        },
        onError: () => toast.error('Failed to update GitHub link.'),
      },
    );
  };

  return (
    <Card className="border-indigo-500/20">
      <CardHeader className="pb-3 bg-indigo-50/50 dark:bg-indigo-950/20">
        <CardTitle className="flex items-center gap-2 text-base text-indigo-700 dark:text-indigo-400">
          <Github className="h-5 w-5" />
          Source Code Repository
        </CardTitle>
        <CardDescription>
          Link your team&apos;s GitHub repository containing the source code for the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {!isEditing ? (
          <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {url}
              </a>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/your-username/your-repo"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={updateGithub.isPending || !url.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {updateGithub.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Save Link'
              )}
            </Button>
            {currentUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUrl(currentUrl);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function AssetUploadForm({ projectId }) {
  const [assetType, setAssetType] = useState('Gantt Chart');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);

  const addMedia = useAddPrototypeMedia({
    onSuccess: () => {
      toast.success(`${assetType} uploaded successfully!`);
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to upload asset.'),
  });

  if (!open) {
    return (
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center justify-between py-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2 p-3 bg-muted rounded-full text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Upload Development Assets</h4>
              <p className="text-sm text-muted-foreground">
                Upload your Gantt Chart, Prototype Video, or System Architecture
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !file) return;

    const formData = new FormData();
    formData.append('title', `${assetType}: ${title.trim()}`);
    if (description.trim()) formData.append('description', description.trim());
    formData.append('file', file);

    addMedia.mutate({ projectId, formData });
  };

  const fileInfo = file ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)` : null;

  return (
    <Card className="border-blue-500/20">
      <CardHeader className="pb-3 bg-blue-50/50 dark:bg-blue-950/20">
        <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-400">
          <Upload className="h-5 w-5" />
          Upload Development Asset
        </CardTitle>
        <CardDescription>
          Upload your Gantt Chart (PDF/Image) or Prototype Video (MP4/WebM, max {MAX_FILE_SIZE_MB}
          MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Asset Type *</Label>
            <div className="flex gap-2">
              {['Gantt Chart', 'Prototype Video', 'System Architecture'].map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={assetType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAssetType(type)}
                  className={assetType === type ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-title">Title *</Label>
            <Input
              id="media-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. Final ${assetType}`}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-file">File *</Label>
            <Input
              id="media-file"
              ref={fileRef}
              type="file"
              accept={ACCEPTED_MEDIA}
              onChange={handleFileChange}
              required
            />
            {fileInfo && <p className="text-xs text-muted-foreground">{fileInfo}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-desc">Description (optional)</Label>
            <Textarea
              id="media-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the uploaded asset"
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addMedia.isPending || !title.trim() || !file}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {addMedia.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload Asset
            </Button>
          </div>

          {addMedia.error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>
                {addMedia.error?.response?.data?.error?.message || 'Upload failed'}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

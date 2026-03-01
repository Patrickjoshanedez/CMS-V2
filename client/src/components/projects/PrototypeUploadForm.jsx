import { useState, useRef } from 'react';
import { useAddPrototypeLink, useAddPrototypeMedia } from '@/hooks/useProjects';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { ExternalLink, Upload, Loader2, Plus, Image as ImageIcon, Video } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm';
const MAX_FILE_SIZE_MB = 50;

/**
 * PrototypeUploadForm — Allows students to add prototype links or upload media.
 *
 * Two sections rendered inline:
 *   1. Add External Link — title, description, URL
 *   2. Upload Media — title, description, file picker (images/videos)
 *
 * @param {{ projectId: string }} props
 */
export default function PrototypeUploadForm({ projectId }) {
  return (
    <div className="space-y-4">
      <LinkForm projectId={projectId} />
      <MediaForm projectId={projectId} />
    </div>
  );
}

/* ────────── Link Form ────────── */

function LinkForm({ projectId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);

  const addLink = useAddPrototypeLink({
    onSuccess: () => {
      toast.success('Link added!');
      setTitle('');
      setDescription('');
      setUrl('');
      setOpen(false);
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to add link.'),
  });

  if (!open) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Add External Link</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Link
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    addLink.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ExternalLink className="h-4 w-4" />
          Add External Link
        </CardTitle>
        <CardDescription>Link to a deployed prototype, demo video, or repository.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-title">Title *</Label>
            <Input
              id="link-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Live Demo"
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-url">URL *</Label>
            <Input
              id="link-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-desc">Description (optional)</Label>
            <Textarea
              id="link-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the link"
              maxLength={500}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={addLink.isPending || !title.trim() || !url.trim()}>
              {addLink.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Add Link
            </Button>
          </div>
          {addLink.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {addLink.error?.response?.data?.error?.message || 'Failed to add link'}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/* ────────── Media Upload Form ────────── */

function MediaForm({ projectId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);

  const addMedia = useAddPrototypeMedia({
    onSuccess: () => {
      toast.success('Media uploaded!');
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setOpen(false);
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to upload media.'),
  });

  if (!open) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
              <Video className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">Upload Image or Video</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload
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
    formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());
    formData.append('file', file);

    addMedia.mutate({ projectId, formData });
  };

  const fileInfo = file
    ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" />
          Upload Prototype Media
        </CardTitle>
        <CardDescription>
          Upload screenshots, demo videos, or UI mockups (max {MAX_FILE_SIZE_MB}MB).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="media-title">Title *</Label>
            <Input
              id="media-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Login Screen"
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
            {fileInfo && (
              <p className="text-xs text-muted-foreground">{fileInfo}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="media-desc">Description (optional)</Label>
            <Textarea
              id="media-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the media"
              maxLength={500}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={addMedia.isPending || !title.trim() || !file}
            >
              {addMedia.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Upload
            </Button>
          </div>
          {addMedia.error && (
            <Alert variant="destructive">
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

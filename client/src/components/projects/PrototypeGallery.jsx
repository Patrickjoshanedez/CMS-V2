import { useRef, useState } from 'react';
import { usePrototypes, useRemovePrototype, useAddPrototypeLink, useAddPrototypeMedia } from '@/hooks/useProjects';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  Image as ImageIcon,
  Video,
  ExternalLink,
  Trash2,
  Loader2,
  AlertTriangle,
  Layers,
  Upload,
  Link as LinkIcon,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Human-readable prototype type labels and associated icons.
 */
const TYPE_META = {
  image: { icon: ImageIcon, label: 'Image', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  video: { icon: Video, label: 'Video', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  link: { icon: ExternalLink, label: 'Link', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm';
const MAX_FILE_SIZE_MB = 100;

/**
 * Single prototype card — renders differently based on type.
 */
function PrototypeCard({ prototype, canDelete, onDelete, isDeleting }) {
  const meta = TYPE_META[prototype.type] || TYPE_META.link;
  const Icon = meta.icon;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      {/* Preview area */}
      <div className="flex h-40 items-center justify-center bg-muted/50">
        {prototype.type === 'image' && prototype.url ? (
          <img
            src={prototype.url}
            alt={prototype.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : prototype.type === 'video' && prototype.url ? (
          <video
            src={prototype.url}
            className="h-full w-full object-cover"
            controls
            preload="metadata"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon className="h-10 w-10" />
            <span className="text-xs">External Link</span>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 text-sm font-semibold leading-snug">
            {prototype.title}
          </h4>
          <Badge variant="secondary" className={`shrink-0 text-[10px] ${meta.color}`}>
            {meta.label}
          </Badge>
        </div>

        {prototype.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {prototype.description}
          </p>
        )}

        {/* Link button for external links */}
        {prototype.type === 'link' && prototype.url && (
          <a
            href={prototype.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open Link
          </a>
        )}
      </div>

      {/* Delete button — only for team members */}
      {canDelete && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="destructive"
            size="icon"
            className="h-7 w-7"
            disabled={isDeleting}
            onClick={() => onDelete(prototype._id)}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Inline upload panel (student only) ── */
function AddPrototypePanel({ projectId, onClose }) {
  const [mode, setMode] = useState('file'); // 'file' | 'link'
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const addMedia = useAddPrototypeMedia({
    onSuccess: () => {
      toast.success('Asset uploaded to gallery!');
      onClose();
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Upload failed.'),
  });

  const addLink = useAddPrototypeLink({
    onSuccess: () => {
      toast.success('Link added to gallery!');
      onClose();
    },
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to add link.'),
  });

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (mode === 'link') {
      if (!url.trim()) return;
      addLink.mutate({ projectId, title: title.trim(), url: url.trim() });
    } else {
      if (!file) return;
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('file', file);
      addMedia.mutate({ projectId, formData: fd });
    }
  };

  const isPending = addMedia.isPending || addLink.isPending;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Add to Showcase</h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        <Button
          type="button"
          size="sm"
          variant={mode === 'file' ? 'default' : 'outline'}
          onClick={() => setMode('file')}
          className="gap-1.5 text-xs h-7"
        >
          <Upload className="h-3 w-3" />
          File / Video
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'link' ? 'default' : 'outline'}
          onClick={() => setMode('link')}
          className="gap-1.5 text-xs h-7"
        >
          <LinkIcon className="h-3 w-3" />
          Link
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="proto-title" className="text-xs">Title *</Label>
          <Input
            id="proto-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Prototype Demo Video"
            className="h-8 text-xs"
            required
          />
        </div>

        {mode === 'file' ? (
          <div className="space-y-1">
            <Label htmlFor="proto-file" className="text-xs">
              File * <span className="text-muted-foreground">(Image / Video — max {MAX_FILE_SIZE_MB} MB)</span>
            </Label>
            <Input
              id="proto-file"
              ref={fileRef}
              type="file"
              accept={ACCEPTED_MEDIA}
              onChange={handleFileChange}
              className="h-8 text-xs"
              required
            />
            {file && (
              <p className="text-[11px] text-muted-foreground">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="proto-url" className="text-xs">URL *</Label>
            <Input
              id="proto-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="h-8 text-xs"
              required
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-7 text-xs"
            disabled={isPending || !title.trim() || (mode === 'file' ? !file : !url.trim())}
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {mode === 'file' ? 'Upload' : 'Add Link'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * PrototypeGallery — Fetches and displays all prototypes for a project.
 *
 * @param {{ projectId: string, canDelete?: boolean, canAdd?: boolean }} props
 *   - projectId: The project to fetch prototypes for
 *   - canDelete: Whether the current user may delete prototypes (students on their own project)
 *   - canAdd: Whether the current user may add prototypes (students on their own project)
 */
export default function PrototypeGallery({ projectId, canDelete = false, canAdd = false }) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const { data: prototypes, isLoading, error } = usePrototypes(projectId);

  const remove = useRemovePrototype({
    onSuccess: () => toast.success('Prototype removed.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to remove prototype.'),
  });

  const handleDelete = (prototypeId) => {
    remove.mutate({ projectId, prototypeId });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5" />
              Prototype Showcase
            </CardTitle>
            <CardDescription>
              Images, videos, and links demonstrating the system prototype.
            </CardDescription>
          </div>
          {canAdd && !showAddPanel && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setShowAddPanel(true)}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Inline add panel */}
        {showAddPanel && (
          <AddPrototypePanel
            projectId={projectId}
            onClose={() => setShowAddPanel(false)}
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.response?.data?.error?.message || 'Failed to load prototypes'}
            </AlertDescription>
          </Alert>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!prototypes || prototypes.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-10 text-center">
            <Layers className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">No prototypes yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canAdd
                ? 'Click "Add" to upload images, videos, or add links.'
                : 'Upload images, videos, or add links to showcase the prototype.'}
            </p>
          </div>
        )}

        {/* Gallery grid */}
        {!isLoading && prototypes && prototypes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prototypes.map((proto) => (
              <PrototypeCard
                key={proto._id}
                prototype={proto}
                canDelete={canDelete}
                onDelete={handleDelete}
                isDeleting={remove.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Video,
  Layers,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  useUpdateDemoVideoUrl,
  usePrototypes,
  useAddPrototypeMedia,
  useAddPrototypeLink,
  useRemovePrototype,
} from '@/hooks/useProjects';
import { toast } from 'sonner';

/**
 * Format video URL for embedding if recognized (YouTube, Vimeo, Google Drive, direct mp4).
 */
function getEmbedUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();

  // YouTube match
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/,
  );
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }

  // Google Drive match
  const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveMatch) {
    return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
  }

  return null;
}

const TYPE_META = {
  image: {
    icon: ImageIcon,
    label: 'Image',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  video: {
    icon: Video,
    label: 'Video',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  link: {
    icon: ExternalLink,
    label: 'Live Link',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
};

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm';

export default function PrototypeShowcaseAndDemo({
  project,
  isReadOnly = false,
  canAdd = true,
  canDelete = true,
}) {
  const projectId = project?._id || project?.id;
  const [demoUrl, setDemoUrl] = useState(project?.demoVideoUrl || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState('file'); // 'file' | 'link'
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Demo Video Mutation
  const updateDemoMutation = useUpdateDemoVideoUrl();

  // Prototypes Query & Mutations
  const { data: prototypes = [], isLoading, error } = usePrototypes(projectId);
  const addMediaMutation = useAddPrototypeMedia();
  const addLinkMutation = useAddPrototypeLink();
  const removeMutation = useRemovePrototype();

  const handleSaveDemo = async () => {
    if (!demoUrl.trim()) {
      toast.error('Demo video link cannot be empty');
      return;
    }
    try {
      await updateDemoMutation.mutateAsync({
        projectId,
        demoVideoUrl: demoUrl.trim(),
      });
      toast.success('System demo video link updated.');
    } catch (err) {
      toast.error(err?.message || 'Failed to update demo video link');
    }
  };

  const handleAddPrototype = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Prototype title is required.');
      return;
    }

    try {
      if (addMode === 'file') {
        if (!selectedFile) {
          toast.error('Please select an image or video file.');
          return;
        }
        await addMediaMutation.mutateAsync({
          projectId,
          file: selectedFile,
          title: newTitle.trim(),
          description: newDescription.trim(),
        });
        toast.success('Prototype media uploaded successfully.');
      } else {
        if (!newUrl.trim()) {
          toast.error('Please provide a valid URL.');
          return;
        }
        await addLinkMutation.mutateAsync({
          projectId,
          title: newTitle.trim(),
          url: newUrl.trim(),
          description: newDescription.trim(),
        });
        toast.success('Prototype link added successfully.');
      }

      // Reset form
      setNewTitle('');
      setNewUrl('');
      setNewDescription('');
      setSelectedFile(null);
      setShowAddModal(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message || err?.message || 'Failed to save prototype',
      );
    }
  };

  const handleDelete = (prototypeId) => {
    if (!window.confirm('Delete this prototype showcase item?')) return;
    removeMutation.mutate({ projectId, prototypeId });
  };

  const embedUrl = getEmbedUrl(project?.demoVideoUrl);
  const isDirectVideo =
    project?.demoVideoUrl && /\.(mp4|webm|ogg)$/i.test(project.demoVideoUrl.split('?')[0]);

  return (
    <div className="space-y-6" data-testid="prototype-showcase-and-demo">
      {/* 1. System Demo Video Section */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shrink-0">
                  <Video className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  System Prototype Demo Video
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Official capstone demonstration video recording evaluated by the defense committee.
              </CardDescription>
            </div>
            {project?.demoVideoUrl && (
              <Badge
                variant="outline"
                className="w-fit text-[11px] font-mono border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300 gap-1.5"
              >
                <CheckCircle2 className="h-3 w-3 text-purple-500" />
                Video Submitted
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {!isReadOnly ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Demo Video Link (YouTube, Google Drive, Vimeo, or Direct MP4)
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="https://www.youtube.com/watch?v=... or Google Drive link"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    className="pl-9 h-9 text-xs"
                    data-testid="demo-video-url-input"
                  />
                </div>
                <Button
                  onClick={handleSaveDemo}
                  disabled={updateDemoMutation.isPending || demoUrl === project?.demoVideoUrl}
                  className="h-9 px-4 text-xs gap-1.5 shrink-0"
                  data-testid="save-demo-video-btn"
                >
                  {updateDemoMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Demo Link
                </Button>
              </div>
            </div>
          ) : (
            !project?.demoVideoUrl && (
              <p className="text-xs text-muted-foreground italic">
                No system demo video link provided.
              </p>
            )
          )}

          {/* Embedded Video Player or Preview */}
          {project?.demoVideoUrl && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {embedUrl ? (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/80 bg-black/90 shadow-md">
                  <iframe
                    src={embedUrl}
                    title="Prototype Demonstration Video"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : isDirectVideo ? (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/80 bg-black shadow-md">
                  <video
                    src={project.demoVideoUrl}
                    controls
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Video className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">External Video Link</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-md">
                        {project.demoVideoUrl}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="text-xs h-8 gap-1.5 shrink-0"
                  >
                    <a href={project.demoVideoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Watch Video
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Prototype Showcase Gallery Section */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  Prototype Showcase Gallery
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Screenshots, UI/UX mockups, screen recordings, and live system links demonstrating
                your functional prototype.
              </CardDescription>
            </div>
            {canAdd && !isReadOnly && (
              <Button
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="gap-1.5 text-xs h-8 shrink-0"
                data-testid="add-prototype-showcase-btn"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Prototype Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Add Item Modal / Inline Form */}
          {showAddModal && (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.02] p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Add Prototype Showcase Item
                </h4>
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setAddMode('file')}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      addMode === 'file'
                        ? 'bg-background font-semibold text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode('link')}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      addMode === 'link'
                        ? 'bg-background font-semibold text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    External Link
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddPrototype} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Title</Label>
                  <Input
                    placeholder="e.g. Mobile App Navigation Flow, Web Dashboard V1"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                {addMode === 'file' ? (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Select Image or Video File</Label>
                    <Input
                      type="file"
                      accept={ACCEPTED_MEDIA}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="h-9 text-xs cursor-pointer"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Supported: JPG, PNG, WebP, MP4, WebM (Max 100MB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">External Prototype Link</Label>
                    <Input
                      placeholder="https://www.figma.com/proto/... or https://your-demo.vercel.app"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Description (Optional)</Label>
                  <Input
                    placeholder="Briefly describe what this prototype deliverable demonstrates..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addMediaMutation.isPending || addLinkMutation.isPending}
                    className="h-8 text-xs gap-1.5"
                  >
                    {addMediaMutation.isPending || addLinkMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Upload Prototype
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-xs">Loading prototype deliverables...</span>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {error?.response?.data?.error?.message || 'Failed to load prototype deliverables.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {!isLoading && !error && (!prototypes || prototypes.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 py-10 text-center">
              <Layers className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-foreground">No prototypes submitted yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {canAdd && !isReadOnly
                  ? 'Upload system screenshots, architecture mockups, demo recordings, or live links.'
                  : 'The team has not uploaded any prototype showcase deliverables yet.'}
              </p>
              {canAdd && !isReadOnly && !showAddModal && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 gap-1.5 text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Prototype
                </Button>
              )}
            </div>
          )}

          {/* Prototypes Grid */}
          {!isLoading && prototypes && prototypes.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prototypes.map((item) => {
                const meta = TYPE_META[item.type] || TYPE_META.link;
                const Icon = meta.icon;

                return (
                  <div
                    key={item._id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card hover:shadow-md transition-shadow"
                  >
                    {/* Preview thumbnail */}
                    <div className="flex h-36 items-center justify-center bg-muted/40 overflow-hidden relative">
                      {item.type === 'image' && item.url ? (
                        <img
                          src={item.url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : item.type === 'video' && item.url ? (
                        <video
                          src={item.url}
                          controls
                          className="h-full w-full object-cover"
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                          <Icon className="h-8 w-8 text-primary/80" />
                          <span className="text-[11px] font-medium">External System Demo</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2">
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h5 className="text-xs font-semibold text-foreground line-clamp-1">
                            {item.title}
                          </h5>
                          <Badge variant="outline" className={`shrink-0 text-[10px] ${meta.color}`}>
                            {meta.label}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline pt-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open Deliverable
                        </a>
                      )}
                    </div>

                    {/* Delete action */}
                    {canDelete && !isReadOnly && (
                      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 rounded-lg shadow-sm"
                          disabled={removeMutation.isPending}
                          onClick={() => handleDelete(item._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

PrototypeShowcaseAndDemo.propTypes = {
  project: PropTypes.object,
  isReadOnly: PropTypes.bool,
  canAdd: PropTypes.bool,
  canDelete: PropTypes.bool,
};

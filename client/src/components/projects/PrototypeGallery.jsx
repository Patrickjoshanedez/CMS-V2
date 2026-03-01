import { usePrototypes, useRemovePrototype } from '@/hooks/useProjects';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  Image as ImageIcon,
  Video,
  ExternalLink,
  Trash2,
  Loader2,
  AlertTriangle,
  Layers,
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

/**
 * PrototypeGallery — Fetches and displays all prototypes for a project.
 *
 * @param {{ projectId: string, canDelete?: boolean }} props
 *   - projectId: The project to fetch prototypes for
 *   - canDelete: Whether the current user may delete prototypes (students on their own project)
 */
export default function PrototypeGallery({ projectId, canDelete = false }) {
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
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5" />
          Prototype Showcase
        </CardTitle>
        <CardDescription>
          Images, videos, and links demonstrating the system prototype.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              Upload images, videos, or add links to showcase the prototype.
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

import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Image as ImageIcon,
  Video,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

/**
 * PrototypeGalleryModal — Institutional Architecture & Prototype Media Showcase
 *
 * Displays uploaded architecture diagrams, system mockups, UI screenshots,
 * demo videos, and verified GitHub repository for BukSU capstone projects.
 */
export default function PrototypeGalleryModal({
  open,
  onClose,
  project,
  prototypes: propPrototypes,
  githubRepoUrl: propGithubRepoUrl,
}) {
  const [copied, setCopied] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  if (!open || !project) return null;

  const title = project.title || 'Capstone Project';
  const githubUrl =
    propGithubRepoUrl ||
    project.githubRepoUrl ||
    project.teamId?.githubLink ||
    project.archiveMetadata?.githubUrl ||
    null;

  const prototypes =
    propPrototypes || (Array.isArray(project.prototypes) ? project.prototypes : []) || [];

  const handleClose = () => {
    setActiveImage(null);
    onClose();
  };

  const handleCopyGithub = async () => {
    if (githubUrl && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(githubUrl);
        setCopied(true);
        toast.success('GitHub repository link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Could not copy the GitHub repository link.');
      }
    }
  };

  return (
    <Dialog
      open={open && Boolean(project)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent
        showClose={false}
        className="flex max-h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0"
        data-testid="prototype-gallery-modal"
      >
        {/* Header */}
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border bg-muted/20 p-5 pr-14">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <DialogTitle className="truncate text-lg">
                Architecture &amp; Prototype Showcase
              </DialogTitle>
            </div>
            <DialogDescription className="truncate">{title}</DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="-mr-10 -mt-1 shrink-0"
            aria-label="Close prototype gallery"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </DialogHeader>

        {/* Content Body */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          {/* Verified GitHub Repository Pill / Banner */}
          {githubUrl ? (
            <Card className="bg-muted/30 shadow-none">
              <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Code2 className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        Verified GitHub Repository
                      </span>
                      <Badge variant="success" className="text-[10px]">
                        Active
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5 max-w-lg">
                      {githubUrl}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyGithub}
                    className="h-8 text-xs gap-1.5"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button size="sm" asChild className="h-8 text-xs gap-1.5">
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                      <span>Open Code</span>
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-3.5 text-sm text-muted-foreground">
              <Code2 className="size-4 shrink-0" aria-hidden="true" />
              <span>No public GitHub repository linked to this capstone yet.</span>
            </div>
          )}

          {/* Prototype Media Showcase */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ImageIcon className="size-4 text-primary" aria-hidden="true" />
                Uploaded System Media &amp; Architecture ({prototypes.length})
              </h3>
            </div>

            {prototypes.length === 0 ? (
              <EmptyState
                icon={Layers}
                compact
                title="No media assets uploaded"
                description="The proponents have not uploaded architecture diagrams or UI screenshots for this project yet."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {prototypes.map((item, idx) => {
                  const mediaUrl = item.signedUrl || item.fileUrl || item.externalUrl || item.url;
                  const itemTitle = item.title || `Media Asset ${idx + 1}`;
                  const isImage =
                    item.type === 'image' ||
                    (!item.type && mediaUrl && /\.(png|jpe?g|webp|gif|svg)$/i.test(mediaUrl));

                  return (
                    <Card
                      key={item._id || idx}
                      className="group flex flex-col overflow-hidden shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted/40">
                        {isImage && mediaUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="absolute inset-0 h-full min-h-0 w-full min-w-0 overflow-hidden rounded-none p-0"
                            onClick={() => setActiveImage({ url: mediaUrl, title: itemTitle })}
                            aria-label={`Preview image: ${itemTitle}`}
                          >
                            <img
                              src={mediaUrl}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          </Button>
                        ) : item.type === 'video' ? (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <Video className="size-8 text-info" aria-hidden="true" />
                            <span className="text-[11px] font-medium">Demo Video</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <ExternalLink className="size-8 text-primary" aria-hidden="true" />
                            <span className="text-[11px] font-medium">Prototype Link</span>
                          </div>
                        )}
                        <Badge
                          variant="secondary"
                          className="absolute left-2 top-2 bg-background/90 text-[10px] font-medium"
                        >
                          {item.type || 'Media'}
                        </Badge>
                      </div>

                      <CardContent className="flex flex-1 flex-col justify-between space-y-2 p-3">
                        <div>
                          <h4
                            className="text-xs font-semibold text-foreground line-clamp-1"
                            title={itemTitle}
                          >
                            {itemTitle}
                          </h4>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {mediaUrl && (
                          <div className="pt-1">
                            <a
                              href={mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              <span>View Original</span>
                              <ExternalLink className="size-3" aria-hidden="true" />
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border bg-muted/10 p-4">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Expanded Lightbox Image Preview */}
      <Dialog
        open={Boolean(activeImage)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveImage(null);
        }}
      >
        <DialogContent
          showClose={false}
          className="max-w-6xl gap-3 border-0 bg-background/95 p-4 shadow-xl sm:p-6"
          aria-label={activeImage ? `Image preview: ${activeImage.title}` : undefined}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setActiveImage(null)}
            className="absolute right-3 top-3 z-10"
            aria-label="Close image preview"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
          {activeImage && (
            <>
              <DialogTitle className="pr-10">{activeImage.title}</DialogTitle>
              <img
                src={activeImage.url}
                alt={activeImage.title}
                className="mx-auto max-h-[75vh] max-w-full rounded-md object-contain"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

PrototypeGalleryModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  project: PropTypes.object,
  prototypes: PropTypes.arrayOf(PropTypes.object),
  githubRepoUrl: PropTypes.string,
};

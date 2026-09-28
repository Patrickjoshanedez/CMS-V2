import React, { useState } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

  const handleCopyGithub = () => {
    if (githubUrl && navigator.clipboard) {
      navigator.clipboard.writeText(githubUrl);
      setCopied(true);
      toast.success('GitHub repository link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        data-testid="prototype-gallery-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="space-y-1 pr-6 min-w-0">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-lg font-bold text-foreground truncate">
                Architecture &amp; Prototype Showcase
              </h2>
            </div>
            <p className="text-xs text-muted-foreground truncate">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Verified GitHub Repository Pill / Banner */}
          {githubUrl ? (
            <div className="p-4 rounded-lg border border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Verified GitHub Repository
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    >
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate mt-0.5 max-w-lg">
                    {githubUrl}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyGithub}
                  className="h-8 text-xs gap-1.5"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button size="sm" asChild className="h-8 text-xs gap-1.5">
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                    <span>Open Code</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground flex items-center gap-2">
              <Code2 className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              <span>No public GitHub repository linked to this capstone yet.</span>
            </div>
          )}

          {/* Prototype Media Showcase */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Uploaded System Media &amp; Architecture ({prototypes.length})
              </h3>
            </div>

            {prototypes.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed border-border/80 rounded-lg">
                <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium text-foreground">No media assets uploaded</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  The proponents have not uploaded architecture diagrams or UI screenshots for this
                  project yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {prototypes.map((item, idx) => {
                  const mediaUrl = item.fileUrl || item.externalUrl || item.url;
                  const itemTitle = item.title || `Media Asset ${idx + 1}`;
                  const isImage =
                    item.type === 'image' ||
                    (!item.type && mediaUrl && /\.(png|jpe?g|webp|gif|svg)$/i.test(mediaUrl));

                  return (
                    <div
                      key={item._id || idx}
                      className="group rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="aspect-video bg-muted/40 relative overflow-hidden flex items-center justify-center">
                        {isImage && mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt={itemTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => setActiveImage({ url: mediaUrl, title: itemTitle })}
                            loading="lazy"
                          />
                        ) : item.type === 'video' ? (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <Video className="w-8 h-8 text-purple-500" />
                            <span className="text-[11px] font-medium">Demo Video</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <ExternalLink className="w-8 h-8 text-primary" />
                            <span className="text-[11px] font-medium">Prototype Link</span>
                          </div>
                        )}
                        <Badge
                          variant="secondary"
                          className="absolute top-2 left-2 text-[10px] font-medium backdrop-blur-md bg-background/80"
                        >
                          {item.type || 'Media'}
                        </Badge>
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
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
                              className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <span>View Original</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Expanded Lightbox Image Preview */}
      {activeImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveImage(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeImage.url}
            alt={activeImage.title}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-white/90 text-sm mt-3 font-medium">{activeImage.title}</p>
        </div>
      )}
    </div>
  );
}

PrototypeGalleryModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  project: PropTypes.object,
  prototypes: PropTypes.arrayOf(PropTypes.object),
  githubRepoUrl: PropTypes.string,
};

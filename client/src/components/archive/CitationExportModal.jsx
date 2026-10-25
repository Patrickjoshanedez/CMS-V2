import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Copy, Check, Download, Quote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { toast } from 'sonner';

export default function CitationExportModal({ open, onClose, project }) {
  const [copiedFormat, setCopiedFormat] = useState(null);

  if (!project) return null;

  const title = project.title || 'Untitled Research Manuscript';
  const proponents = project.proponents || 'BukSU Capstone Proponents';
  const year = project.publicationYear || new Date().getFullYear();
  const publisher = project.publisher || 'Bukidnon State University Studies Center';
  const doi =
    project.doi ||
    (project.archiveMetadata?.doi ? `https://doi.org/${project.archiveMetadata.doi}` : '');
  const idSlug = (project._id || 'buksu_manuscript').toString().slice(-8);

  // Formatted citations
  const apaCitation = `${proponents} (${year}). ${title}. ${publisher}.${doi ? ` ${doi}` : ''}`;

  const ieeeCitation = `[1] ${proponents}, "${title}," ${publisher}, Malaybalay City, Philippines, ${year}.${doi ? ` Available: ${doi}` : ''}`;

  const mlaCitation = `${proponents}. "${title}." ${publisher}, ${year}.${doi ? ` ${doi}.` : ''}`;

  const bibtexCitation = `@article{buksu_${idSlug}_${year},
  title={${title}},
  author={${proponents}},
  year={${year}},
  publisher={${publisher}}${doi ? `,\n  doi={${doi}}` : ''}
}`;

  const handleCopy = (text, formatKey) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedFormat(formatKey);
      toast.success(`Copied ${formatKey.toUpperCase()} citation to clipboard`);
      setTimeout(() => setCopiedFormat(null), 2000);
    }
  };

  const handleDownloadBibtex = () => {
    const blob = new Blob([bibtexCitation], { type: 'application/x-bibtex' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `citation_${idSlug}.bib`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded .bib citation file');
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden bg-card p-0">
        {/* Header */}
        <DialogHeader className="flex-row items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Quote className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Cite Academic Manuscript</DialogTitle>
              <DialogDescription className="line-clamp-1 max-w-md text-xs">
                {title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Citations List */}
        <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
          {/* APA 7 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                APA (7th Edition)
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(apaCitation, 'apa')}
              >
                {copiedFormat === 'apa' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success-foreground" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-sm text-foreground font-serif leading-relaxed select-all">
              {apaCitation}
            </div>
          </div>

          {/* IEEE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                IEEE
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(ieeeCitation, 'ieee')}
              >
                {copiedFormat === 'ieee' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success-foreground" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-sm text-foreground font-serif leading-relaxed select-all">
              {ieeeCitation}
            </div>
          </div>

          {/* MLA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                MLA (9th Edition)
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(mlaCitation, 'mla')}
              >
                {copiedFormat === 'mla' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success-foreground" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-sm text-foreground font-serif leading-relaxed select-all">
              {mlaCitation}
            </div>
          </div>

          {/* BibTeX */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                BibTeX
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(bibtexCitation, 'bibtex')}
                >
                  {copiedFormat === 'bibtex' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success-foreground" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] gap-1.5 text-xs"
                  onClick={handleDownloadBibtex}
                >
                  <Download className="w-3.5 h-3.5" />
                  .bib
                </Button>
              </div>
            </div>
            <pre className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-foreground font-mono overflow-x-auto whitespace-pre select-all">
              {bibtexCitation}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

CitationExportModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  project: PropTypes.object,
};

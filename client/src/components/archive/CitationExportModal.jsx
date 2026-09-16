import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Copy, Check, Download, BookOpen, Quote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function CitationExportModal({ open, onClose, project }) {
  const [copiedFormat, setCopiedFormat] = useState(null);

  if (!open || !project) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-50">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cite-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h2 id="cite-modal-title" className="text-base font-semibold text-foreground">
                Cite Academic Manuscript
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Citations List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* APA 7 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                APA (7th Edition)
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(apaCitation, 'apa')}
              >
                {copiedFormat === 'apa' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
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
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(ieeeCitation, 'ieee')}
              >
                {copiedFormat === 'ieee' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
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
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(mlaCitation, 'mla')}
              >
                {copiedFormat === 'mla' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
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
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(bibtexCitation, 'bibtex')}
                >
                  {copiedFormat === 'bibtex' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
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
                  className="h-7 text-xs gap-1.5"
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
        <div className="flex justify-end gap-2 border-t border-border px-6 py-3 bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

CitationExportModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  project: PropTypes.object,
};

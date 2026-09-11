import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  FileUp,
  X,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import submissionService from '@/services/submissionService';
import { toast } from 'sonner';

export default function CompileProposalModal({
  isOpen,
  onClose,
  projectId,
  isRevision = false,
  currentVersion = 1,
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const targetVersion = isRevision ? currentVersion + 1 : 1;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    const validExtensions = ['.docx', '.pdf'];
    const hasValidExt = validExtensions.some((ext) => selected.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      toast.error('Please upload a Microsoft Word (.docx) or PDF (.pdf) file.');
      return;
    }

    if (selected.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit.');
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select your manuscript document file.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (remarks.trim()) {
        formData.append('remarks', remarks.trim());
      }

      await submissionService.compileProposal(projectId, formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.min(percent, 90));
        }
      });

      setUploadProgress(100);
      toast.success(
        isRevision
          ? `Revised Chapters 1–3 Manuscript (v${targetVersion}) submitted successfully!`
          : 'Compiled Chapters 1–3 Manuscript submitted successfully for Adviser endorsement!',
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        'Failed to upload manuscript. Please verify that Chapters 1–3 are approved.';
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-5 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              {isRevision ? <RefreshCw className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                {isRevision
                  ? `Submit Revised Chapters 1–3 Manuscript`
                  : 'Compile & Submit Chapters 1–3 Manuscript'}
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-primary/30 text-primary"
                >
                  v{targetVersion}
                </Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isRevision
                  ? 'Post-defense revised manuscript with panel and client recommendations incorporated'
                  : 'Unified proposal document for Adviser review and defense endorsement'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Informational callout */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {isRevision
                ? 'Action Done Matrix Synchronization'
                : 'Capstone 2 Preparation Workflow'}
            </p>
            <p className="text-[11px] leading-relaxed">
              {isRevision
                ? 'Make sure that all page numbers cited in your Action Done Matrix correspond accurately to this revised copy. The committee will verify revisions using the Sophisticated Document Viewer comparison mode.'
                : 'Once your assigned Adviser approves this compiled manuscript, the project is marked ready for defense, and the Course Instructor will be notified to schedule your hearing.'}
            </p>
          </div>

          {/* File Upload Box */}
          <div className="space-y-1.5">
            <Label htmlFor="manuscript-file" className="text-xs font-semibold text-foreground">
              Manuscript File (.docx or .pdf) <span className="text-destructive">*</span>
            </Label>
            <div
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                file
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/70 hover:border-primary/40 hover:bg-muted/10'
              }`}
              onClick={() => document.getElementById('manuscript-file-input')?.click()}
            >
              <input
                id="manuscript-file-input"
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-6 w-6 text-primary shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[280px]">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                    </p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 ml-auto" />
                </div>
              ) : (
                <div className="space-y-1">
                  <FileUp className="h-7 w-7 text-muted-foreground mx-auto" />
                  <p className="text-xs font-medium text-foreground">
                    Click to browse or drag and drop manuscript
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Supports Microsoft Word (.docx) or PDF (.pdf) up to 50MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Revision Remarks / Justification */}
          <div className="space-y-1.5">
            <Label htmlFor="manuscript-remarks" className="text-xs font-semibold text-foreground">
              {isRevision ? 'Revision Summary / Notes' : 'Submission Remarks (Optional)'}
            </Label>
            <textarea
              id="manuscript-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                isRevision
                  ? 'e.g., Revised Chapters 1–3 addressing Chair Labastida, Member Lecaros, Member Abella, and Client Dr. Aribe comments.'
                  : 'e.g., Compiled draft with complete introduction, literature review, and methodology framework.'
              }
              rows={3}
              disabled={isUploading}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Uploading manuscript to secure storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isUploading}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploading || !file}
              className="gap-1.5 h-8 text-xs font-semibold shadow-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : isRevision ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Submit Revised Manuscript (v{targetVersion})
                </>
              ) : (
                <>
                  <FileUp className="h-3.5 w-3.5" />
                  Compile & Submit Manuscript
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

CompileProposalModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  projectId: PropTypes.string.isRequired,
  isRevision: PropTypes.bool,
  currentVersion: PropTypes.number,
  onSuccess: PropTypes.func,
};

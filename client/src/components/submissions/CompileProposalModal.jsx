import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FileUp, X, FileText, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Textarea } from '@/components/ui/Textarea';
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
  const fileInputRef = useRef(null);

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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isUploading) onClose();
      }}
    >
      <DialogContent
        showClose={false}
        aria-describedby="compile-proposal-description"
        className="max-h-[calc(100dvh-1rem)] max-w-lg gap-0 overflow-y-auto p-0 sm:max-h-[90vh]"
        onEscapeKeyDown={(event) => isUploading && event.preventDefault()}
        onInteractOutside={(event) => isUploading && event.preventDefault()}
      >
        <DialogHeader className="flex-row items-start gap-3 border-b border-border/60 bg-muted/20 p-5 pr-16">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            {isRevision ? (
              <RefreshCw aria-hidden="true" className="size-4" />
            ) : (
              <FileUp aria-hidden="true" className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-sm font-bold">
                {isRevision
                  ? 'Submit Revised Chapters 1–3 Manuscript'
                  : 'Compile & Submit Chapters 1–3 Manuscript'}
              </DialogTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                v{targetVersion}
              </Badge>
            </div>
            <DialogDescription id="compile-proposal-description" className="text-xs">
              {isRevision
                ? 'Post-defense revised manuscript with panel and client recommendations incorporated'
                : 'Unified proposal document for Adviser review and defense endorsement'}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close manuscript submission"
            className="absolute right-3 top-3 min-h-[44px] min-w-[44px]"
            onClick={onClose}
            disabled={isUploading}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Alert role="status" variant="info" className="p-3">
            <AlertTitle className="flex items-center gap-1.5 text-xs">
              <Sparkles aria-hidden="true" className="size-3.5 text-warning-foreground" />
              {isRevision
                ? 'Action Done Matrix Synchronization'
                : 'Capstone 2 Preparation Workflow'}
            </AlertTitle>
            <AlertDescription className="text-xs leading-relaxed">
              {isRevision
                ? 'Make sure that all page numbers cited in your Action Done Matrix correspond accurately to this revised copy. The committee will verify revisions using the Sophisticated Document Viewer comparison mode.'
                : 'Once your assigned Adviser approves this compiled manuscript, the project is marked ready for defense, and the Course Instructor will be notified to schedule your hearing.'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="manuscript-file-input" className="text-xs font-semibold">
              Manuscript File (.docx or .pdf) <span className="text-destructive">*</span>
            </Label>
            <input
              ref={fileInputRef}
              id="manuscript-file-input"
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
              aria-label="Manuscript File (.docx or .pdf)"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              aria-label={
                file
                  ? `Selected file: ${file.name}. Choose another manuscript`
                  : 'Choose manuscript file'
              }
              className={`h-auto min-h-[44px] w-full flex-col whitespace-normal rounded-lg border-2 border-dashed p-4 text-center ${
                file
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/70 hover:border-primary/40 hover:bg-muted/10'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <span className="flex w-full min-w-0 items-center justify-center gap-3">
                  <FileText aria-hidden="true" className="size-6 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block max-w-[280px] truncate text-xs font-semibold text-foreground">
                      {file.name}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                    </span>
                  </span>
                  <CheckCircle2
                    aria-hidden="true"
                    className="ml-auto size-4 shrink-0 text-success-foreground"
                  />
                </span>
              ) : (
                <span className="space-y-1">
                  <FileUp aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
                  <span className="block text-xs font-medium text-foreground">
                    Click to browse or drag and drop manuscript
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    Supports Microsoft Word (.docx) or PDF (.pdf) up to 50MB
                  </span>
                </span>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manuscript-remarks" className="text-xs font-semibold">
              {isRevision ? 'Revision Summary / Notes' : 'Submission Remarks (Optional)'}
            </Label>
            <Textarea
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
              className="min-h-[88px] text-xs"
            />
          </div>

          {isUploading && (
            <div className="space-y-2 pt-1" aria-live="polite">
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>Uploading manuscript to secure storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} aria-label="Manuscript upload progress" />
            </div>
          )}

          <DialogFooter className="flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isUploading}
              className="min-h-[44px] w-full text-xs sm:min-h-0 sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploading || !file}
              className="min-h-[44px] w-full gap-1.5 text-xs font-semibold shadow-xs sm:min-h-0 sm:w-auto"
            >
              {isUploading ? (
                <>
                  <Spinner className="size-3.5" />
                  Uploading...
                </>
              ) : isRevision ? (
                <>
                  <RefreshCw aria-hidden="true" className="size-3.5" />
                  Submit Revised Manuscript (v{targetVersion})
                </>
              ) : (
                <>
                  <FileUp aria-hidden="true" className="size-3.5" />
                  Compile &amp; Submit Manuscript
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

CompileProposalModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  projectId: PropTypes.string.isRequired,
  isRevision: PropTypes.bool,
  currentVersion: PropTypes.number,
  onSuccess: PropTypes.func,
};

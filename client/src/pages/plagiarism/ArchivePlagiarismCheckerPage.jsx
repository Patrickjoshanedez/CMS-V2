import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DropZone from '@/components/plagiarism/DropZone';
import PlagiarismReportPage from '@/pages/submissions/PlagiarismReportPage';
import ScanButton from '@/components/plagiarism/ScanButton';
import ScanHero from '@/components/plagiarism/ScanHero';
import { plagiarismService } from '@/services/plagiarismService';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_SIZE_MB = 25;
const DEFAULT_SEMANTIC_MODEL = import.meta.env.VITE_ARCHIVE_SEMANTIC_MODEL || 'BAAI/bge-m3';

function buildValidationError(message) {
  return { type: 'validation', message };
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc'];
function isAcceptedDocument(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const hasExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasMime =
    type === 'application/pdf' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    type === 'application/x-zip-compressed' ||
    type === 'application/zip';
  return hasExt || hasMime;
}

function getInlineErrorMessage(error) {
  const status = Number(error?.response?.status);
  const message = String(error?.message || '').toLowerCase();
  const isClientTimeout = error?.code === 'ECONNABORTED' || message.includes('timeout');

  if (isClientTimeout) {
    return {
      type: 'server',
      message: 'Scan timed out. Please try again or verify network connectivity.',
    };
  }
  if (status === 429) {
    return { type: 'server', message: 'Too many scans. Please wait before trying again.' };
  }
  if (status >= 500) {
    return { type: 'server', message: 'Scan service unavailable. Try again shortly.' };
  }
  return {
    type: 'server',
    message:
      error?.response?.data?.message ||
      error?.message ||
      'Scan failed. Please check your document and try again.',
  };
}

export default function ArchivePlagiarismCheckerPage() {
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [semanticModel, setSemanticModel] = useState(DEFAULT_SEMANTIC_MODEL);

  useEffect(() => {
    if (!scanning) return undefined;
    const timerId = window.setInterval(() => {
      setElapsedSeconds((c) => c + 1);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [scanning]);

  const selectedFileMeta = useMemo(() => {
    if (!file) return null;
    const sizeInBytes = Number(file.size || 0);
    return {
      name: file.name,
      sizeInBytes,
      sizeLabel: `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`,
      tooLarge: sizeInBytes > MAX_FILE_SIZE_BYTES,
    };
  }, [file]);

  const dropZoneError = scanError?.type === 'validation' ? scanError?.message : null;
  const canScan = Boolean(file) && !selectedFileMeta?.tooLarge && !scanning;

  const handleSelectFile = (nextFile) => {
    if (!nextFile) {
      setFile(null);
      setScanError(null);
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setScanError(buildValidationError('File exceeds 25 MB limit.'));
      return;
    }
    if (!isAcceptedDocument(nextFile)) {
      setFile(null);
      setScanError(buildValidationError('Only PDF and Word (.docx) files are accepted.'));
      return;
    }
    setFile(nextFile);
    setScanError(null);
  };

  const handleScan = async () => {
    if (!file) {
      setScanError(buildValidationError('Please select a PDF or DOCX file.'));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setScanError(buildValidationError('File exceeds 25 MB limit.'));
      return;
    }
    if (!isAcceptedDocument(file)) {
      setScanError(buildValidationError('Only PDF and Word (.docx) files are accepted.'));
      return;
    }

    setScanError(null);
    setScanning(true);
    setElapsedSeconds(0);

    try {
      const response = plagiarismService.scanArchive
        ? await plagiarismService.scanArchive(file)
        : await plagiarismService.scanArchivedPdf(file);

      const payload = response?.data?.data || response?.data || response || null;
      if (!payload) throw new Error('Scan response did not include report data.');
      if (payload.semanticModel) setSemanticModel(payload.semanticModel);
      setReportData(payload);
    } catch (error) {
      setScanError(getInlineErrorMessage(error));
    } finally {
      setScanning(false);
    }
  };

  const handleBackToUpload = () => {
    setReportData(null);
    setScanning(false);
    setElapsedSeconds(0);
    setScanError(null);
  };

  if (reportData) {
    return (
      <PlagiarismReportPage
        file={file}
        reportData={reportData}
        fileName={file?.name || 'Submitted Document'}
        initialCanvasMode="document"
        onBack={handleBackToUpload}
        onReset={handleBackToUpload}
      />
    );
  }

  return (
    <DashboardLayout>
      {/* Two-column layout: hero + upload form */}
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* Left: hero + info */}
          <div className="flex flex-col gap-6">
            <ScanHero semanticModel={semanticModel} />

            {/* How it works card */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                How It Works
              </p>
              <ol className="space-y-3">
                {[
                  {
                    step: '01',
                    title: 'Upload Manuscript',
                    desc: 'Drop or select your PDF or Word (.docx) manuscript up to 25 MB.',
                  },
                  {
                    step: '02',
                    title: 'Dual-Engine Comparison',
                    desc: 'Runs Winnowing lexical fingerprinting and BAAI/bge-m3 dense semantic embeddings against the institutional archive.',
                  },
                  {
                    step: '03',
                    title: 'Review Originality Intelligence',
                    desc: 'Inspect Turnitin-style annotated highlights, source breakdown, and overall similarity index.',
                  },
                ].map(({ step, title, desc }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {step}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right: upload card */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border/70 bg-card p-6 shadow-xs">
              <h2 className="mb-1 text-base font-semibold text-foreground">Upload Document</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                PDF or Word (.docx, .doc) · Maximum {MAX_FILE_SIZE_MB} MB
              </p>

              <div className="space-y-4">
                <DropZone
                  file={file}
                  scanning={scanning}
                  errorMessage={dropZoneError}
                  onFileSelected={handleSelectFile}
                />

                {scanError && scanError.type !== 'validation' && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <p className="text-xs font-medium text-destructive leading-relaxed">
                      {scanError.message}
                    </p>
                  </div>
                )}

                <ScanButton
                  disabled={!canScan}
                  scanning={scanning}
                  elapsedSeconds={elapsedSeconds}
                  onClick={handleScan}
                />
              </div>
            </div>

            {/* Disclaimer note */}
            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Manuscript scans are verified against all approved institutional capstones. Uploads
                are processed in-memory and are not permanently archived until final defense
                sign-off.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

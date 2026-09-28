import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Info } from 'lucide-react';
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
  return hasExt && (hasMime || !type);
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
  const [howItWorksOpen, setHowItWorksOpen] = useState(true);

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
      {/* Responsive layout: hero + upload form */}
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:gap-8 items-start">
          {/* Top Left on Desktop / Step 1 on Mobile: Scan Hero */}
          <div className="order-1 lg:col-start-1 lg:row-start-1">
            <ScanHero semanticModel={semanticModel} />
          </div>

          {/* Top Right on Desktop / Step 2 on Mobile (Prioritized above fold): Upload Card */}
          <div className="order-2 lg:col-start-2 lg:row-start-1">
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
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                  >
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
          </div>

          {/* Bottom Left on Desktop / Step 3 on Mobile: Collapsible How It Works */}
          <div className="order-3 lg:col-start-1 lg:row-start-2">
            <div className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setHowItWorksOpen((prev) => !prev)}
                aria-expanded={howItWorksOpen}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    How It Works
                  </p>
                  <span className="text-[10px] text-muted-foreground font-medium rounded-full bg-muted px-2 py-0.5">
                    3 Steps
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span>{howItWorksOpen ? 'Hide guide' : 'Show guide'}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      howItWorksOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {howItWorksOpen && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                  <ol className="space-y-3 pt-2 border-t border-border/40">
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
              )}
            </div>
          </div>

          {/* Bottom Right on Desktop / Step 4 on Mobile: Disclaimer */}
          <div className="order-4 lg:col-start-2 lg:row-start-2">
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

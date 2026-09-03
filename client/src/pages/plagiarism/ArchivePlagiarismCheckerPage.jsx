import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DropZone from '@/components/plagiarism/DropZone';
import PlagiarismReportPage from '@/components/plagiarism/PlagiarismReportPage';
import ScanButton from '@/components/plagiarism/ScanButton';
import ScanHero from '@/components/plagiarism/ScanHero';
import { plagiarismService } from '@/services/plagiarismService';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_SIZE_MB = 25;
const DEFAULT_SEMANTIC_MODEL =
  import.meta.env.VITE_ARCHIVE_SEMANTIC_MODEL || 'nomic-embed-text-v2-moe:latest';

function buildValidationError(message) {
  return { type: 'validation', message };
}

function getInlineErrorMessage(error) {
  const status = Number(error?.response?.status);
  const message = String(error?.message || '').toLowerCase();
  const isClientTimeout = error?.code === 'ECONNABORTED' || message.includes('timeout');

  if (isClientTimeout) {
    return {
      type: 'server',
      message: 'Scan timed out. Large documents can take up to 60s. Please try again.',
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
    if (nextFile.type !== 'application/pdf') {
      setFile(null);
      setScanError(buildValidationError('Only PDF files are accepted.'));
      return;
    }
    setFile(nextFile);
    setScanError(null);
  };

  const handleScan = async () => {
    if (!file) {
      setScanError(buildValidationError('Please select a PDF file.'));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setScanError(buildValidationError('File exceeds 25 MB limit.'));
      return;
    }
    if (file.type !== 'application/pdf') {
      setScanError(buildValidationError('Only PDF files are accepted.'));
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
        reportData={reportData}
        fileName={file?.name || 'Submitted Document'}
        onBack={handleBackToUpload}
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
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                How it works
              </p>
              <ol className="space-y-3">
                {[
                  {
                    step: '01',
                    title: 'Upload PDF',
                    desc: 'Drop or select your capstone document (max 25 MB).',
                  },
                  {
                    step: '02',
                    title: 'Dual-Engine Scan',
                    desc: 'Lexical fingerprinting + semantic embedding comparison runs against the full archive.',
                  },
                  {
                    step: '03',
                    title: 'Review Results',
                    desc: 'View annotated highlights, source-by-source breakdown, and overall originality score.',
                  },
                ].map(({ step, title, desc }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right: upload card */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-1 text-base font-semibold text-foreground">Upload Document</h2>
              <p className="mb-5 text-xs text-muted-foreground">
                PDF only · max {MAX_FILE_SIZE_MB} MB
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
                    <p className="text-sm font-medium text-destructive">{scanError.message}</p>
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
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Uploads use <code className="font-mono text-foreground">multipart/form-data</code>{' '}
                with field name <code className="font-mono text-foreground">file</code>. Results are
                not stored and are computed on demand.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

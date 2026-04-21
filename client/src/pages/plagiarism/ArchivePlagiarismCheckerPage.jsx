import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
    return {
      type: 'server',
      message: 'Too many scans. Please wait before trying again.',
    };
  }

  if (status >= 500) {
    return {
      type: 'server',
      message: 'Scan service unavailable. Try again shortly.',
    };
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
      setElapsedSeconds((current) => current + 1);
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

      if (!payload) {
        throw new Error('Scan response did not include report data.');
      }

      if (payload.semanticModel) {
        setSemanticModel(payload.semanticModel);
      }

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
      <section className="archive-upload-shell mx-auto max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_30px_70px_-55px_rgba(13,27,42,0.75)] sm:p-7">
        <div className="space-y-6">
          <ScanHero semanticModel={semanticModel} />

          <DropZone
            file={file}
            scanning={scanning}
            errorMessage={dropZoneError}
            onFileSelected={handleSelectFile}
          />

          {selectedFileMeta && !dropZoneError ? (
            <p className="text-xs font-medium text-[var(--color-text-secondary)] [font-family:var(--font-body)]">
              Selected file: <span className="font-semibold">{selectedFileMeta.name}</span> (
              {selectedFileMeta.sizeLabel})
            </p>
          ) : null}

          {scanError && scanError.type !== 'validation' ? (
            <div className="rounded-lg border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,white)] p-3 [font-family:var(--font-body)]">
              <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
                <AlertTriangle className="h-4 w-4" />
                {scanError.message}
              </p>
            </div>
          ) : null}

          <ScanButton
            disabled={!canScan}
            scanning={scanning}
            elapsedSeconds={elapsedSeconds}
            onClick={handleScan}
          />

          <p className="text-xs text-[var(--color-text-secondary)] [font-family:var(--font-body)]">
            Upload uses multipart/form-data with field name{' '}
            <span className="font-semibold">file</span>, PDF only, max {MAX_FILE_SIZE_MB} MB.
          </p>
        </div>
      </section>
    </DashboardLayout>
  );
}

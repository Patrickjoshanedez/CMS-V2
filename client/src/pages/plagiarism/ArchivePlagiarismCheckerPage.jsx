import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DropZone from '@/components/plagiarism/DropZone';
import PlagiarismReportPage from '@/pages/submissions/PlagiarismReportPage';
import ScanButton from '@/components/plagiarism/ScanButton';
import ScanHero from '@/components/plagiarism/ScanHero';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { usePlagiarismScanStore } from '@/stores/plagiarismScanStore';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_SIZE_MB = 25;

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

export default function ArchivePlagiarismCheckerPage() {
  const {
    file,
    isScanning: scanning,
    scanError,
    reportData,
    elapsedSeconds,
    setFile,
    setScanError,
    startArchiveScan,
    resetScan,
  } = usePlagiarismScanStore();

  const [howItWorksOpen, setHowItWorksOpen] = useState(true);

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

    try {
      await startArchiveScan(file);
    } catch {
      // Error is caught, formatted, and stored in usePlagiarismScanStore
    }
  };

  const handleBackToUpload = () => {
    resetScan();
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
      <div className="mx-auto w-full max-w-5xl min-w-0">
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8">
          {/* Top Left on Desktop / Step 1 on Mobile: Scan Hero */}
          <div className="order-1 min-w-0 xl:col-start-1 xl:row-start-1">
            <ScanHero />
          </div>

          {/* Top Right on Desktop / Step 2 on Mobile (Prioritized above fold): Upload Card */}
          <div className="order-2 min-w-0 xl:col-start-2 xl:row-start-1">
            <Card className="min-w-0 rounded-xl p-6 shadow-xs">
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
                  <Alert
                    variant="destructive"
                    aria-live="assertive"
                    className="p-3 text-xs [&>svg~*]:pl-6 [&>svg]:left-3 [&>svg]:top-3"
                  >
                    <AlertDescription className="font-medium leading-relaxed">
                      {scanError.message}
                    </AlertDescription>
                  </Alert>
                )}

                <ScanButton
                  disabled={!canScan}
                  scanning={scanning}
                  elapsedSeconds={elapsedSeconds}
                  onClick={handleScan}
                />
              </div>
            </Card>
          </div>

          {/* Bottom Left on Desktop / Step 3 on Mobile: Collapsible How It Works */}
          <div className="order-3 min-w-0 xl:col-start-1 xl:row-start-2">
            <Card className="overflow-hidden rounded-xl shadow-xs">
              <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-between p-4 text-left sm:p-5"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        How It Works
                      </p>
                      <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                        3 Steps
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span>{howItWorksOpen ? 'Hide guide' : 'Show guide'}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          howItWorksOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                    <ol className="space-y-3 pt-2 border-t border-border/40">
                      {[
                        {
                          step: '01',
                          title: 'Upload Manuscript',
                          desc: 'Drop or select your PDF or Word (.docx) manuscript up to 25 MB.',
                        },
                        {
                          step: '02',
                          title: 'Compare with the Archive',
                          desc: 'The checker looks for matching text and similar passages in archived research.',
                        },
                        {
                          step: '03',
                          title: 'Review Matches and Sources',
                          desc: 'Read highlighted passages, check their sources, and review the similarity score.',
                        },
                      ].map(({ step, title, desc }) => (
                        <li key={step} className="flex items-start gap-3">
                          <Badge
                            variant="info"
                            className="h-6 w-6 shrink-0 justify-center rounded-full p-0 text-[11px] font-bold"
                          >
                            {step}
                          </Badge>
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-foreground">{title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>

          {/* Bottom Right on Desktop / Step 4 on Mobile: Disclaimer */}
          <div className="order-4 min-w-0 xl:col-start-2 xl:row-start-2">
            <Alert
              variant="info"
              className="p-3 text-[11px] [&>svg~*]:pl-5 [&>svg]:left-3 [&>svg]:top-3"
            >
              <AlertDescription className="leading-relaxed">
                Manuscript scans are verified against all approved institutional capstones. Uploads
                are processed in-memory and are not permanently archived until final defense
                sign-off.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

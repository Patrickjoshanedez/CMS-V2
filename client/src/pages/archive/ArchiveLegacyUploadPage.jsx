import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { TagInput } from '@/components/ui/TagInput';
import { useBulkUploadArchive } from '@/hooks/useProjects';
import { useAcademicYears } from '@/hooks/useAcademics';
import { documentService } from '@/services/authService';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';
import { Loader2, Upload, ArrowLeft, Info, Sparkles } from 'lucide-react';

const KEYWORD_SUGGESTIONS = [
  'IoT',
  'Internet of Things',
  'Machine Learning',
  'Deep Learning',
  'AI',
  'Artificial Intelligence',
  'Mobile Application',
  'Web Application',
  'Web Development',
  'Database',
  'Cloud Computing',
  'AWS',
  'Azure',
  'Blockchain',
  'Cybersecurity',
  'Network Security',
  'Data Analytics',
  'Big Data',
  'Data Science',
  'Computer Vision',
  'Image Processing',
  'Natural Language Processing',
  'NLP',
  'Chatbot',
  'Embedded Systems',
  'Arduino',
  'Raspberry Pi',
  'Microcontroller',
  'E-commerce',
  'E-learning',
  'Online Learning',
  'Healthcare',
  'Telemedicine',
  'Medical Informatics',
  'Agriculture',
  'Smart Farming',
  'Precision Agriculture',
  'Education Technology',
  'EdTech',
  'Social Media',
  'Automation',
  'Robotics',
  'Game Development',
  'Virtual Reality',
  'VR',
  'Augmented Reality',
  'AR',
  'Python',
  'JavaScript',
  'React',
  'Node.js',
  'Java',
  'PHP',
  'Laravel',
  'Android',
  'iOS',
  'Flutter',
  'React Native',
  'MySQL',
  'MongoDB',
  'PostgreSQL',
  'Firebase',
  'REST API',
  'GraphQL',
  'Microservices',
];

const INITIAL_FORM = { title: '', abstract: '', academicYear: '' };

function formatArchiveTypeLabel(archiveType) {
  if (!archiveType) return null;

  return archiveType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ArchiveLegacyUploadPage({
  pageTitle,
  pageDescription,
  documentLabel,
  infoText,
  successMessage,
  archiveType,
  backPath = '/reports',
}) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [file, setFile] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const { mutateAsync, isPending } = useBulkUploadArchive();
  const { data: academicYears = [], isLoading: yearsLoading } = useAcademicYears();
  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

  const archiveTypeLabel = useMemo(() => formatArchiveTypeLabel(archiveType), [archiveType]);
  const fileInputId = useMemo(
    () => `file-upload-${documentLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    [documentLabel],
  );

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const toAcademicYearRange = useCallback((publicationYear) => {
    if (!publicationYear || Number.isNaN(Number(publicationYear))) return '';
    const year = Number(publicationYear);
    return `${year}-${year + 1}`;
  }, []);

  /**
   * Extracts title, abstract, publication year, and keywords from a PDF file using the server API.
   */
  const handlePdfExtraction = useCallback(
    async (pdfFile) => {
      if (!pdfFile || pdfFile.type !== 'application/pdf') return;

      setIsExtracting(true);
      try {
        const response = await documentService.extractPdfMetadata(pdfFile);
        const {
          title,
          abstract,
          publicationYear,
          authors = [],
          keywords: extractedKeywords = [],
          confidence,
        } = response.data.data;

        // Only auto-fill if fields are empty or confidence is high
        if (title && (!form.title || confidence.title > 0.7)) {
          setForm((prev) => ({ ...prev, title }));
          toast.success('Title extracted from PDF');
        }
        if (abstract && (!form.abstract || confidence.abstract > 0.7)) {
          setForm((prev) => ({ ...prev, abstract }));
          toast.success('Abstract extracted from PDF');
        }

        const extractedAcademicYear = toAcademicYearRange(publicationYear);
        if (
          extractedAcademicYear &&
          (!form.academicYear || confidence.publicationYear > 0.7)
        ) {
          setForm((prev) => ({ ...prev, academicYear: extractedAcademicYear }));
          toast.success('Academic year inferred from PDF publication year');
        }

        if (Array.isArray(extractedKeywords) && extractedKeywords.length > 0 && keywords.length === 0) {
          setKeywords(extractedKeywords.slice(0, 10));
          toast.success('Keywords extracted from PDF');
        }

        if (Array.isArray(authors) && authors.length > 0) {
          toast.info(`Detected author(s): ${authors.slice(0, 3).join(', ')}`);
        }

        if (!title && !abstract) {
          toast.info('Could not extract title/abstract from this PDF format.');
        }
      } catch (err) {
        const apiMessage = err?.response?.data?.message;
        toast.error(apiMessage || 'Automatic PDF extraction failed. You can still fill the fields manually.');
        console.warn('PDF extraction failed:', err);
      } finally {
        setIsExtracting(false);
      }
    },
    [form.title, form.abstract, form.academicYear, keywords.length, toAcademicYearRange],
  );

  const handleFileChange = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0] || null;
      setFile(selectedFile);

      // Auto-extract metadata when PDF is selected and fields are empty
      if (selectedFile && (!form.title || !form.abstract)) {
        handlePdfExtraction(selectedFile);
      }
    },
    [form.title, form.abstract, handlePdfExtraction],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFile(null);
    setKeywords([]);

    const fileInput = document.getElementById(fileInputId);
    if (fileInput) fileInput.value = '';
  }, [fileInputId]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!form.title.trim() || !form.academicYear.trim() || !file) {
        toast.error('Title, Academic Year, and PDF file are required.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', form.title.trim());
      if (form.abstract.trim()) formData.append('abstract', form.abstract.trim());
      if (keywords.length > 0) formData.append('keywords', keywords.join(', '));
      formData.append('academicYear', form.academicYear.trim());

      try {
        await mutateAsync(formData);
        toast.success(successMessage);
        resetForm();
      } catch (err) {
        toast.error(err?.response?.data?.error?.message || err.message || 'Upload failed.');
      }
    },
    [file, form, keywords, mutateAsync, resetForm, successMessage],
  );

  if (user?.role !== ROLES.INSTRUCTOR) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertDescription>You do not have permission to view this page.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageDescription}</p>
          </div>
        </div>

        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {infoText}
            {archiveTypeLabel ? (
              <>
                {' '}
                <span className="font-medium">Archive category:</span> {archiveTypeLabel}.
              </>
            ) : null}
          </AlertDescription>
        </Alert>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>{documentLabel} Details</CardTitle>
              <CardDescription>
                Provide metadata and upload the PDF file to add this record to the archive.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder={`${documentLabel} title`}
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="abstract">Abstract</Label>
                <Textarea
                  id="abstract"
                  name="abstract"
                  placeholder="Brief description (optional)"
                  rows={4}
                  value={form.abstract}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="keywords">Keywords</Label>
                <TagInput
                  value={keywords}
                  onChange={setKeywords}
                  suggestions={KEYWORD_SUGGESTIONS}
                  placeholder="Type to search keywords..."
                  maxTags={10}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <select
                  id="academicYear"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  required
                  disabled={yearsLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select academic year</option>
                  {academicYears.length === 0 && (
                    <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                  )}
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor={fileInputId} className="flex items-center gap-2">
                  PDF File *
                  {isExtracting && (
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      <Sparkles className="mr-1 h-3 w-3 animate-pulse" />
                      Extracting metadata...
                    </span>
                  )}
                </Label>
                <Input
                  id={fileInputId}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Title, abstract, publication year, and keywords will be auto-extracted when you select a PDF.
                </p>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isPending ? 'Uploading…' : `Upload ${documentLabel}`}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}

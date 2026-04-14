import { useState, useCallback } from 'react';
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
import { TagInput } from '@/components/ui/TagInput';
import { Alert, AlertDescription } from '@/components/ui/Alert';
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

const INITIAL_FORM = {
  title: '',
  abstract: '',
  authors: '',
  publicationYear: '',
  doi: '',
  publicationVenue: '',
  academicYear: '',
};

export default function ExistingCapstoneUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [keywords, setKeywords] = useState([]);
  const [academicPaperFile, setAcademicPaperFile] = useState(null);
  const [academicJournalFile, setAcademicJournalFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [similarityReport, setSimilarityReport] = useState(null);
  const [extractionMetadata, setExtractionMetadata] = useState(null);

  const { mutateAsync, isPending } = useBulkUploadArchive();
  const { data: academicYears = [], isLoading: yearsLoading } = useAcademicYears();

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;
  const titleConflicts = similarityReport?.titleConflicts || [];
  const abstractConflicts = similarityReport?.abstractConflicts || [];
  const hasSimilarityConflicts = titleConflicts.length > 0 || abstractConflicts.length > 0;

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const normalizeAuthors = useCallback((value) => {
    if (!value) return [];

    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20);
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
    async (file) => {
      if (!file || file.type !== 'application/pdf') return;

      setIsExtracting(true);
      try {
        const response = await documentService.extractPdfMetadata(file);
        const {
          title,
          abstract,
          publicationYear,
          authors = [],
          keywords: extractedKeywords = [],
          doi = '',
          publicationVenue = '',
          confidence,
          extractionProvider,
        } = response.data.data;

        const extractedAcademicYear = toAcademicYearRange(publicationYear);

        // Store extraction metadata for display
        setExtractionMetadata({
          confidence,
          provider: extractionProvider,
          timestamp: new Date().toISOString(),
        });

        setForm((prev) => ({
          ...prev,
          title: title?.trim() || prev.title,
          abstract: abstract?.trim() || prev.abstract,
          authors: Array.isArray(authors) && authors.length > 0 ? authors.join(', ') : prev.authors,
          publicationYear: publicationYear ? String(publicationYear) : prev.publicationYear,
          doi: doi?.trim() || prev.doi,
          publicationVenue: publicationVenue?.trim() || prev.publicationVenue,
          academicYear: extractedAcademicYear || prev.academicYear,
        }));

        if (
          title ||
          abstract ||
          publicationYear ||
          (Array.isArray(authors) && authors.length > 0)
        ) {
          toast.success('PDF metadata auto-filled in the form');
        }

        if (
          Array.isArray(extractedKeywords) &&
          extractedKeywords.length > 0 &&
          keywords.length === 0
        ) {
          setKeywords(extractedKeywords.slice(0, 10));
          toast.success('Keywords extracted from PDF');
        }

        if (
          !title &&
          !abstract &&
          !publicationYear &&
          (!Array.isArray(authors) || authors.length === 0)
        ) {
          toast.info('Could not extract metadata from this PDF format.');
        }

        return {
          title: title?.trim() || '',
          abstract: abstract?.trim() || '',
          publicationYear: publicationYear || null,
          authors,
          keywords: extractedKeywords,
          doi: doi?.trim() || '',
          publicationVenue: publicationVenue?.trim() || '',
        };
      } catch (err) {
        const apiMessage = err?.response?.data?.message;
        const isTimeout =
          err?.code === 'ECONNABORTED' ||
          String(err?.message || '')
            .toLowerCase()
            .includes('timeout');
        const isNetwork = !err?.response;

        if (isTimeout) {
          toast.error('PDF extraction timed out. Click Rescan or try a smaller PDF.');
        } else if (isNetwork) {
          toast.error(
            'Could not reach the extraction endpoint. Check backend/proxy, then click Rescan.',
          );
        } else {
          toast.error(
            apiMessage ||
              'Automatic PDF extraction failed. You can still fill the fields manually.',
          );
        }
        console.warn('PDF extraction failed:', err);
        return {
          title: '',
          abstract: '',
          publicationYear: null,
          authors: [],
          keywords: [],
          doi: '',
          publicationVenue: '',
        };
      } finally {
        setIsExtracting(false);
      }
    },
    [toAcademicYearRange, keywords.length],
  );

  /**
   * Handles academic paper file selection and triggers extraction.
   */
  const handleAcademicPaperChange = useCallback(
    (e) => {
      const file = e.target.files?.[0] || null;
      setAcademicPaperFile(file);

      // Always auto-extract metadata as soon as an academic paper PDF is selected.
      if (file) {
        handlePdfExtraction(file);
      }
    },
    [handlePdfExtraction],
  );

  const handleRescanMetadata = useCallback(async () => {
    if (!academicPaperFile) {
      toast.error('Please select an Academic Paper PDF first.');
      return;
    }

    await handlePdfExtraction(academicPaperFile);
  }, [academicPaperFile, handlePdfExtraction]);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setKeywords([]);
    setAcademicPaperFile(null);
    setAcademicJournalFile(null);
    setExtractionMetadata(null);

    const academicInput = document.getElementById('academic-paper-file');
    const journalInput = document.getElementById('academic-journal-file');
    if (academicInput) academicInput.value = '';
    if (journalInput) journalInput.value = '';
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      let resolvedTitle = form.title.trim();
      let resolvedAbstract = form.abstract.trim();
      const normalizedAuthors = normalizeAuthors(form.authors);
      const normalizedDoi = form.doi.trim();
      const normalizedPublicationVenue = form.publicationVenue.trim();
      const publicationYearValue = form.publicationYear.trim();
      const normalizedPublicationYear = publicationYearValue
        ? Number(publicationYearValue)
        : undefined;

      // Reliability fallback: attempt extraction again on submit when fields are missing.
      if ((!resolvedTitle || !resolvedAbstract) && academicPaperFile?.type === 'application/pdf') {
        const extracted = await handlePdfExtraction(academicPaperFile);
        if (!resolvedTitle && extracted?.title) {
          resolvedTitle = extracted.title;
        }
        if (!resolvedAbstract && extracted?.abstract) {
          resolvedAbstract = extracted.abstract;
        }

        if (resolvedTitle || resolvedAbstract) {
          setForm((prev) => ({
            ...prev,
            title: resolvedTitle || prev.title,
            abstract: resolvedAbstract || prev.abstract,
          }));
        }
      }

      if (!resolvedTitle || !form.academicYear.trim()) {
        toast.error('Title and Academic Year are required.');
        return;
      }

      if (!academicPaperFile && !academicJournalFile) {
        toast.error('Both Academic Paper PDF and Academic Journal PDF are required.');
        return;
      }

      if (!academicPaperFile) {
        toast.error('Academic Paper PDF is required.');
        return;
      }

      if (!academicJournalFile) {
        toast.error('Academic Journal PDF is required.');
        return;
      }

      try {
        const response = await mutateAsync({
          title: resolvedTitle,
          abstract: resolvedAbstract,
          keywords: keywords.join(', '),
          authors: normalizedAuthors,
          publicationYear: Number.isFinite(normalizedPublicationYear)
            ? normalizedPublicationYear
            : undefined,
          doi: normalizedDoi,
          publicationVenue: normalizedPublicationVenue,
          academicYear: form.academicYear.trim(),
          academicPaperFile,
          academicJournalFile,
        });

        const similarity = response?.data?.similarity || null;
        setSimilarityReport(similarity);

        if (similarity?.warning) {
          toast.warning(similarity.warning);
        }

        toast.success('Archived capstone uploaded successfully.');
        resetForm();
      } catch (err) {
        toast.error(err?.response?.data?.error?.message || err.message || 'Upload failed.');
      }
    },
    [
      academicJournalFile,
      academicPaperFile,
      form,
      handlePdfExtraction,
      keywords,
      mutateAsync,
      normalizeAuthors,
      resetForm,
    ],
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Upload Archived Capstone</h1>
            <p className="text-muted-foreground">
              Attach both required final files to archive one capstone record.
            </p>
          </div>
        </div>

        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Each archived capstone must include exactly one Academic Paper file and one Academic
            Journal file in the same upload.
          </AlertDescription>
        </Alert>

        {hasSimilarityConflicts && (
          <Alert variant="destructive">
            <AlertDescription className="space-y-2">
              <p className="font-medium">Similarity warnings were detected for this upload.</p>

              {titleConflicts.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Title conflicts</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {titleConflicts.slice(0, 5).map((conflict) => (
                      <li key={`title-${conflict.projectId}`}>
                        {conflict.title} ({conflict.similarityPct}% similar)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {abstractConflicts.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Abstract conflicts</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {abstractConflicts.slice(0, 5).map((conflict) => (
                      <li key={`abstract-${conflict.projectId}`}>
                        {conflict.title} ({conflict.similarityPct}% similar)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Capstone Metadata</CardTitle>
              <CardDescription>
                Provide project details and upload both final files to archive this capstone.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Capstone title"
                  value={form.title}
                  onChange={handleChange}
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
                <Label htmlFor="authors">Author(s)</Label>
                <Textarea
                  id="authors"
                  name="authors"
                  placeholder="Author names (comma or newline separated)"
                  rows={2}
                  value={form.authors}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="publicationYear">Publication Year</Label>
                  <Input
                    id="publicationYear"
                    name="publicationYear"
                    type="number"
                    min="1900"
                    max="2100"
                    placeholder="e.g. 2025"
                    value={form.publicationYear}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="doi">DOI</Label>
                  <Input
                    id="doi"
                    name="doi"
                    placeholder="e.g. 10.1000/xyz123"
                    value={form.doi}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="publicationVenue">Publication Venue</Label>
                <Input
                  id="publicationVenue"
                  name="publicationVenue"
                  placeholder="Journal or conference name"
                  value={form.publicationVenue}
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
                <Label htmlFor="academic-paper-file" className="flex items-center gap-2">
                  Academic Paper PDF *
                  {isExtracting && (
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      <Sparkles className="mr-1 h-3 w-3 animate-pulse" />
                      Extracting metadata...
                    </span>
                  )}
                </Label>
                <Input
                  id="academic-paper-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleAcademicPaperChange}
                  required
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Title, abstract, authors, publication year, DOI, publication venue, and keywords
                    will be auto-extracted when you select a PDF.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRescanMetadata}
                    disabled={!academicPaperFile || isExtracting}
                    className="shrink-0"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Rescanning...
                      </>
                    ) : (
                      'Rescan'
                    )}
                  </Button>
                </div>

                {extractionMetadata && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-4 w-4 rounded-full bg-green-500 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-green-900">Extraction successful</div>
                        <div className="text-xs text-green-800 space-y-0.5">
                          {extractionMetadata.confidence?.title > 0 && (
                            <div>
                              ✓ Title extracted (
                              {Math.round(extractionMetadata.confidence.title * 100)}%)
                            </div>
                          )}
                          {extractionMetadata.confidence?.abstract > 0 && (
                            <div>
                              ✓ Abstract extracted (
                              {Math.round(extractionMetadata.confidence.abstract * 100)}%)
                            </div>
                          )}
                          {extractionMetadata.confidence?.authors > 0 && (
                            <div>
                              ✓ Authors extracted (
                              {Math.round(extractionMetadata.confidence.authors * 100)}%)
                            </div>
                          )}
                          {extractionMetadata.confidence?.publicationYear > 0 && (
                            <div>
                              ✓ Publication year extracted (
                              {Math.round(extractionMetadata.confidence.publicationYear * 100)}%)
                            </div>
                          )}
                          {extractionMetadata.confidence?.keywords > 0 && (
                            <div>
                              ✓ Keywords extracted (
                              {Math.round(extractionMetadata.confidence.keywords * 100)}%)
                            </div>
                          )}
                          {extractionMetadata.confidence?.doi > 0 && (
                            <div>
                              ✓ DOI extracted ({Math.round(extractionMetadata.confidence.doi * 100)}
                              %)
                            </div>
                          )}
                          {extractionMetadata.confidence?.publicationVenue > 0 && (
                            <div>
                              ✓ Publication venue extracted (
                              {Math.round(extractionMetadata.confidence.publicationVenue * 100)}%)
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-green-700 pt-1">
                          Provider: {extractionMetadata.provider}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="academic-journal-file">Academic Journal PDF *</Label>
                <Input
                  id="academic-journal-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAcademicJournalFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isPending ? 'Uploading...' : 'Upload Archived Capstone'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}

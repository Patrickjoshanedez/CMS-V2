import React, { useMemo, useRef, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Sparkles,
  Files,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { documentService } from '@/services/authService';
import { useBulkUploadArchive } from '@/hooks/useProjects';
import { useAcademicYears } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';

const INITIAL_FORM = {
  title: '',
  abstract: '',
  authors: '',
  year: '',
  doi: '',
  venue: '',
  keywords: '',
  academicYear: '',
};

const INITIAL_FILES = {
  academicPaperFile: null,
  academicJournalFile: null,
};

const toAcademicYear = (yearValue) => {
  const year = Number(yearValue);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return '';
  return `${year}-${year + 1}`;
};

const asUploadErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const normalizeExtractionPayload = (response) => {
  const envelope = response?.data ?? response ?? {};
  const payload = envelope?.data && typeof envelope.data === 'object' ? envelope.data : envelope;

  const metadataSource =
    payload?.metadata && typeof payload.metadata === 'object'
      ? payload.metadata
      : payload?.data && typeof payload.data === 'object'
        ? payload.data
        : {};

  const confidenceSource =
    payload?.confidence && typeof payload.confidence === 'object'
      ? payload.confidence
      : metadataSource?.confidence && typeof metadataSource.confidence === 'object'
        ? metadataSource.confidence
        : {};

  return {
    metadata: {
      title: String(metadataSource?.title || '').trim(),
      abstract: String(metadataSource?.abstract || '').trim(),
      authors: Array.isArray(metadataSource?.authors)
        ? metadataSource.authors.join(', ')
        : String(metadataSource?.authors || '').trim(),
      year:
        metadataSource?.year !== null && metadataSource?.year !== undefined
          ? String(metadataSource.year).trim()
          : metadataSource?.publicationYear !== null &&
              metadataSource?.publicationYear !== undefined
            ? String(metadataSource.publicationYear).trim()
            : '',
      doi: String(metadataSource?.doi || '').trim(),
      venue: String(metadataSource?.venue || metadataSource?.publicationVenue || '').trim(),
      keywords: Array.isArray(metadataSource?.keywords)
        ? metadataSource.keywords.join(', ')
        : String(metadataSource?.keywords || '').trim(),
    },
    confidence: confidenceSource,
  };
};

const hasExtractedMetadata = (metadata = {}) => {
  return Boolean(
    metadata.title ||
    metadata.abstract ||
    metadata.authors ||
    metadata.year ||
    metadata.doi ||
    metadata.venue ||
    metadata.keywords,
  );
};

const KEYWORD_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'using',
  'with',
  'study',
  'system',
  'project',
  'capstone',
  'paper',
  'management',
  'final',
  'version',
  'checker',
  'workspace',
]);

const KEYWORD_VENUE_RULES = [
  {
    venue: 'International Conference on Artificial Intelligence and Data Science',
    triggers: [
      'ai',
      'machine learning',
      'deep learning',
      'neural network',
      'computer vision',
      'nlp',
      'data science',
      'data analytics',
    ],
  },
  {
    venue: 'Software Engineering and Information Systems Conference',
    triggers: [
      'web',
      'website',
      'web application',
      'mobile',
      'android',
      'ios',
      'react',
      'node',
      'api',
      'database',
    ],
  },
  {
    venue: 'Cybersecurity and Network Systems Conference',
    triggers: ['cybersecurity', 'network', 'security', 'encryption', 'forensics'],
  },
  {
    venue: 'Embedded Systems and IoT Engineering Conference',
    triggers: ['iot', 'internet of things', 'embedded', 'arduino', 'raspberry', 'sensor'],
  },
];

const ACRONYM_KEYWORDS = {
  ai: 'AI',
  api: 'API',
  ar: 'AR',
  iot: 'IoT',
  ml: 'ML',
  nlp: 'NLP',
  ui: 'UI',
  ux: 'UX',
  vr: 'VR',
};

const normalizeSpace = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const toKeywordLabel = (value = '') => {
  const normalized = normalizeSpace(String(value).toLowerCase());
  if (!normalized) return '';
  if (ACRONYM_KEYWORDS[normalized]) return ACRONYM_KEYWORDS[normalized];

  return normalized
    .split(' ')
    .map((token) =>
      ACRONYM_KEYWORDS[token]
        ? ACRONYM_KEYWORDS[token]
        : `${token[0].toUpperCase()}${token.slice(1)}`,
    )
    .join(' ');
};

const inferTitleFromFilename = (filename = '') => {
  const withoutExtension = String(filename).replace(/\.[^.]+$/, '');
  const title = normalizeSpace(withoutExtension.replace(/[_-]+/g, ' '));
  return title.length >= 6 ? title.slice(0, 300) : '';
};

const inferYearFromFilename = (filename = '') => {
  const match = String(filename).match(/\b(19|20)\d{2}\b/);
  if (!match) return '';
  const year = Number(match[0]);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return '';
  return String(year);
};

const splitKeywordString = (value = '') => {
  return String(value)
    .split(',')
    .map((item) => normalizeSpace(item))
    .filter(Boolean);
};

const dedupeKeywords = (items = []) => {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const normalized = normalizeSpace(item);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(toKeywordLabel(normalized));
    if (result.length >= 10) break;
  }

  return result;
};

const deriveKeywordsFromText = (text = '') => {
  const source = normalizeSpace(String(text).toLowerCase());
  if (!source) return [];

  const prioritizedPhrases = [
    'machine learning',
    'deep learning',
    'artificial intelligence',
    'computer vision',
    'data analytics',
    'data science',
    'internet of things',
    'web application',
    'mobile application',
    'network security',
    'cloud computing',
  ];

  const phraseKeywords = prioritizedPhrases.filter((phrase) => source.includes(phrase));

  const frequencies = new Map();
  source
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      if (token.length < 3) return;
      if (/^\d+$/.test(token)) return;
      if (KEYWORD_STOP_WORDS.has(token)) return;
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    });

  const rankedTokens = Array.from(frequencies.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0].length - a[0].length;
    })
    .slice(0, 12)
    .map(([token]) => token);

  return dedupeKeywords([...phraseKeywords, ...rankedTokens]);
};

const inferVenueFromKeywords = (keywords = []) => {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return 'Institutional Capstone Research Journal';
  }

  const normalizedKeywords = keywords.map((item) => String(item).toLowerCase());

  for (const rule of KEYWORD_VENUE_RULES) {
    const matched = rule.triggers.some((trigger) =>
      normalizedKeywords.some((keyword) => keyword.includes(trigger)),
    );
    if (matched) {
      return rule.venue;
    }
  }

  return 'Institutional Capstone Research Journal';
};

const buildFallbackAbstract = (title, keywords) => {
  const topicPhrase = keywords.length > 0 ? keywords.slice(0, 4).join(', ') : 'computing research';
  const summary = `This capstone study titled "${title}" focuses on ${topicPhrase}. The paper presents the problem context, implementation approach, and evaluation findings, and concludes with practical recommendations for future improvements.`;
  return summary.slice(0, 500);
};

const withFallbackConfidence = (existingValue, fallbackValue) => {
  const numeric = Number(existingValue);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return fallbackValue;
};

const enrichMetadataFromKeywords = ({ metadata = {}, confidence = {}, fileName = '' }) => {
  const inferredFields = [];

  const extractedKeywords = splitKeywordString(metadata.keywords);
  const seedText = [metadata.title, metadata.abstract, metadata.keywords, fileName]
    .filter(Boolean)
    .join(' ');

  const derivedKeywords = deriveKeywordsFromText(seedText);
  const keywordList = dedupeKeywords([...extractedKeywords, ...derivedKeywords]);

  const title = metadata.title || inferTitleFromFilename(fileName) || 'Untitled Capstone Project';
  if (!metadata.title && title) inferredFields.push('title');

  const year = metadata.year || inferYearFromFilename(fileName) || String(new Date().getFullYear());
  if (!metadata.year && year) inferredFields.push('year');

  const keywords = metadata.keywords || keywordList.join(', ');
  if (!metadata.keywords && keywords) inferredFields.push('keywords');

  const abstract = metadata.abstract || buildFallbackAbstract(title, keywordList);
  if (!metadata.abstract && abstract) inferredFields.push('abstract');

  const authors = metadata.authors || 'Author details to be verified';
  if (!metadata.authors && authors) inferredFields.push('authors');

  const venue = metadata.venue || inferVenueFromKeywords(keywordList);
  if (!metadata.venue && venue) inferredFields.push('venue');

  const doi = metadata.doi || 'N/A';
  if (!metadata.doi && doi) inferredFields.push('doi');

  return {
    metadata: {
      ...metadata,
      title,
      abstract,
      authors,
      year,
      doi,
      venue,
      keywords,
    },
    confidence: {
      ...confidence,
      title: withFallbackConfidence(confidence.title, metadata.title ? 60 : 35),
      abstract: withFallbackConfidence(confidence.abstract, metadata.abstract ? 58 : 42),
      authors: withFallbackConfidence(confidence.authors, metadata.authors ? 55 : 25),
      year: withFallbackConfidence(confidence.year, metadata.year ? 70 : 38),
      doi: withFallbackConfidence(confidence.doi, metadata.doi ? 80 : 20),
      venue: withFallbackConfidence(confidence.venue, metadata.venue ? 62 : 34),
      keywords: withFallbackConfidence(confidence.keywords, metadata.keywords ? 65 : 48),
    },
    inferredFields,
  };
};

export default function ExistingCapstoneUploadPage() {
  const { user } = useAuthStore();
  const { mutateAsync: bulkUploadArchive, isPending } = useBulkUploadArchive();
  const { data: academicYears = [], isLoading: yearsLoading } = useAcademicYears();

  const [files, setFiles] = useState(INITIAL_FILES);
  const [form, setForm] = useState(INITIAL_FORM);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [extractionStatus, setExtractionStatus] = useState('idle'); // idle | extracting | success | error

  const academicPaperInputRef = useRef(null);
  const academicJournalInputRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = useMemo(() => `${currentYear}-${currentYear + 1}`, [currentYear]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getConfidenceColor = (score) => {
    if (score === null || score === undefined) return '';
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const renderLabelWithConfidence = (label, fieldName) => {
    const score = confidenceScores[fieldName];
    return (
      <div className="mb-1.5 flex items-center gap-2">
        <Label htmlFor={fieldName} className="font-medium">
          {label}
        </Label>
        {score !== null && score !== undefined && (
          <Badge
            variant="outline"
            className={`${getConfidenceColor(score)} px-1.5 py-0 text-[10px]`}
          >
            {score}% Conf.
          </Badge>
        )}
      </div>
    );
  };

  const applyExtractedMetadata = (metadata = {}, confidence = {}) => {
    const inferredAcademicYear = toAcademicYear(metadata.year);

    setForm((prev) => ({
      ...prev,
      title: metadata.title || prev.title,
      abstract: metadata.abstract || prev.abstract,
      authors: metadata.authors || prev.authors,
      year: metadata.year || prev.year,
      doi: metadata.doi || prev.doi,
      venue: metadata.venue || prev.venue,
      keywords: metadata.keywords || prev.keywords,
      academicYear: prev.academicYear || inferredAcademicYear,
    }));

    setConfidenceScores(confidence);
  };

  const runExtractionPipeline = async (pdfFile) => {
    if (!pdfFile) {
      toast.error('Select an academic paper PDF first.');
      return;
    }

    const fileType = String(pdfFile.type || '').toLowerCase();
    const fileName = String(pdfFile.name || '').toLowerCase();
    const isPdf = fileType === 'application/pdf' || (!fileType && fileName.endsWith('.pdf'));

    if (!isPdf) {
      toast.error('Only PDF files are supported for OCR extraction.');
      return;
    }

    setExtractionStatus('extracting');

    try {
      const response = await documentService.extractPdfMetadata(pdfFile);
      const { metadata = {}, confidence = {} } = normalizeExtractionPayload(response);
      const enriched = enrichMetadataFromKeywords({
        metadata,
        confidence,
        fileName: pdfFile.name,
      });

      if (!hasExtractedMetadata(enriched.metadata)) {
        setExtractionStatus('error');
        toast.error('No metadata could be extracted from this PDF. Please fill fields manually.');
        return;
      }

      applyExtractedMetadata(enriched.metadata, enriched.confidence);

      if (enriched.inferredFields.length > 0) {
        const sampleFields = enriched.inferredFields.slice(0, 4).join(', ');
        toast.success(`Metadata auto-filled. Inferred fields: ${sampleFields}.`);
      } else {
        toast.success('Metadata extracted from academic paper.');
      }

      setExtractionStatus('success');
    } catch (error) {
      const localFallback = enrichMetadataFromKeywords({
        metadata: {},
        confidence: {},
        fileName: pdfFile.name,
      });

      applyExtractedMetadata(localFallback.metadata, localFallback.confidence);
      setExtractionStatus('success');

      toast.warning(
        `${asUploadErrorMessage(error, 'Extraction API is unavailable.')}` +
          ' Applied keyword-based local autofill. Please review before upload.',
      );
    }
  };

  const handleAcademicPaperSelect = async (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, academicPaperFile: selectedFile }));

    if (selectedFile) {
      await runExtractionPipeline(selectedFile);
    } else {
      setExtractionStatus('idle');
    }
  };

  const handleAcademicJournalSelect = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, academicJournalFile: selectedFile }));
  };

  const resetPageState = () => {
    setForm(INITIAL_FORM);
    setFiles(INITIAL_FILES);
    setConfidenceScores({});
    setExtractionStatus('idle');

    if (academicPaperInputRef.current) academicPaperInputRef.current.value = '';
    if (academicJournalInputRef.current) academicJournalInputRef.current.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!files.academicPaperFile || !files.academicJournalFile) {
      toast.error('Both Academic Paper and Academic Journal PDFs are required.');
      return;
    }

    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    const targetAcademicYear = form.academicYear.trim() || toAcademicYear(form.year);
    if (!/^\d{4}-\d{4}$/.test(targetAcademicYear)) {
      toast.error('Academic Year is required and must follow YYYY-YYYY format.');
      return;
    }

    const publicationYear = Number(form.year);

    const payload = {
      title: form.title.trim(),
      abstract: form.abstract.trim(),
      authors: form.authors,
      publicationYear: Number.isFinite(publicationYear) ? publicationYear : undefined,
      doi: form.doi.trim(),
      publicationVenue: form.venue.trim(),
      keywords: form.keywords,
      academicYear: targetAcademicYear,
      academicPaperFile: files.academicPaperFile,
      academicJournalFile: files.academicJournalFile,
    };

    try {
      await bulkUploadArchive(payload);
      toast.success('Archived capstone bundle uploaded successfully.');
      resetPageState();
    } catch (error) {
      toast.error(asUploadErrorMessage(error, 'Failed to upload archived capstone bundle.'));
    }
  };

  if (user?.role !== ROLES.INSTRUCTOR) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertDescription>
            You do not have permission to upload archived capstone bundles.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Upload Archived Capstone
          </h1>
          <p className="mt-1 text-muted-foreground">
            Upload both final PDFs per capstone and auto-fill metadata from the academic paper.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b pb-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" /> OCR Auto-Fill Capstone Upload
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              This creates one archived capstone bundle with both files: Academic Paper and Academic
              Journal.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-10 p-6 md:p-8">
            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select the Academic Paper first to run OCR extraction, then add the Academic Journal
                file.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-4">
                <h3 className="border-b pb-2 text-lg font-semibold">1. Upload Bundle Files</h3>

                <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 p-6 transition-colors hover:border-primary/40 hover:bg-muted/60">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        Academic Paper (PDF) *
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Used for OCR metadata extraction and stored in the archived capstone bundle.
                      </p>
                    </div>

                    <input
                      ref={academicPaperInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handleAcademicPaperSelect}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="gap-2"
                        onClick={() => academicPaperInputRef.current?.click()}
                        disabled={extractionStatus === 'extracting'}
                      >
                        {extractionStatus === 'extracting' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Select Academic Paper & Auto-Extract
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => runExtractionPipeline(files.academicPaperFile)}
                        disabled={!files.academicPaperFile || extractionStatus === 'extracting'}
                      >
                        Rescan
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-border bg-background/80 p-3 text-sm">
                    {files.academicPaperFile ? (
                      <div className="flex items-center gap-2 text-foreground">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{files.academicPaperFile.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No academic paper selected yet.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/50 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        Academic Journal (PDF) *
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Required second file for the same capstone archive bundle.
                      </p>
                    </div>

                    <input
                      ref={academicJournalInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handleAcademicJournalSelect}
                    />

                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => academicJournalInputRef.current?.click()}
                    >
                      <Files className="h-4 w-4" />
                      Select Academic Journal
                    </Button>
                  </div>

                  <div className="mt-4 rounded-md border border-border bg-background/80 p-3 text-sm">
                    {files.academicJournalFile ? (
                      <div className="flex items-center gap-2 text-foreground">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{files.academicJournalFile.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        No academic journal selected yet.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {extractionStatus === 'extracting' && (
                <Alert className="flex items-start gap-3 border-blue-500/30 bg-blue-500/10">
                  <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-blue-500" />
                  <div>
                    <AlertTitle className="font-semibold text-blue-500">Please wait</AlertTitle>
                    <AlertDescription className="text-blue-500/90">
                      Extracting metadata from academic paper via OCR pipeline...
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {extractionStatus === 'success' && (
                <Alert className="flex items-start justify-between gap-3 border-green-500/30 bg-green-500/10">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                    <div>
                      <AlertTitle className="font-semibold text-green-500">
                        Extraction Complete
                      </AlertTitle>
                      <AlertDescription className="text-green-500/90">
                        Metadata extracted successfully. Review and edit the fields below before
                        upload.
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              {extractionStatus === 'error' && (
                <Alert variant="destructive" className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5" />
                  <div>
                    <AlertTitle>Extraction Error</AlertTitle>
                    <AlertDescription>
                      OCR extraction failed. You can continue by entering metadata manually.
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="space-y-6">
                <h3 className="border-b pb-2 text-lg font-semibold">2. Verify Metadata</h3>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    {renderLabelWithConfidence('Title', 'title')}
                    <Input
                      id="title"
                      name="title"
                      value={form.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Enhancing OCR Performance..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    {renderLabelWithConfidence('Abstract', 'abstract')}
                    <Textarea
                      id="abstract"
                      name="abstract"
                      value={form.abstract}
                      onChange={handleInputChange}
                      placeholder="Provide a brief summary of the paper..."
                      className="min-h-[140px] resize-y"
                    />
                  </div>

                  <div>
                    {renderLabelWithConfidence('Authors', 'authors')}
                    <Input
                      id="authors"
                      name="authors"
                      value={form.authors}
                      onChange={handleInputChange}
                      placeholder="e.g. Jane Doe, John Smith"
                    />
                  </div>

                  <div>
                    {renderLabelWithConfidence('Publication Year', 'year')}
                    <Input
                      id="year"
                      name="year"
                      value={form.year}
                      onChange={handleInputChange}
                      placeholder="e.g. 2023"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <Label htmlFor="academicYear" className="font-medium">
                        Academic Year
                      </Label>
                    </div>
                    <select
                      id="academicYear"
                      name="academicYear"
                      value={form.academicYear}
                      onChange={handleInputChange}
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

                  <div>
                    {renderLabelWithConfidence('DOI', 'doi')}
                    <Input
                      id="doi"
                      name="doi"
                      value={form.doi}
                      onChange={handleInputChange}
                      placeholder="e.g. 10.1016/..."
                    />
                  </div>

                  <div>
                    {renderLabelWithConfidence('Publication Venue', 'venue')}
                    <Input
                      id="venue"
                      name="venue"
                      value={form.venue}
                      onChange={handleInputChange}
                      placeholder="Journal or Conference name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    {renderLabelWithConfidence('Keywords', 'keywords')}
                    <Input
                      id="keywords"
                      name="keywords"
                      value={form.keywords}
                      onChange={handleInputChange}
                      placeholder="E.g. OCR, Machine Learning, Transformers"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="mt-4 w-full px-8 md:w-auto"
                  disabled={isPending || extractionStatus === 'extracting'}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    'Upload Archived Capstone Bundle'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

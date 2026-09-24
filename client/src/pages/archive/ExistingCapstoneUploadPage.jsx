import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  MessageSquarePlus,
  FileText,
  Upload,
  Sparkles,
  Files,
  Info,
  ArrowLeft,
  Archive,
  ShieldCheck,
  ShieldAlert,
  Search,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { metadataService } from '@/services/metadataService';
import { plagiarismService } from '@/services/plagiarismService';
import { getSocket } from '@/services/socket';
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

const METADATA_FIELD_NAMES = ['title', 'abstract', 'authors', 'year', 'doi', 'venue', 'keywords'];

const METADATA_FIELD_LABELS = {
  title: 'Title',
  abstract: 'Abstract',
  authors: 'Authors',
  year: 'Publication Year',
  doi: 'DOI',
  venue: 'Publication Venue',
  keywords: 'Keywords',
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
  const envelope = response?.data ?? response?.payload ?? response ?? {};
  const payload =
    envelope?.metadata && typeof envelope.metadata === 'object'
      ? envelope
      : envelope?.payload && typeof envelope.payload === 'object'
        ? envelope.payload
        : envelope?.data && typeof envelope.data === 'object'
          ? envelope.data
          : envelope;

  const metadataSource =
    payload?.metadata && typeof payload.metadata === 'object'
      ? payload.metadata
      : payload?.payload && typeof payload.payload === 'object'
        ? payload.payload
        : payload?.data && typeof payload.data === 'object'
          ? payload.data
          : payload &&
              (payload.title !== undefined ||
                payload.abstract !== undefined ||
                payload.doi !== undefined)
            ? payload
            : {};

  const confidenceSource =
    payload?.confidence && typeof payload.confidence === 'object'
      ? payload.confidence
      : metadataSource?.confidence && typeof metadataSource.confidence === 'object'
        ? metadataSource.confidence
        : envelope?.confidence && typeof envelope.confidence === 'object'
          ? envelope.confidence
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
  // File extensions and structural noise
  'pdf',
  'doc',
  'docx',
  'txt',
  'file',
  'page',
  'pages',
  'figure',
  'table',
  'chapter',
  'section',
  'appendix',
  'reference',
  'references',
  'bibliography',
  'acknowledgment',
  'abstract',
  'introduction',
  'conclusion',
  'results',
  'discussion',
  'methodology',
  'method',
  'methods',
  'review',
  'literature',
  'based',
  'approach',
  'proposed',
  'existing',
  'new',
  'also',
  'can',
  'use',
  'used',
  'will',
  'may',
  'has',
  'have',
  'been',
  'would',
  'could',
  'should',
  'their',
  'this',
  'these',
  'those',
  'which',
  'were',
  'was',
  'not',
  'but',
  'more',
  'than',
  'each',
  'other',
  'such',
  'only',
  'its',
  'about',
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

  const title = metadata.title || inferTitleFromFilename(fileName) || '';
  if (!metadata.title && title) inferredFields.push('title');

  const year = metadata.year || inferYearFromFilename(fileName) || '';
  if (!metadata.year && year) inferredFields.push('year');

  const keywords = metadata.keywords || (keywordList.length > 0 ? keywordList.join(', ') : '');
  if (!metadata.keywords && keywords) inferredFields.push('keywords');

  // No fabricated abstracts — leave empty if OCR didn't extract one
  const abstract = metadata.abstract || '';

  // No placeholder authors — leave empty if OCR didn't extract them
  const authors = metadata.authors || '';

  // No fabricated venues — leave empty if OCR didn't extract one
  const venue = metadata.venue || '';

  // No "N/A" DOI — leave empty if not found
  const doi = metadata.doi || '';

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
      title: withFallbackConfidence(confidence.title, metadata.title ? 60 : title ? 30 : 0),
      abstract: withFallbackConfidence(confidence.abstract, metadata.abstract ? 58 : 0),
      authors: withFallbackConfidence(confidence.authors, metadata.authors ? 55 : 0),
      year: withFallbackConfidence(confidence.year, metadata.year ? 70 : year ? 30 : 0),
      doi: withFallbackConfidence(confidence.doi, metadata.doi ? 80 : 0),
      venue: withFallbackConfidence(confidence.venue, metadata.venue ? 62 : 0),
      keywords: withFallbackConfidence(
        confidence.keywords,
        metadata.keywords ? 65 : keywords ? 40 : 0,
      ),
    },
    inferredFields,
  };
};

export default function ExistingCapstoneUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mutateAsync: bulkUploadArchive, isPending } = useBulkUploadArchive();
  const { data: academicYears = [], isLoading: yearsLoading } = useAcademicYears();

  const [files, setFiles] = useState(INITIAL_FILES);
  const [form, setForm] = useState(INITIAL_FORM);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [extractionStatus, setExtractionStatus] = useState('idle'); // idle | extracting | success | error
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStage, setExtractionStage] = useState('');
  const [extractionSource, setExtractionSource] = useState(''); // 'Academic Paper' | 'Academic Journal'
  const [activeRescanField, setActiveRescanField] = useState('');
  const [feedbackBusyByField, setFeedbackBusyByField] = useState({});

  const [metadataTarget, setMetadataTarget] = useState('academic_journal'); // 'academic_journal' | 'academic_paper'
  const [plagiarismTarget, setPlagiarismTarget] = useState('academic_paper'); // 'academic_paper' | 'academic_journal'
  const [plagiarismStatus, setPlagiarismStatus] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'error'
  const [plagiarismResult, setPlagiarismResult] = useState(null);
  const [plagiarismError, setPlagiarismError] = useState(null);

  const academicPaperInputRef = useRef(null);
  const academicJournalInputRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = useMemo(() => `${currentYear}-${currentYear + 1}`, [currentYear]);
  const hasDocumentForRescan = Boolean(files.academicPaperFile || files.academicJournalFile);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getConfidenceColor = (score) => {
    if (score === null || score === undefined) return '';
    if (score === 0) return 'bg-muted text-muted-foreground border-border';
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score > 0) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceLabel = (score) => {
    if (score === null || score === undefined) return '';
    if (score === 0) return 'Not extracted';
    if (score < 40) return 'Inferred';
    return `${score}% Conf.`;
  };

  const renderLabelWithConfidence = (label, fieldName) => {
    const score = confidenceScores[fieldName];
    const confidenceLabel = getConfidenceLabel(score);
    return (
      <div className="mb-1.5 flex items-center gap-2">
        <Label htmlFor={fieldName} className="font-medium">
          {label}
        </Label>
        {confidenceLabel && (
          <Badge
            variant="outline"
            className={`${getConfidenceColor(score)} px-1.5 py-0 text-[10px]`}
          >
            {confidenceLabel}
          </Badge>
        )}
      </div>
    );
  };

  const applyExtractedMetadata = (metadata = {}, confidence = {}, targetFields = null) => {
    const fieldsToApply =
      Array.isArray(targetFields) && targetFields.length > 0 ? targetFields : METADATA_FIELD_NAMES;
    const isFullApply = fieldsToApply.length === METADATA_FIELD_NAMES.length;
    const inferredAcademicYear = toAcademicYear(metadata.year);

    setForm((prev) => {
      const next = { ...prev };

      for (const fieldName of fieldsToApply) {
        const incomingValue = String(metadata?.[fieldName] || '').trim();
        if (incomingValue) {
          next[fieldName] = incomingValue;
        }
      }

      if (
        (!prev.academicYear || isFullApply) &&
        inferredAcademicYear &&
        (isFullApply || fieldsToApply.includes('year'))
      ) {
        next.academicYear = inferredAcademicYear;
      }

      return next;
    });

    setConfidenceScores((prev) => {
      if (isFullApply) {
        return confidence;
      }

      const next = { ...prev };
      for (const fieldName of fieldsToApply) {
        const incomingScore = confidence?.[fieldName];
        if (incomingScore !== null && incomingScore !== undefined) {
          next[fieldName] = incomingScore;
        }
      }
      return next;
    });
  };

  const runExtractionPipeline = async (pdfFile, options = {}) => {
    const targetFields =
      Array.isArray(options.targetFields) && options.targetFields.length > 0
        ? options.targetFields
        : null;
    const targetFieldName = targetFields?.[0] || '';
    const sourceLabel =
      options.sourceLabel ||
      (pdfFile === files.academicJournalFile ? 'Academic Journal' : 'Academic Paper');

    if (!pdfFile) {
      toast.error('Select an academic paper or journal PDF first.');
      return;
    }

    const fileType = String(pdfFile.type || '').toLowerCase();
    const fileName = String(pdfFile.name || '').toLowerCase();
    const isPdf = fileType === 'application/pdf' || (!fileType && fileName.endsWith('.pdf'));

    if (!isPdf) {
      toast.error('Only PDF files are supported for OCR extraction.');
      return;
    }

    setActiveRescanField(targetFieldName || 'all');
    setExtractionStatus('extracting');
    setExtractionProgress(10);
    setExtractionStage('Initiating extraction...');

    try {
      const response = await metadataService.extractPdfMetadata(pdfFile);

      let finalEnvelope = response;

      // Handle Asynchronous BullMQ extraction (HTTP 202 or status 'queued')
      if (response?.status === 202 || response?.data?.status === 'queued') {
        const jobId = response.data?.jobId;
        setExtractionStage('Queued for OCR extraction...');
        setExtractionProgress(15);

        finalEnvelope = await new Promise((resolve, reject) => {
          let isResolved = false;
          let pollingInterval = null;
          let timeoutHandle = null;
          const socket = getSocket();

          const onProgress = (data) => {
            if (data?.jobId === jobId) {
              if (data.progress !== undefined) setExtractionProgress(data.progress);
              if (data.stage) setExtractionStage(data.stage);
            }
          };

          const cleanup = () => {
            if (socket) {
              socket.off('ocr:progress', onProgress);
              socket.off('ocr:complete', onComplete);
              socket.off('ocr:error', onError);
            }
            if (pollingInterval) clearInterval(pollingInterval);
            if (timeoutHandle) clearTimeout(timeoutHandle);
          };

          const onComplete = (data) => {
            if (data?.jobId === jobId && !isResolved) {
              isResolved = true;
              cleanup();
              setExtractionProgress(100);
              resolve({ data: data.data || data.payload || data });
            }
          };

          const onError = (data) => {
            if (data?.jobId === jobId && !isResolved) {
              isResolved = true;
              cleanup();
              reject(new Error(data.error || 'Document extraction failed.'));
            }
          };

          if (socket) {
            socket.on('ocr:progress', onProgress);
            socket.on('ocr:complete', onComplete);
            socket.on('ocr:error', onError);
          }

          // Polling fallback every 1500ms
          pollingInterval = setInterval(async () => {
            try {
              const statusRes = await metadataService.getExtractionStatus(jobId);
              const jobData = statusRes?.data;
              if (jobData?.status === 'active' && jobData?.progress !== undefined) {
                setExtractionProgress(jobData.progress);
                if (jobData.stage) setExtractionStage(jobData.stage);
              }
              if (jobData?.status === 'completed' && !isResolved) {
                isResolved = true;
                cleanup();
                setExtractionProgress(100);
                resolve({ data: jobData.data || jobData.payload || jobData });
              } else if (jobData?.status === 'failed' && !isResolved) {
                isResolved = true;
                cleanup();
                reject(new Error(jobData.error || 'Document extraction failed.'));
              }
            } catch (pollErr) {
              // Ignore transient polling error
            }
          }, 1500);

          // Hard timeout safety net: 120s
          timeoutHandle = setTimeout(() => {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              reject(new Error('Extraction timed out after 120 seconds.'));
            }
          }, 120000);
        });
      }

      const { metadata = {}, confidence = {} } = normalizeExtractionPayload(finalEnvelope);
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

      applyExtractedMetadata(enriched.metadata, enriched.confidence, targetFields);
      setExtractionSource(sourceLabel);

      if (targetFieldName) {
        const refreshedValue = String(enriched.metadata?.[targetFieldName] || '').trim();
        if (refreshedValue) {
          toast.success(`${METADATA_FIELD_LABELS[targetFieldName]} rescanned from ${sourceLabel}.`);
        } else {
          toast.warning(`No new ${METADATA_FIELD_LABELS[targetFieldName]} value was detected.`);
        }

        setExtractionStatus('success');
        return;
      }

      if (enriched.inferredFields.length > 0) {
        const sampleFields = enriched.inferredFields.slice(0, 4).join(', ');
        toast.success(
          `Metadata auto-filled from ${sourceLabel}. Inferred fields: ${sampleFields}.`,
        );
      } else {
        toast.success(`Metadata extracted from ${sourceLabel} via OCR.`);
      }

      setExtractionStatus('success');
    } catch (error) {
      if (targetFieldName) {
        setExtractionStatus('error');
        toast.error(
          asUploadErrorMessage(
            error,
            `Failed to rescan ${METADATA_FIELD_LABELS[targetFieldName]}.`,
          ),
        );
        return;
      }

      const localFallback = enrichMetadataFromKeywords({
        metadata: {},
        confidence: {},
        fileName: pdfFile.name,
      });

      applyExtractedMetadata(localFallback.metadata, localFallback.confidence);
      setExtractionSource(sourceLabel);
      setExtractionStatus('success');

      toast.warning(
        `${asUploadErrorMessage(error, 'Extraction API is unavailable.')}` +
          ` Applied keyword-based local autofill from ${sourceLabel}. Please review before upload.`,
      );
    } finally {
      setActiveRescanField('');
    }
  };

  const handleRescanField = async (fieldName) => {
    const targetFile =
      metadataTarget === 'academic_journal'
        ? files.academicJournalFile || files.academicPaperFile
        : files.academicPaperFile || files.academicJournalFile;

    if (!targetFile) {
      toast.error('Upload an academic paper or journal PDF first to rescan.');
      return;
    }
    const sourceLabel =
      targetFile === files.academicJournalFile ? 'Academic Journal' : 'Academic Paper';
    await runExtractionPipeline(targetFile, { targetFields: [fieldName], sourceLabel });
  };

  const handleFeedbackForField = async (fieldName) => {
    const fieldLabel = METADATA_FIELD_LABELS[fieldName] || fieldName;
    const extractedValue = String(form[fieldName] || '').trim();

    const correctedValue = window.prompt(
      `Enter the corrected ${fieldLabel} value to improve extraction patterns:`,
      extractedValue,
    );

    if (correctedValue === null) return;

    const normalizedCorrection = String(correctedValue).trim();
    if (!normalizedCorrection) {
      toast.info('Feedback not submitted because the corrected value is empty.');
      return;
    }

    setFeedbackBusyByField((prev) => ({ ...prev, [fieldName]: true }));

    const sourceFileName = files.academicPaperFile?.name || files.academicJournalFile?.name || '';

    try {
      await metadataService.submitMetadataFeedback({
        fieldName,
        extractedValue,
        correctedValue: normalizedCorrection,
        confidence: confidenceScores[fieldName],
        sourceFileName,
        context: 'archive/capstone-upload',
      });

      setForm((prev) => ({ ...prev, [fieldName]: normalizedCorrection }));
      toast.success(`${fieldLabel} feedback submitted.`);
    } catch (error) {
      toast.error(
        asUploadErrorMessage(error, `Failed to submit feedback for ${fieldLabel.toLowerCase()}.`),
      );
    } finally {
      setFeedbackBusyByField((prev) => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleAcademicPaperSelect = async (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (!selectedFile) return;

    setFiles((prev) => ({ ...prev, academicPaperFile: selectedFile }));

    if (!files.academicJournalFile) {
      setMetadataTarget('academic_paper');
    }
    setPlagiarismTarget('academic_paper');

    await runExtractionPipeline(selectedFile, { sourceLabel: 'Academic Paper' });
  };

  const handleAcademicJournalSelect = async (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (!selectedFile) return;

    setFiles((prev) => ({ ...prev, academicJournalFile: selectedFile }));

    setMetadataTarget('academic_journal');
    if (!files.academicPaperFile) {
      setPlagiarismTarget('academic_journal');
    }

    await runExtractionPipeline(selectedFile, { sourceLabel: 'Academic Journal' });
  };

  const handleRemoveAcademicPaper = () => {
    setFiles((prev) => ({ ...prev, academicPaperFile: null }));
    if (academicPaperInputRef.current) academicPaperInputRef.current.value = '';
    if (metadataTarget === 'academic_paper' && files.academicJournalFile) {
      setMetadataTarget('academic_journal');
    }
    if (plagiarismTarget === 'academic_paper' && files.academicJournalFile) {
      setPlagiarismTarget('academic_journal');
    }
    if (!files.academicJournalFile) {
      setExtractionStatus('idle');
      setExtractionSource('');
      setPlagiarismStatus('idle');
      setPlagiarismResult(null);
      setPlagiarismError(null);
    }
  };

  const handleRemoveAcademicJournal = () => {
    setFiles((prev) => ({ ...prev, academicJournalFile: null }));
    if (academicJournalInputRef.current) academicJournalInputRef.current.value = '';
    if (metadataTarget === 'academic_journal' && files.academicPaperFile) {
      setMetadataTarget('academic_paper');
    }
    if (plagiarismTarget === 'academic_journal' && files.academicPaperFile) {
      setPlagiarismTarget('academic_paper');
    }
    if (!files.academicPaperFile) {
      setExtractionStatus('idle');
      setExtractionSource('');
      setPlagiarismStatus('idle');
      setPlagiarismResult(null);
      setPlagiarismError(null);
    }
  };

  const handleTriggerExtraction = async () => {
    const targetFile =
      metadataTarget === 'academic_journal'
        ? files.academicJournalFile || files.academicPaperFile
        : files.academicPaperFile || files.academicJournalFile;

    const targetLabel =
      targetFile === files.academicJournalFile ? 'Academic Journal' : 'Academic Paper';

    if (!targetFile) {
      toast.error(`Please select an ${targetLabel} file first to extract metadata.`);
      return;
    }

    await runExtractionPipeline(targetFile, { sourceLabel: targetLabel });
  };

  const runPlagiarismScan = async (explicitTarget) => {
    const target = explicitTarget || plagiarismTarget;
    const targetFile =
      target === 'academic_journal' ? files.academicJournalFile : files.academicPaperFile;

    const targetLabel = target === 'academic_journal' ? 'Academic Journal' : 'Academic Paper';

    if (!targetFile) {
      toast.error(`Please upload an ${targetLabel} file first to run plagiarism scan.`);
      return;
    }

    const fileType = String(targetFile.type || '').toLowerCase();
    const fileName = String(targetFile.name || '').toLowerCase();
    const isPdf = fileType === 'application/pdf' || (!fileType && fileName.endsWith('.pdf'));

    if (!isPdf) {
      toast.error('Only PDF files are supported for plagiarism scanning.');
      return;
    }

    setPlagiarismStatus('scanning');
    setPlagiarismError(null);

    try {
      const response = plagiarismService.scanArchive
        ? await plagiarismService.scanArchive(targetFile)
        : await plagiarismService.scanArchivedPdf(targetFile);

      const payload = response?.data?.data || response?.data || response;
      if (!payload) throw new Error('Plagiarism scan did not return report data.');

      const originality =
        payload.originalityScore !== undefined && payload.originalityScore !== null
          ? Number(payload.originalityScore)
          : payload.originality_score !== undefined && payload.originality_score !== null
            ? Number(payload.originality_score)
            : payload.overallScore !== undefined && payload.overallScore !== null
              ? Math.max(0, 100 - Number(payload.overallScore))
              : payload.plagiarism_score !== undefined && payload.plagiarism_score !== null
                ? Math.max(0, 100 - Number(payload.plagiarism_score))
                : 100;

      const similarity =
        payload.overallScore !== undefined && payload.overallScore !== null
          ? Number(payload.overallScore)
          : payload.plagiarism_score !== undefined && payload.plagiarism_score !== null
            ? Number(payload.plagiarism_score)
            : Math.max(0, 100 - originality);

      const matchedSources = Array.isArray(payload.matchedSources) ? payload.matchedSources : [];
      const isWarning = payload.warningFlag ?? similarity >= 25;

      const result = {
        originalityScore: Math.round(originality * 10) / 10,
        overallScore: Math.round(similarity * 10) / 10,
        matchedSources,
        warningFlag: isWarning,
        scannedFile: targetFile.name,
        targetLabel,
      };

      setPlagiarismResult(result);
      setPlagiarismStatus('success');
      toast.success(
        `Plagiarism check on ${targetLabel}: ${result.originalityScore}% Original (${result.overallScore}% Similarity).`,
      );
    } catch (err) {
      const errMsg = asUploadErrorMessage(err, 'Plagiarism scan failed.');
      setPlagiarismError(errMsg);
      setPlagiarismStatus('error');
      toast.error(`Plagiarism scan error: ${errMsg}`);
    }
  };

  const resetPageState = () => {
    setForm(INITIAL_FORM);
    setFiles(INITIAL_FILES);
    setConfidenceScores({});
    setExtractionStatus('idle');
    setExtractionProgress(0);
    setExtractionStage('');
    setExtractionSource('');
    setActiveRescanField('');
    setFeedbackBusyByField({});
    setMetadataTarget('academic_journal');
    setPlagiarismTarget('academic_paper');
    setPlagiarismStatus('idle');
    setPlagiarismResult(null);
    setPlagiarismError(null);

    if (academicPaperInputRef.current) academicPaperInputRef.current.value = '';
    if (academicJournalInputRef.current) academicJournalInputRef.current.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!files.academicPaperFile && !files.academicJournalFile) {
      toast.error('Please upload at least one document (Academic Paper or Academic Journal).');
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
      metadataTarget,
      plagiarismTarget,
      originalityScore:
        plagiarismResult?.originalityScore !== undefined
          ? plagiarismResult.originalityScore
          : undefined,
    };

    try {
      await bulkUploadArchive(payload);
      toast.success('Archived capstone bundle uploaded successfully.', {
        action: {
          label: 'View in Archive',
          onClick: () => navigate('/archive'),
        },
      });
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/archive')}
                className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground h-8 px-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Archive
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Archive Capstone Documents
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload the Academic Paper, Academic Journal, or both. Auto-fill metadata using the OCR
              extraction model.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/archive')}
            className="gap-2 shrink-0 self-start sm:self-auto"
          >
            <Archive className="h-4 w-4" />
            Browse Archive
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b pb-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" /> OCR Auto-Fill Capstone Upload
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              Upload the <strong>Academic Paper</strong> (full manuscript),{' '}
              <strong>Academic Journal</strong> (condensed publication version), or both. Configure
              which document to scan for OCR metadata extraction and which to scan for plagiarism
              check.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-10 p-6 md:p-8">
            <Alert variant="info" className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>Flexible Archival Ingestion:</strong> There is no minimum upload
                requirement—you may upload only the Academic Paper, only the Academic Journal, or
                both simultaneously. Archived projects allow viewers to switch between both
                documents on demand.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* SECTION 1: UPLOAD DOCUMENTS */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2">
                  <h3 className="text-lg font-semibold text-foreground">1. Upload Bundle Files</h3>
                  <span className="text-xs text-muted-foreground">
                    At least one document required (no minimum beyond 1)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Academic Paper Card */}
                  <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 p-5 flex flex-col justify-between transition-colors hover:border-primary/40 hover:bg-muted/60">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <p className="text-sm font-semibold text-foreground">
                            Academic Paper (PDF)
                          </p>
                        </div>
                        {extractionSource === 'Academic Paper' && (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/30 text-[10px]"
                          >
                            Active OCR Source
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Full comprehensive manuscript used for vector indexing and complete archival
                        record.
                      </p>

                      <div className="mt-3 rounded-md border border-border bg-background/80 p-3 text-sm">
                        {files.academicPaperFile ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCheck className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-xs sm:text-sm">
                                  {files.academicPaperFile.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {(files.academicPaperFile.size / 1024).toFixed(1)} KB • Attached
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveAcademicPaper}
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs shrink-0"
                              title="Remove Academic Paper"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">
                            No academic paper selected yet.
                          </span>
                        )}
                      </div>
                    </div>

                    <input
                      ref={academicPaperInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handleAcademicPaperSelect}
                    />

                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        className="gap-2 flex-1 text-xs sm:text-sm"
                        onClick={() => academicPaperInputRef.current?.click()}
                        disabled={extractionStatus === 'extracting'}
                      >
                        {extractionStatus === 'extracting' &&
                        extractionSource === 'Academic Paper' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {files.academicPaperFile ? 'Change Paper' : 'Select Paper & Auto-Extract'}
                      </Button>
                    </div>
                  </div>

                  {/* Academic Journal Card */}
                  <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 p-5 flex flex-col justify-between transition-colors hover:border-primary/40 hover:bg-muted/60">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Files className="h-5 w-5 text-emerald-500 shrink-0" />
                          <p className="text-sm font-semibold text-foreground">
                            Academic Journal (PDF)
                          </p>
                        </div>
                        {extractionSource === 'Academic Journal' && (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/30 text-[10px]"
                          >
                            Active OCR Source
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Condensed publication article / IMRaD format, ideal for rapid metadata
                        scanning.
                      </p>

                      <div className="mt-3 rounded-md border border-border bg-background/80 p-3 text-sm">
                        {files.academicJournalFile ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-xs sm:text-sm">
                                  {files.academicJournalFile.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {(files.academicJournalFile.size / 1024).toFixed(1)} KB • Attached
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveAcademicJournal}
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs shrink-0"
                              title="Remove Academic Journal"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">
                            No academic journal selected yet.
                          </span>
                        )}
                      </div>
                    </div>

                    <input
                      ref={academicJournalInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handleAcademicJournalSelect}
                    />

                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-2 flex-1 text-xs sm:text-sm"
                        onClick={() => academicJournalInputRef.current?.click()}
                        disabled={extractionStatus === 'extracting'}
                      >
                        {extractionStatus === 'extracting' &&
                        extractionSource === 'Academic Journal' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Files className="h-4 w-4" />
                        )}
                        {files.academicJournalFile
                          ? 'Change Journal'
                          : 'Select Journal & Auto-Extract'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SCAN & EXTRACTION CONFIGURATION */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    2. Processing & Scan Target Configuration
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Choose which document to scan for OCR metadata extraction and which document to
                    check for plagiarism.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* OCR Metadata Source Selector Card */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          OCR Metadata Extraction Target
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Select the document scanned to auto-fill title, abstract, and authors.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-foreground">
                        Extraction Source Document
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={metadataTarget === 'academic_journal' ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs justify-start h-9"
                          onClick={() => setMetadataTarget('academic_journal')}
                          disabled={!files.academicJournalFile}
                        >
                          <Files className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">Academic Journal</span>
                        </Button>
                        <Button
                          type="button"
                          variant={metadataTarget === 'academic_paper' ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs justify-start h-9"
                          onClick={() => setMetadataTarget('academic_paper')}
                          disabled={!files.academicPaperFile}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">Academic Paper</span>
                        </Button>
                      </div>
                      {!files.academicPaperFile && !files.academicJournalFile && (
                        <p className="text-[11px] text-muted-foreground italic">
                          Upload at least one document above to enable OCR extraction.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 w-full justify-center"
                        onClick={handleTriggerExtraction}
                        disabled={
                          (!files.academicPaperFile && !files.academicJournalFile) ||
                          extractionStatus === 'extracting'
                        }
                      >
                        {extractionStatus === 'extracting' ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting Metadata...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Extract Metadata from{' '}
                            {metadataTarget === 'academic_journal' ? 'Journal' : 'Paper'}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Extraction Status Alert */}
                    {extractionStatus === 'extracting' && (
                      <Alert className="flex flex-col gap-2 border-primary/30 bg-primary/10 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary shrink-0" />
                            <div>
                              <AlertTitle className="text-xs font-semibold text-primary">
                                Extracting Metadata
                              </AlertTitle>
                              <AlertDescription className="text-primary/90 text-[11px]">
                                {extractionStage ||
                                  `Processing ${extractionSource || 'document'}...`}
                              </AlertDescription>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-primary">
                            {extractionProgress}%
                          </span>
                        </div>
                        <div className="w-full bg-primary/20 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-primary h-1 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(5, extractionProgress)}%` }}
                          />
                        </div>
                      </Alert>
                    )}

                    {extractionStatus === 'success' && (
                      <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 p-2.5 text-xs text-green-700 dark:text-green-400">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                          <span className="truncate">
                            <strong className="font-semibold">Extraction Complete:</strong>{' '}
                            Extracted from <strong>{extractionSource || 'document'}</strong>
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[11px] text-green-700 dark:text-green-400 hover:bg-green-500/20"
                          onClick={handleTriggerExtraction}
                        >
                          Rescan
                        </Button>
                      </div>
                    )}

                    {extractionStatus === 'error' && (
                      <Alert variant="destructive" className="p-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-xs">Extraction Failed</AlertTitle>
                        <AlertDescription className="text-[11px]">
                          Could not parse document. You may edit the metadata fields manually.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Plagiarism Scan Target Selector Card */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-indigo-500 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          Plagiarism Scan Target
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Choose which document to cross-check against the capstone archive corpus.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-foreground">
                        Plagiarism Target Document
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={plagiarismTarget === 'academic_paper' ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs justify-start h-9"
                          onClick={() => setPlagiarismTarget('academic_paper')}
                          disabled={!files.academicPaperFile}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">Academic Paper</span>
                        </Button>
                        <Button
                          type="button"
                          variant={plagiarismTarget === 'academic_journal' ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs justify-start h-9"
                          onClick={() => setPlagiarismTarget('academic_journal')}
                          disabled={!files.academicJournalFile}
                        >
                          <Files className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">Academic Journal</span>
                        </Button>
                      </div>
                      {!files.academicPaperFile && !files.academicJournalFile && (
                        <p className="text-[11px] text-muted-foreground italic">
                          Upload at least one document above to enable plagiarism checking.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 w-full justify-center"
                        onClick={() => runPlagiarismScan()}
                        disabled={
                          (!files.academicPaperFile && !files.academicJournalFile) ||
                          plagiarismStatus === 'scanning'
                        }
                      >
                        {plagiarismStatus === 'scanning' ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning against
                            Corpus...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            Scan {plagiarismTarget === 'academic_paper' ? 'Paper' : 'Journal'} for
                            Plagiarism
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Plagiarism Status & Result */}
                    {plagiarismStatus === 'scanning' && (
                      <Alert className="border-indigo-500/30 bg-indigo-500/10 p-3">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                        <AlertTitle className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          Plagiarism Scan in Progress
                        </AlertTitle>
                        <AlertDescription className="text-indigo-600/90 dark:text-indigo-300/90 text-[11px]">
                          Comparing text against all approved archived manuscripts and journals...
                        </AlertDescription>
                      </Alert>
                    )}

                    {plagiarismStatus === 'success' && plagiarismResult && (
                      <div className="rounded-lg border border-border/80 bg-muted/40 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                plagiarismResult.originalityScore >= 75
                                  ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                                  : plagiarismResult.originalityScore >= 50
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
                                    : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                              }
                            >
                              {plagiarismResult.originalityScore}% Original
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({plagiarismResult.overallScore}% Similarity)
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {plagiarismResult.targetLabel}
                          </span>
                        </div>
                        {plagiarismResult.warningFlag && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              Warning: Similarity exceeds the standard capstone threshold (25%).
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {plagiarismStatus === 'error' && (
                      <Alert variant="destructive" className="p-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-xs">Scan Failed</AlertTitle>
                        <AlertDescription className="text-[11px]">
                          {plagiarismError || 'Could not complete plagiarism check.'}
                        </AlertDescription>
                      </Alert>
                    )}

                    {plagiarismStatus === 'idle' && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Optional: You can scan for similarity now or proceed directly with
                        uploading.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: VERIFY METADATA */}
              <div className="space-y-6">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold text-foreground">3. Verify Metadata</h3>
                  <p className="text-xs text-muted-foreground">
                    Review and refine the auto-filled metadata. Fields can be rescanned individually
                    using the selected OCR source.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                    {renderLabelWithConfidence('Title', 'title')}
                    <Input
                      id="title"
                      name="title"
                      value={form.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Enhancing OCR Performance..."
                    />
                    <div className="flex flex-col gap-2 pt-1 sm:max-w-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleRescanField('title')}
                        disabled={!hasDocumentForRescan || extractionStatus === 'extracting'}
                      >
                        {activeRescanField === 'title' && extractionStatus === 'extracting' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Rescan Title Only
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleFeedbackForField('title')}
                        disabled={Boolean(feedbackBusyByField.title)}
                      >
                        {feedbackBusyByField.title ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                        Send Title Feedback
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                    {renderLabelWithConfidence('Abstract', 'abstract')}
                    <Textarea
                      id="abstract"
                      name="abstract"
                      value={form.abstract}
                      onChange={handleInputChange}
                      placeholder="Provide a brief summary of the paper..."
                      className="min-h-[140px] resize-y"
                    />
                    <div className="flex flex-col gap-2 pt-1 sm:max-w-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleRescanField('abstract')}
                        disabled={!hasDocumentForRescan || extractionStatus === 'extracting'}
                      >
                        {activeRescanField === 'abstract' && extractionStatus === 'extracting' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Rescan Abstract Only
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleFeedbackForField('abstract')}
                        disabled={Boolean(feedbackBusyByField.abstract)}
                      >
                        {feedbackBusyByField.abstract ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                        Send Abstract Feedback
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                    {renderLabelWithConfidence('Authors', 'authors')}
                    <Input
                      id="authors"
                      name="authors"
                      value={form.authors}
                      onChange={handleInputChange}
                      placeholder="e.g. Jane Doe, John Smith"
                    />
                    <div className="flex flex-col gap-2 pt-1 sm:max-w-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleRescanField('authors')}
                        disabled={!hasDocumentForRescan || extractionStatus === 'extracting'}
                      >
                        {activeRescanField === 'authors' && extractionStatus === 'extracting' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Rescan Authors Only
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleFeedbackForField('authors')}
                        disabled={Boolean(feedbackBusyByField.authors)}
                      >
                        {feedbackBusyByField.authors ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                        Send Authors Feedback
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                    {renderLabelWithConfidence('Publication Year', 'year')}
                    <Input
                      id="year"
                      name="year"
                      value={form.year}
                      onChange={handleInputChange}
                      placeholder="e.g. 2023"
                    />
                    <div className="flex flex-col gap-2 pt-1 sm:max-w-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleRescanField('year')}
                        disabled={!hasDocumentForRescan || extractionStatus === 'extracting'}
                      >
                        {activeRescanField === 'year' && extractionStatus === 'extracting' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Rescan Year Only
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleFeedbackForField('year')}
                        disabled={Boolean(feedbackBusyByField.year)}
                      >
                        {feedbackBusyByField.year ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                        Send Year Feedback
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
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

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                    {renderLabelWithConfidence('DOI', 'doi')}
                    <Input
                      id="doi"
                      name="doi"
                      value={form.doi}
                      onChange={handleInputChange}
                      placeholder="e.g. 10.1016/..."
                    />
                    <div className="flex flex-col gap-2 pt-1 sm:max-w-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleRescanField('doi')}
                        disabled={!hasDocumentForRescan || extractionStatus === 'extracting'}
                      >
                        {activeRescanField === 'doi' && extractionStatus === 'extracting' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Rescan DOI Only
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleFeedbackForField('doi')}
                        disabled={Boolean(feedbackBusyByField.doi)}
                      >
                        {feedbackBusyByField.doi ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                        Send DOI Feedback
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                    {renderLabelWithConfidence('Publication Venue', 'venue')}
                    <Input
                      id="venue"
                      name="venue"
                      value={form.venue}
                      onChange={handleInputChange}
                      placeholder="e.g. Remote Sensing, NeurIPS, IEEE Trans. PAMI, arXiv"
                    />
                    <p className="text-xs text-muted-foreground">
                      Specific journal, conference proceedings, or preprint repository (not
                      publisher or city).
                    </p>
                    <div className="flex flex-col gap-2 pt-1 sm:max-w-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleRescanField('venue')}
                        disabled={!hasDocumentForRescan || extractionStatus === 'extracting'}
                      >
                        {activeRescanField === 'venue' && extractionStatus === 'extracting' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Rescan Venue Only
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleFeedbackForField('venue')}
                        disabled={Boolean(feedbackBusyByField.venue)}
                      >
                        {feedbackBusyByField.venue ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                        Send Venue Feedback
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                    {renderLabelWithConfidence('Keywords', 'keywords')}
                    <Input
                      id="keywords"
                      name="keywords"
                      value={form.keywords}
                      onChange={handleInputChange}
                      placeholder="E.g. OCR, Machine Learning, Transformers"
                    />
                    <div className="flex flex-col gap-2 pt-1 sm:max-w-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleRescanField('keywords')}
                        disabled={!hasDocumentForRescan || extractionStatus === 'extracting'}
                      >
                        {activeRescanField === 'keywords' && extractionStatus === 'extracting' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Rescan Keywords Only
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleFeedbackForField('keywords')}
                        disabled={Boolean(feedbackBusyByField.keywords)}
                      >
                        {feedbackBusyByField.keywords ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                        Send Keywords Feedback
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: SEPARATE UPLOAD SUBMISSION SECTION */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      4. Confirm & Upload Archive Bundle
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Review attached bundle documents and complete archival registration.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="self-start sm:self-auto text-xs px-2.5 py-0.5"
                  >
                    {files.academicPaperFile && files.academicJournalFile
                      ? 'Dual Bundle (Paper + Journal)'
                      : files.academicPaperFile
                        ? 'Single Bundle (Paper Only)'
                        : files.academicJournalFile
                          ? 'Single Bundle (Journal Only)'
                          : 'No Documents Attached'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <p className="text-muted-foreground mb-1 font-medium">📄 Academic Paper</p>
                    <p className="font-semibold text-foreground truncate">
                      {files.academicPaperFile ? files.academicPaperFile.name : 'Not attached'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <p className="text-muted-foreground mb-1 font-medium">📑 Academic Journal</p>
                    <p className="font-semibold text-foreground truncate">
                      {files.academicJournalFile ? files.academicJournalFile.name : 'Not attached'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <p className="text-muted-foreground mb-1 font-medium">🔍 OCR Source</p>
                    <p className="font-semibold text-foreground truncate">
                      {metadataTarget === 'academic_journal'
                        ? 'Academic Journal'
                        : 'Academic Paper'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <p className="text-muted-foreground mb-1 font-medium">🛡️ Plagiarism Check</p>
                    <p className="font-semibold text-foreground truncate">
                      {plagiarismResult
                        ? `${plagiarismResult.originalityScore}% Original`
                        : 'Not scanned'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-muted-foreground order-2 sm:order-1">
                    Once submitted, capstone documents will be indexed into the institutional
                    repository for archive search and viewer toggling.
                  </p>
                  <Button
                    type="submit"
                    size="lg"
                    className="order-1 sm:order-2 px-8 h-11 gap-2 font-semibold shadow-md shrink-0"
                    disabled={
                      isPending ||
                      extractionStatus === 'extracting' ||
                      plagiarismStatus === 'scanning' ||
                      (!files.academicPaperFile && !files.academicJournalFile)
                    }
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Upload Archived Capstone Bundle
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

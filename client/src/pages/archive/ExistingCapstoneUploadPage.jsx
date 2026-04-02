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

const INITIAL_FORM = { title: '', abstract: '', academicYear: '' };

export default function ExistingCapstoneUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [keywords, setKeywords] = useState([]);
  const [academicPaperFile, setAcademicPaperFile] = useState(null);
  const [academicJournalFile, setAcademicJournalFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const { mutateAsync, isPending } = useBulkUploadArchive();
  const { data: academicYears = [], isLoading: yearsLoading } = useAcademicYears();

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  /**
   * Extracts title and abstract from a PDF file using the server API.
   */
  const handlePdfExtraction = useCallback(
    async (file) => {
      if (!file || file.type !== 'application/pdf') return;

      setIsExtracting(true);
      try {
        const response = await documentService.extractPdfMetadata(file);
        const { title, abstract, confidence } = response.data.data;

        // Only auto-fill if fields are empty or confidence is high
        if (title && (!form.title || confidence.title > 0.7)) {
          setForm((prev) => ({ ...prev, title }));
          toast.success('Title extracted from PDF');
        }
        if (abstract && (!form.abstract || confidence.abstract > 0.7)) {
          setForm((prev) => ({ ...prev, abstract }));
          toast.success('Abstract extracted from PDF');
        }

        if (!title && !abstract) {
          toast.info('Could not extract title/abstract from this PDF format.');
        }
      } catch (err) {
        // Silent fail - user can still fill manually
        console.warn('PDF extraction failed:', err);
      } finally {
        setIsExtracting(false);
      }
    },
    [form.title, form.abstract],
  );

  /**
   * Handles academic paper file selection and triggers extraction.
   */
  const handleAcademicPaperChange = useCallback(
    (e) => {
      const file = e.target.files?.[0] || null;
      setAcademicPaperFile(file);

      // Auto-extract metadata when PDF is selected and fields are empty
      if (file && (!form.title || !form.abstract)) {
        handlePdfExtraction(file);
      }
    },
    [form.title, form.abstract, handlePdfExtraction],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setKeywords([]);
    setAcademicPaperFile(null);
    setAcademicJournalFile(null);

    const academicInput = document.getElementById('academic-paper-file');
    const journalInput = document.getElementById('academic-journal-file');
    if (academicInput) academicInput.value = '';
    if (journalInput) journalInput.value = '';
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!form.title.trim() || !form.academicYear.trim()) {
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
        await mutateAsync({
          title: form.title.trim(),
          abstract: form.abstract.trim(),
          keywords: keywords.join(', '),
          academicYear: form.academicYear.trim(),
          academicPaperFile,
          academicJournalFile,
        });

        toast.success('Archived capstone uploaded successfully.');
        resetForm();
      } catch (err) {
        toast.error(err?.response?.data?.error?.message || err.message || 'Upload failed.');
      }
    },
    [academicJournalFile, academicPaperFile, form, keywords, mutateAsync, resetForm],
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
                <p className="text-xs text-muted-foreground">
                  Title and abstract will be auto-extracted when you select a PDF.
                </p>
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

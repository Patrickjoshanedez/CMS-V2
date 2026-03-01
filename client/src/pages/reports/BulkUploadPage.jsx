import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useBulkUploadArchive } from '@/hooks/useProjects';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';
import { Loader2, Upload, ArrowLeft, Info } from 'lucide-react';

const INITIAL_FORM = { title: '', abstract: '', keywords: '', academicYear: '' };

/**
 * BulkUploadPage — Instructor-only page to archive legacy capstone documents.
 *
 * Allows uploading a PDF along with metadata, bypassing the standard
 * submission workflow. Intended for digitising previous years' records.
 */
export default function BulkUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [file, setFile] = useState(null);

  const { mutateAsync, isPending } = useBulkUploadArchive();

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleFileChange = useCallback((e) => {
    setFile(e.target.files?.[0] || null);
  }, []);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFile(null);
    // Reset the file input element
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
  }, []);

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
      if (form.keywords.trim()) formData.append('keywords', form.keywords.trim());
      formData.append('academicYear', form.academicYear.trim());

      try {
        await mutateAsync(formData);
        toast.success('Document archived successfully');
        resetForm();
      } catch (err) {
        toast.error(err?.response?.data?.error?.message || err.message || 'Upload failed.');
      }
    },
    [form, file, mutateAsync, resetForm],
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
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bulk Archive Upload</h1>
            <p className="text-muted-foreground">Upload legacy capstone documents to the archive.</p>
          </div>
        </div>

        {/* Info Note */}
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertDescription>
            This bypasses the standard submission workflow. Use this to archive previous years&apos;
            physical documents.
          </AlertDescription>
        </Alert>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Capstone project title"
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
                <Input
                  id="keywords"
                  name="keywords"
                  placeholder="Comma-separated, e.g. IoT, machine learning"
                  value={form.keywords}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Input
                  id="academicYear"
                  name="academicYear"
                  placeholder="e.g. 2023-2024"
                  value={form.academicYear}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="file-upload">PDF File *</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
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
                {isPending ? 'Uploading…' : 'Upload to Archive'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}

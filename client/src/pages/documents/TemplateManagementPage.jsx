import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from '@/hooks/useDocuments';
import { ROLES, DOCUMENT_TYPES } from '@cms/shared';
import {
  Loader2,
  Plus,
  FileText,
  Pencil,
  Trash2,
  ExternalLink,
  AlertCircle,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * TemplateManagementPage — Instructor-only page for managing
 * Google Docs templates that are used to generate project documents.
 *
 * Instructors can:
 * - Register an existing Google Doc as a template (by pasting its ID or URL)
 * - Browse, filter, and edit template metadata
 * - Activate/deactivate or delete templates
 */

/** Human-readable labels for document types */
const DOC_TYPE_LABELS = {
  [DOCUMENT_TYPES.CHAPTER_1]: 'Chapter 1',
  [DOCUMENT_TYPES.CHAPTER_2]: 'Chapter 2',
  [DOCUMENT_TYPES.CHAPTER_3]: 'Chapter 3',
  [DOCUMENT_TYPES.CHAPTER_4]: 'Chapter 4',
  [DOCUMENT_TYPES.CHAPTER_5]: 'Chapter 5',
  [DOCUMENT_TYPES.PROPOSAL]: 'Full Proposal',
  [DOCUMENT_TYPES.FINAL_ACADEMIC]: 'Final (Academic)',
  [DOCUMENT_TYPES.FINAL_JOURNAL]: 'Final (Journal)',
};

/** Extract Google Doc ID from a full URL or return the string as-is */
function extractDocId(input) {
  if (!input) return '';
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input.trim();
}

/* ────────── Create / Edit Form ────────── */

function TemplateForm({ initial, onSubmit, onCancel, isLoading }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [googleDocId, setGoogleDocId] = useState(initial?.googleDocId || '');
  const [documentType, setDocumentType] = useState(initial?.documentType || DOCUMENT_TYPES.CHAPTER_1);
  const isEdit = !!initial;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { title, description, documentType };
    if (!isEdit) {
      payload.googleDocId = extractDocId(googleDocId);
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="googleDocId">Google Doc ID or URL *</Label>
          <Input
            id="googleDocId"
            value={googleDocId}
            onChange={(e) => setGoogleDocId(e.target.value)}
            placeholder="Paste the Google Docs URL or document ID"
            required
          />
          <p className="text-xs text-muted-foreground">
            The Google Doc must be shared with the service account email, or be publicly accessible.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Template Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 1 — Introduction Template"
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of what this template is for"
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="documentType">Document Type *</Label>
        <select
          id="documentType"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={isEdit}
        >
          {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Register Template'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/* ────────── Template Card ────────── */

function TemplateCard({ template, onEdit, onDelete, onToggleActive }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className={!template.isActive ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="truncate font-medium">{template.title}</h3>
            </div>
            {template.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {template.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{DOC_TYPE_LABELS[template.documentType] || template.documentType}</Badge>
              <Badge variant={template.isActive ? 'default' : 'secondary'}>
                {template.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(template.googleDocUrl, '_blank')}
              title="Open in Google Docs"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleActive(template)}
              title={template.isActive ? 'Deactivate' : 'Activate'}
            >
              {template.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(template)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            {confirming ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete(template._id);
                    setConfirming(false);
                  }}
                >
                  Confirm
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(true)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Main Page ────────── */

export default function TemplateManagementPage() {
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // template being edited
  const [typeFilter, setTypeFilter] = useState('');

  const queryFilters = typeFilter ? { documentType: typeFilter } : {};
  const { data, isLoading, error: fetchError } = useTemplates(queryFilters);

  const createMutation = useCreateTemplate({
    onSuccess: () => {
      toast.success('Template registered successfully');
      setShowForm(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create template'),
  });

  const updateMutation = useUpdateTemplate({
    onSuccess: () => {
      toast.success('Template updated');
      setEditing(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update template'),
  });

  const deleteMutation = useDeleteTemplate({
    onSuccess: () => toast.success('Template deleted'),
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete template'),
  });

  const handleCreate = useCallback(
    (payload) => createMutation.mutate(payload),
    [createMutation],
  );

  const handleUpdate = useCallback(
    (payload) => updateMutation.mutate({ templateId: editing._id, ...payload }),
    [updateMutation, editing],
  );

  const handleDelete = useCallback(
    (templateId) => deleteMutation.mutate(templateId),
    [deleteMutation],
  );

  const handleToggleActive = useCallback(
    (template) => {
      updateMutation.mutate({
        templateId: template._id,
        isActive: !template.isActive,
      });
    },
    [updateMutation],
  );

  // Instructor-only guard
  if (user?.role !== ROLES.INSTRUCTOR) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You don&apos;t have permission to manage templates.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const templates = data?.templates || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Templates</h1>
            <p className="text-muted-foreground">
              Manage Google Docs templates used to generate capstone documents.
            </p>
          </div>
          {!showForm && !editing && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Template
            </Button>
          )}
        </div>

        {/* Create / Edit Form */}
        {(showForm || editing) && (
          <Card>
            <CardHeader>
              <CardTitle>{editing ? 'Edit Template' : 'Register New Template'}</CardTitle>
              <CardDescription>
                {editing
                  ? 'Update the template metadata below.'
                  : 'Paste a Google Docs URL or ID to register it as a template. The document must be accessible by the CMS service account.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateForm
                initial={editing}
                onSubmit={editing ? handleUpdate : handleCreate}
                onCancel={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Label htmlFor="typeFilter" className="whitespace-nowrap text-sm">
            Filter by type:
          </Label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All Types</option>
            {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {fetchError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {fetchError?.response?.data?.message || 'Failed to load templates.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && templates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No templates yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Register your first Google Docs template to get started.
              </p>
              {!showForm && (
                <Button className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Register Template
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Template list */}
        {!isLoading && templates.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard
                key={t._id}
                template={t}
                onEdit={(tpl) => {
                  setEditing(tpl);
                  setShowForm(false);
                }}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

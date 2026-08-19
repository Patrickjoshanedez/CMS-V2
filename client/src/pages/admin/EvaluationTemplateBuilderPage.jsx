import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  useEvaluationTemplates,
  useSaveEvaluationTemplate,
  useDeleteEvaluationTemplate,
} from '@/hooks/useEvaluations';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  Star,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

export default function EvaluationTemplateBuilderPage() {
  const [selectedDefenseType, setSelectedDefenseType] = useState('proposal');
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Form state for creating/editing template
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defenseType, setDefenseType] = useState('proposal');
  const [isDefault, setIsDefault] = useState(false);
  const [criteria, setCriteria] = useState([
    {
      name: 'Problem Formulation & Objectives',
      maxScore: 25,
      description: 'Clarity of research questions and scope',
    },
    {
      name: 'Methodology & Technical Rigor',
      maxScore: 35,
      description: 'Appropriateness of tools, datasets, and architecture',
    },
    {
      name: 'Literature Review & Originality',
      maxScore: 20,
      description: 'Comprehensive citation and gap analysis',
    },
    {
      name: 'Oral Presentation & Defense',
      maxScore: 20,
      description: 'Answering panel inquiries and prototype demonstration',
    },
  ]);

  // Fetch templates via hook
  const { data: templates = [], isLoading } = useEvaluationTemplates(selectedDefenseType);

  // Create/Update mutation hook
  const saveMutation = useSaveEvaluationTemplate({
    onSuccess: () => {
      toast.success(
        editingTemplate ? 'Template updated successfully.' : 'Evaluation rubric template created.',
      );
      resetForm();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save template.');
    },
  });

  // Delete mutation hook
  const deleteMutation = useDeleteEvaluationTemplate({
    onSuccess: () => {
      toast.success('Template archived.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to archive template.');
    },
  });

  const resetForm = () => {
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setDefenseType('proposal');
    setIsDefault(false);
    setCriteria([
      { name: 'Problem Formulation & Objectives', maxScore: 25, description: '' },
      { name: 'Methodology & Technical Rigor', maxScore: 35, description: '' },
      { name: 'Literature Review & Originality', maxScore: 20, description: '' },
      { name: 'Oral Presentation & Defense', maxScore: 20, description: '' },
    ]);
  };

  const handleEdit = (tmpl) => {
    setEditingTemplate(tmpl);
    setName(tmpl.name);
    setDescription(tmpl.description || '');
    setDefenseType(tmpl.defenseType);
    setIsDefault(tmpl.isDefault);
    setCriteria(
      tmpl.criteria.map((c) => ({
        name: c.name,
        maxScore: c.maxScore,
        description: c.description || '',
      })),
    );
  };

  const handleAddCriterion = () => {
    if (criteria.length >= 20) {
      toast.error('A maximum of 20 criteria is supported per rubric.');
      return;
    }
    setCriteria([...criteria, { name: '', maxScore: 20, description: '' }]);
  };

  const handleRemoveCriterion = (index) => {
    if (criteria.length <= 1) {
      toast.error('Rubric must contain at least 1 criterion.');
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (index, field, value) => {
    const next = [...criteria];
    next[index][field] = field === 'maxScore' ? Number(value) : value;
    setCriteria(next);
  };

  const totalMaxScore = criteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please provide a template name.');
      return;
    }
    if (criteria.some((c) => !c.name.trim())) {
      toast.error('All criteria must have a descriptive title.');
      return;
    }
    saveMutation.mutate({
      templateId: editingTemplate?._id,
      name: name.trim(),
      description: description.trim(),
      defenseType,
      criteria,
      isDefault,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Evaluation Rubric Builder
          </h2>
          <p className="text-sm text-muted-foreground">
            Dr. Sales G. Aribe Jr. Requirement: Design customizable grading rubrics and scoring
            criteria for proposal and final defenses.
          </p>
        </div>

        {/* Filter by defense type */}
        <div className="flex gap-2 border-b border-border pb-3">
          <Button
            variant={selectedDefenseType === 'proposal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDefenseType('proposal')}
          >
            Proposal Defense Rubrics
          </Button>
          <Button
            variant={selectedDefenseType === 'final' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDefenseType('final')}
          >
            Final Defense Rubrics
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* List of existing templates */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Configured Templates ({templates.length})
            </h3>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No templates configured for this defense type yet. Create one using the form on the
                right.
              </div>
            ) : (
              templates.map((tmpl) => (
                <Card
                  key={tmpl._id}
                  className={tmpl.isDefault ? 'border-primary/40 bg-primary/5' : ''}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                          {tmpl.name}
                          {tmpl.isDefault && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-[10px] uppercase font-bold text-primary"
                            >
                              <Star className="h-3 w-3 fill-primary" /> Default
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {tmpl.description || 'No description'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {tmpl.criteria?.length || 0} Criteria • Total:{' '}
                        {tmpl.criteria?.reduce((s, c) => s + c.maxScore, 0)} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex justify-end gap-2">
                    <Button size="xs" variant="outline" onClick={() => handleEdit(tmpl)}>
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm(`Archive "${tmpl.name}"?`))
                          deleteMutation.mutate(tmpl._id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Builder / Edit Form */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {editingTemplate
                    ? `Edit Template: ${editingTemplate.name}`
                    : 'Create New Evaluation Rubric'}
                </CardTitle>
                <CardDescription>
                  Define the individual scoring items that panel members will rate during defenses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="templateName">Template Name *</Label>
                      <Input
                        id="templateName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Standard Capstone 1 Rubric 2026"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="defenseTypeSelect">Defense Phase</Label>
                      <select
                        id="defenseTypeSelect"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={defenseType}
                        onChange={(e) => setDefenseType(e.target.value)}
                      >
                        <option value="proposal">Proposal Defense</option>
                        <option value="final">Final Defense</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="templateDesc">Description</Label>
                    <Input
                      id="templateDesc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief notes on the intended rubric application"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isDefaultCheckbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label
                      htmlFor="isDefaultCheckbox"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Set as active default template for {defenseType} defenses
                    </Label>
                  </div>

                  {/* Criteria Builder */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-primary" /> Criteria ({criteria.length}) —
                        Total Max: {totalMaxScore} Points
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddCriterion}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add Criterion
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {criteria.map((crit, idx) => (
                        <div
                          key={idx}
                          className="flex gap-2 items-start rounded-lg border bg-muted/20 p-3"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={crit.name}
                                onChange={(e) => handleCriterionChange(idx, 'name', e.target.value)}
                                placeholder={`Criterion ${idx + 1} Name`}
                                className="font-semibold text-sm"
                                required
                              />
                              <div className="w-24 shrink-0 flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={crit.maxScore}
                                  onChange={(e) =>
                                    handleCriterionChange(idx, 'maxScore', e.target.value)
                                  }
                                  className="text-center font-bold"
                                  required
                                />
                                <span className="text-xs text-muted-foreground font-semibold">
                                  pts
                                </span>
                              </div>
                            </div>
                            <Input
                              value={crit.description}
                              onChange={(e) =>
                                handleCriterionChange(idx, 'description', e.target.value)
                              }
                              placeholder="Evaluation guidelines / scoring description for panelists"
                              className="text-xs"
                            />
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => handleRemoveCriterion(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    {editingTemplate && (
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel Edit
                      </Button>
                    )}
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingTemplate ? 'Save Template Changes' : 'Create Evaluation Template'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

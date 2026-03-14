import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useCreateProject } from '@/hooks/useProjects';
import { useMyTeam } from '@/hooks/useTeams';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import { AlertTriangle, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CAPSTONE_TITLE_VALUES } from '@cms/shared';

/**
 * CreateProjectPage — Students create a new capstone project.
 *
 * The form collects title, abstract, keywords, and academic year.
 * On submission, the server returns any similar projects found,
 * which are displayed as warnings.
 */

const currentYear = new Date().getFullYear();
const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject({
    onSuccess: () => {
      toast.success('Project created successfully!');
      navigate('/project');
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message || err?.message || 'Failed to create project.',
      );
    },
  });

  const { data: team, isLoading: isTeamLoading } = useMyTeam();
  const { data: academicYears = [] } = useAcademicYears();

  const [form, setForm] = useState({
    title: '',
    abstract: '',
    keywords: '',
    academicYear: defaultAcademicYear,
    sectionId: '',
  });
  const [keywordList, setKeywordList] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [memberRoleAssignments, setMemberRoleAssignments] = useState({});

  const { data: sections = [], isLoading: isSectionsLoading } = useSections(
    { academicYear: form.academicYear || undefined },
    { enabled: Boolean(form.academicYear) },
  );

  const sectionOptions = useMemo(
    () => sections.filter((section) => section.academicYear === form.academicYear),
    [sections, form.academicYear],
  );

  useEffect(() => {
    if (!form.sectionId || sectionOptions.some((section) => section._id === form.sectionId)) {
      return;
    }
    setForm((prev) => ({ ...prev, sectionId: '' }));
  }, [form.sectionId, sectionOptions]);

  useEffect(() => {
    const members = team?.members || [];
    if (members.length === 0) {
      return;
    }

    setMemberRoleAssignments((prev) => {
      const next = {};
      for (const member of members) {
        next[member._id] = prev[member._id] || '';
      }
      return next;
    });
  }, [team]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywordList.includes(kw) && keywordList.length < 10) {
      setKeywordList((prev) => [...prev, kw]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw) => {
    setKeywordList((prev) => prev.filter((k) => k !== kw));
  };

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const members = team?.members || [];
    const assignmentPayload = members.map((member) => ({
      userId: member._id,
      professionalTitle: memberRoleAssignments[member._id],
    }));

    const hasMissingAssignments = assignmentPayload.some((entry) => !entry.professionalTitle);
    if (hasMissingAssignments) {
      toast.error('Assign a professional capstone title to every team member.');
      return;
    }

    createProject.mutate({
      title: form.title,
      abstract: form.abstract || undefined,
      keywords: keywordList.length > 0 ? keywordList : undefined,
      academicYear: form.academicYear,
      sectionId: form.sectionId,
      memberRoleAssignments: assignmentPayload,
    });
  };

  const handleMemberRoleChange = (memberId, professionalTitle) => {
    setMemberRoleAssignments((prev) => ({
      ...prev,
      [memberId]: professionalTitle,
    }));
  };

  const formatMemberName = (member) =>
    [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ');

  // Extract similar projects from server response (if any)
  const similarProjects =
    createProject.data?.data?.similarProjects ||
    createProject.error?.response?.data?.data?.similarProjects;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Create Project</h3>
          <p className="text-muted-foreground">
            Start your capstone project by entering a title and optional details.
          </p>
        </div>

        {createProject.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {createProject.error?.response?.data?.error?.message ||
                createProject.error?.message ||
                'Failed to create project'}
            </AlertDescription>
          </Alert>
        )}

        {similarProjects && similarProjects.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-medium">Similar projects found:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {similarProjects.map((sp) => (
                  <li key={sp.projectId}>
                    <span className="font-medium">{sp.title}</span>{' '}
                    <span className="text-muted-foreground">
                      — {Math.round(sp.score * 100)}% similar
                    </span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Your title can be modified later. It starts as a draft until you submit it for review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Enter your capstone project title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  minLength={10}
                  maxLength={300}
                />
              </div>

              {/* Abstract */}
              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract</Label>
                <Textarea
                  id="abstract"
                  name="abstract"
                  placeholder="Brief description of your project (optional)"
                  value={form.abstract}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {form.abstract.length}/500 characters
                </p>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    id="keywords"
                    placeholder="Add a keyword and press Enter"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywordList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {keywordList.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="rounded-full p-0.5 hover:bg-primary/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{keywordList.length}/10 keywords</p>
              </div>

              {/* Academic Year */}
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <select
                  id="academicYear"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
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

              {/* Section */}
              <div className="space-y-2">
                <Label htmlFor="sectionId">Section *</Label>
                <select
                  id="sectionId"
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={isSectionsLoading}
                >
                  <option value="">Select a section</option>
                  {sectionOptions.map((section) => (
                    <option key={section._id} value={section._id}>
                      {section.courseId?.code} - {section.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Professional Capstone Role Assignment */}
              <div className="space-y-2 rounded-md border p-4">
                <Label className="text-sm font-semibold">Member Role Assignment *</Label>
                <p className="text-xs text-muted-foreground">
                  Assign one professional capstone title to each team member, including yourself.
                </p>

                {isTeamLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading team members...
                  </div>
                )}

                {!isTeamLoading && (!team?.members || team.members.length === 0) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      You need an active team with members before initializing a project.
                    </AlertDescription>
                  </Alert>
                )}

                {!isTeamLoading && team?.members?.length > 0 && (
                  <div className="space-y-3">
                    {team.members.map((member) => (
                      <div
                        key={member._id}
                        className="grid gap-2 rounded-md border p-3 sm:grid-cols-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{formatMemberName(member)}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <select
                          value={memberRoleAssignments[member._id] || ''}
                          onChange={(e) => handleMemberRoleChange(member._id, e.target.value)}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          required
                        >
                          <option value="">Select professional capstone title</option>
                          {CAPSTONE_TITLE_VALUES.map((title) => (
                            <option key={title} value={title}>
                              {title}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

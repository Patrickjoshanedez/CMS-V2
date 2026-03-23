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
import { useAuthStore } from '@/stores/authStore';
import { AlertTriangle, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CAPSTONE_TITLES, CAPSTONE_TITLE_VALUES } from '@cms/shared';

/**
 * CreateProjectPage — Students create a new capstone project.
 *
 * The form collects title, abstract, keywords, and academic year.
 * On submission, the server returns any similar projects found,
 * which are displayed as warnings.
 */

const currentYear = new Date().getFullYear();
const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;
const SOLO_PROFESSIONAL_TITLE = CAPSTONE_TITLES.UI_UX_DESIGNER_RESEARCHER;

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
  const user = useAuthStore((state) => state.user);
  const { data: academicYears = [] } = useAcademicYears();

  const [form, setForm] = useState({
    title: '',
    abstract: '',
    keywords: '',
    academicYear: defaultAcademicYear,
    sectionId: '',
  });
  const [titleProposals, setTitleProposals] = useState(['', '', '', '', '']);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [keywordList, setKeywordList] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [memberRoleAssignments, setMemberRoleAssignments] = useState({});
  const [soloCapstoneConfirmed, setSoloCapstoneConfirmed] = useState(false);

  const teamMembers = useMemo(() => {
    if (team?.members?.length > 0) {
      return team.members;
    }

    if (user?._id) {
      return [user];
    }

    return [];
  }, [team?.members, user]);

  const isSoloCapstoneFlow = !isTeamLoading && (!team?.members || team.members.length === 0);

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
    const members = teamMembers;
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
  }, [teamMembers]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTitleProposalChange = (index, value) => {
    setTitleProposals((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addTitleProposal = () => {
    setTitleProposals((prev) => {
      if (prev.length >= 10) return prev;
      return [...prev, ''];
    });
  };

  const removeTitleProposal = (index) => {
    setTitleProposals((prev) => {
      if (prev.length <= 5) return prev;
      const next = prev.filter((_, idx) => idx !== index);
      if (selectedTitleIndex >= next.length) {
        setSelectedTitleIndex(next.length - 1);
      }
      return next;
    });
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

    const members = teamMembers;
    const normalizedTitleProposals = [...new Set(titleProposals.map((proposal) => proposal.trim()))]
      .filter(Boolean);

    if (normalizedTitleProposals.length < 5) {
      toast.error('Please provide at least 5 unique title proposals.');
      return;
    }

    const selectedTitle = titleProposals[selectedTitleIndex]?.trim();
    if (!selectedTitle) {
      toast.error('Select a valid primary title from your proposals.');
      return;
    }

    if (members.length === 0) {
      toast.error('Add or load team/member information before creating a project.');
      return;
    }

    if (isSoloCapstoneFlow && !soloCapstoneConfirmed) {
      toast.error('Confirm the solo capstone acknowledgment before continuing.');
      return;
    }

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
      title: selectedTitle,
      titleProposals: normalizedTitleProposals,
      abstract: form.abstract || undefined,
      keywords: keywordList.length > 0 ? keywordList : undefined,
      academicYear: form.academicYear,
      sectionId: form.sectionId,
      memberRoleAssignments: assignmentPayload,
      allowSoloCapstone: isSoloCapstoneFlow,
      soloCapstoneConfirmed: isSoloCapstoneFlow ? soloCapstoneConfirmed : false,
    });
  };

  const handleMemberRoleChange = (memberId, professionalTitle) => {
    setMemberRoleAssignments((prev) => ({
      ...prev,
      [memberId]: professionalTitle,
    }));
  };

  const handleSoloCapstoneToggle = (checked) => {
    setSoloCapstoneConfirmed(checked);

    if (!isSoloCapstoneFlow || teamMembers.length === 0) {
      return;
    }

    const soloMemberId = teamMembers[0]._id;
    setMemberRoleAssignments((prev) => ({
      ...prev,
      [soloMemberId]: checked ? SOLO_PROFESSIONAL_TITLE : '',
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
              {/* Title Proposals */}
              <div className="space-y-2">
                <Label>Title Proposals * (minimum 5)</Label>
                <div className="space-y-2">
                  {titleProposals.map((proposal, index) => (
                    <div key={`title-proposal-${index}`} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selectedTitleProposal"
                        checked={selectedTitleIndex === index}
                        onChange={() => setSelectedTitleIndex(index)}
                        className="h-4 w-4"
                        aria-label={`Select proposal ${index + 1} as primary title`}
                      />
                      <Input
                        placeholder={`Proposal ${index + 1}`}
                        value={proposal}
                        onChange={(e) => handleTitleProposalChange(index, e.target.value)}
                        required={index < 5}
                        minLength={10}
                        maxLength={300}
                      />
                      {titleProposals.length > 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeTitleProposal(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Choose one proposal as the primary title for submission.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTitleProposal}
                    disabled={titleProposals.length >= 10}
                  >
                    Add Proposal
                  </Button>
                </div>
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
                  {isSoloCapstoneFlow
                    ? 'Solo capstone mode is available. Assign your professional capstone title and confirm acknowledgment.'
                    : 'Assign one professional capstone title to each team member, including yourself.'}
                </p>

                {isTeamLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading team members...
                  </div>
                )}

                {!isTeamLoading && isSoloCapstoneFlow && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">
                          Your client approved solo capstone, but confirmation is required.
                        </p>
                        <ul className="list-disc space-y-1 pl-5 text-xs">
                          <li>Set weekly milestones and include adviser checkpoints.</li>
                          <li>Keep a revision journal to track scope, risks, and decisions.</li>
                          <li>Start with a narrow MVP to avoid overload in later chapters.</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {!isTeamLoading && isSoloCapstoneFlow && (
                  <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={soloCapstoneConfirmed}
                      onChange={(e) => handleSoloCapstoneToggle(e.target.checked)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>
                      I confirm I will proceed as a solo capstone student and accept adviser-guided
                      checkpoints for this project.
                    </span>
                  </label>
                )}

                {!isTeamLoading && teamMembers.length > 0 && (
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
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
                          disabled={isSoloCapstoneFlow}
                          required
                        >
                          <option value="">Select professional capstone title</option>
                          {CAPSTONE_TITLE_VALUES.map((title) => (
                            <option key={title} value={title}>
                              {title}
                            </option>
                          ))}
                        </select>
                        {isSoloCapstoneFlow && (
                          <p className="text-xs text-muted-foreground">
                            Solo capstone uses the professional title that maps to the traditional
                            role &quot;All-Around&quot;.
                          </p>
                        )}
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

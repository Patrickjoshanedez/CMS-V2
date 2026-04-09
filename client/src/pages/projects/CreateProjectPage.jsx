import { useEffect, useMemo, useRef, useState } from 'react';
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
import TitleSimilarityChecker from '@/components/projects/TitleSimilarityChecker';
import { AlertTriangle, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CAPSTONE_TITLE_VALUES, SDG_TAG_SUGGESTIONS } from '@cms/shared';

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
  const [titleProposals, setTitleProposals] = useState(['', '', '', '', '']);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [keywordList, setKeywordList] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [sdgTagList, setSdgTagList] = useState([]);
  const [selectedSdgTag, setSelectedSdgTag] = useState('');
  const [memberRoleAssignments, setMemberRoleAssignments] = useState({});

  const teamMembers = useMemo(() => {
    if (team?.members?.length > 0) {
      return team.members;
    }

    return [];
  }, [team?.members]);

  const hasFinalizedTeam = Boolean(team?.members?.length > 0 && team?.isLocked);
  const needsTeamFinalization = !isTeamLoading && !hasFinalizedTeam;
  const teamDefaultsAppliedRef = useRef(false);

  const {
    data: sections = [],
    isLoading: isSectionsLoading,
    isError: isSectionsError,
    refetch: refetchSections,
  } = useSections(
    { academicYear: form.academicYear || undefined },
    { enabled: Boolean(form.academicYear), refetchOnMount: 'always' },
  );

  const sectionOptions = sections;
  const isAnySectionLoading = isSectionsLoading;
  const isAnySectionError = isSectionsError;

  useEffect(() => {
    if (academicYears.length === 0) {
      return;
    }

    if (!academicYears.includes(form.academicYear)) {
      setForm((prev) => ({
        ...prev,
        academicYear: academicYears[0],
      }));
    }
  }, [academicYears, form.academicYear]);

  // Initialize form defaults from team context once the team is known.
  useEffect(() => {
    if (isTeamLoading || !team || teamDefaultsAppliedRef.current) {
      return;
    }

    setForm((prev) => {
      const updates = {};
      const normalizedTeamSectionId =
        typeof team.sectionId === 'string' ? team.sectionId : team.sectionId?._id;

      // Prefer the team's academic year when available so the section list and selection stay aligned.
      if (team.academicYear && prev.academicYear !== team.academicYear) {
        updates.academicYear = team.academicYear;
      }

      // Pre-fill section from team context to avoid blocking project creation.
      if (normalizedTeamSectionId && !prev.sectionId) {
        updates.sectionId = normalizedTeamSectionId;
      }

      teamDefaultsAppliedRef.current = true;
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [team, isTeamLoading]);

  useEffect(() => {
    // Clear sectionId when sections change AND current selection is no longer valid
    if (form.sectionId && sectionOptions.length > 0) {
      const isValid = sectionOptions.some((section) => section._id === form.sectionId);
      if (!isValid) {
        setForm((prev) => ({ ...prev, sectionId: '' }));
      }
    }
  }, [form.sectionId, sectionOptions]);

  // Refetch sections when academic year changes to ensure newly created sections are shown
  useEffect(() => {
    if (form.academicYear) {
      refetchSections();
    }
  }, [form.academicYear, refetchSections]);

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

  const addSdgTag = () => {
    if (!selectedSdgTag) {
      return;
    }

    if (!sdgTagList.includes(selectedSdgTag)) {
      setSdgTagList((prev) => [...prev, selectedSdgTag]);
    }

    setSelectedSdgTag('');
  };

  const removeSdgTag = (tag) => {
    setSdgTagList((prev) => prev.filter((item) => item !== tag));
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
    const normalizedTitleProposals = [
      ...new Set(titleProposals.map((proposal) => proposal.trim())),
    ].filter(Boolean);

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
      toast.error('Finalize your team before creating a proposal.');
      return;
    }

    if (!hasFinalizedTeam) {
      toast.error('Finalize and lock your team before creating a proposal.');
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

    if (sdgTagList.length === 0) {
      toast.error('Select at least one SDG tag.');
      return;
    }

    createProject.mutate({
      title: selectedTitle,
      titleProposals: normalizedTitleProposals,
      abstract: form.abstract || undefined,
      keywords: keywordList.length > 0 ? keywordList : undefined,
      sdgTags: sdgTagList,
      academicYear: form.academicYear,
      sectionId: form.sectionId,
      memberRoleAssignments: assignmentPayload,
      allowSoloCapstone: false,
      soloCapstoneConfirmed: false,
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
              {needsTeamFinalization && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Finalize and lock your team first. Proposal submission is only available after
                    your team has been completed.
                  </AlertDescription>
                </Alert>
              )}

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

                {/* Real-time Title Similarity Checking */}
                {titleProposals[selectedTitleIndex] && (
                  <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-medium text-blue-900">Title Similarity Check</p>
                    <TitleSimilarityChecker
                      title={titleProposals[selectedTitleIndex]}
                      keywords={keywordList}
                      debounceMs={500}
                    />
                  </div>
                )}
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

              {/* SDG Tags */}
              <div className="space-y-2">
                <Label htmlFor="sdgTagSelect">SDG Tags * (at least 1)</Label>
                <div className="flex gap-2">
                  <select
                    id="sdgTagSelect"
                    value={selectedSdgTag}
                    onChange={(e) => setSelectedSdgTag(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select an SDG tag</option>
                    {SDG_TAG_SUGGESTIONS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" onClick={addSdgTag}>
                    Add
                  </Button>
                </div>
                {sdgTagList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sdgTagList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeSdgTag(tag)}
                          className="rounded-full p-0.5 hover:bg-primary/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                {isAnySectionError ? (
                  <Alert variant="destructive">
                    <AlertDescription className="flex items-center justify-between">
                      <span>Failed to load sections.</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetchSections()}
                        disabled={isAnySectionLoading}
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
                <select
                  id="sectionId"
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={
                    isAnySectionLoading || (isAnySectionError && sectionOptions.length === 0)
                  }
                >
                  <option value="">
                    {isAnySectionLoading
                      ? 'Loading sections...'
                      : isAnySectionError
                        ? 'Error loading sections'
                        : !form.academicYear
                          ? 'Please select an academic year first'
                          : sectionOptions.length === 0
                            ? 'No active sections available. Contact your instructor to create one.'
                            : 'Select a section'}
                  </option>
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
                  Assign one professional capstone title to each team member after your team is
                  finalized and locked.
                </p>

                {isTeamLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading team members...
                  </div>
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
                          disabled={!hasFinalizedTeam}
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

                {!isTeamLoading && !teamMembers.length && (
                  <Alert>
                    <AlertDescription>
                      No finalized team members are available yet. Create and lock your team first
                      to continue.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending || needsTeamFinalization}>
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

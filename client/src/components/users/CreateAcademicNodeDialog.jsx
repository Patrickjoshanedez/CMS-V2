import { useState } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, CalendarDays, Layers, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { YearInput } from '@/components/ui/YearInput';
import { useCreateCourse, useCreateAcademicYear, useCreateSection } from '@/hooks/useAcademics';
import {
  ACADEMIC_TERM_VALUES,
  CAPSTONE_CURRICULUM_MAP,
  inferCapstoneCourseFromSection,
} from '@cms/shared';
import { toast } from 'sonner';

export default function CreateAcademicNodeDialog({ isOpen, onClose, courses = [], years = [] }) {
  const [nodeType, setNodeType] = useState('section'); // 'year' | 'program' | 'section'
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [sectionCode, setSectionCode] = useState('');
  const [sectionCourseId, setSectionCourseId] = useState('');
  const [sectionYear, setSectionYear] = useState('');
  const [sectionTerm, setSectionTerm] = useState('');
  const [sectionCapstoneCourse, setSectionCapstoneCourse] = useState('');

  const createCourse = useCreateCourse({
    onSuccess: () => {
      toast.success('Degree Program / Course created successfully.');
      setCourseCode('');
      setCourseName('');
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create course.');
    },
  });

  const createAcademicYear = useCreateAcademicYear({
    onSuccess: () => {
      toast.success('Academic Year created successfully.');
      setAcademicYear('');
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create academic year.');
    },
  });

  const createSection = useCreateSection({
    onSuccess: () => {
      toast.success('Class Section created successfully.');
      setSectionName('');
      setSectionCode('');
      setSectionCourseId('');
      setSectionYear('');
      setSectionTerm('');
      setSectionCapstoneCourse('');
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create section.');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nodeType === 'program') {
      if (!courseCode.trim() || !courseName.trim()) {
        toast.error('Please enter both course code and course name.');
        return;
      }
      createCourse.mutate({ code: courseCode.trim(), name: courseName.trim() });
    } else if (nodeType === 'year') {
      if (!academicYear.trim()) {
        toast.error('Please enter an academic year.');
        return;
      }
      createAcademicYear.mutate({ year: academicYear.trim() });
    } else if (nodeType === 'section') {
      if (!sectionName.trim() || !sectionCode.trim() || !sectionCourseId || !sectionYear) {
        toast.error('Please fill in all section details.');
        return;
      }
      const normalizedCode = sectionCode.trim().toUpperCase();
      if (!/^T\d{1,5}$/i.test(normalizedCode)) {
        toast.error('Section Code must start with T followed by numbers (e.g. T65, T87).');
        return;
      }
      const cleanCluster =
        sectionName
          .trim()
          .toUpperCase()
          .replace(/.*(\d{1,2}[A-Z]).*/, '$1') || sectionName.trim().toUpperCase();
      const payload = {
        section: cleanCluster,
        code: normalizedCode,
        courseId: sectionCourseId,
        academicYear: sectionYear,
      };
      if (sectionTerm) payload.academicTerm = sectionTerm;
      if (sectionCapstoneCourse) payload.capstoneCourse = Number(sectionCapstoneCourse);
      createSection.mutate(payload);
    }
  };

  const isPending =
    createCourse.isPending || createAcademicYear.isPending || createSection.isPending;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
        showClose={false}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {/* Close Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isPending}
          className="absolute right-4 top-4"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </Button>

        {/* Dialog Header */}
        <DialogHeader className="space-y-1 pr-6 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold">Create Academic Node</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Add an academic level to organize student cohorts, course offerings, and capstone teams.
          </DialogDescription>
        </DialogHeader>

        {/* Level Type Selector Tabs */}
        <Tabs value={nodeType} onValueChange={setNodeType} className="min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger
              value="section"
              className="min-h-11 min-w-0 flex-1 whitespace-normal px-2 text-xs"
            >
              <Layers className="size-3.5 shrink-0" />
              Class Section
            </TabsTrigger>
            <TabsTrigger
              value="program"
              className="min-h-11 min-w-0 flex-1 whitespace-normal px-2 text-xs"
            >
              <BookOpen className="size-3.5 shrink-0" />
              Program
            </TabsTrigger>
            <TabsTrigger
              value="year"
              className="min-h-11 min-w-0 flex-1 whitespace-normal px-2 text-xs"
            >
              <CalendarDays className="size-3.5 shrink-0" />
              School Year
            </TabsTrigger>
          </TabsList>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <TabsContent value="program" className="mt-0 space-y-3">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="node-course-code" className="text-xs font-medium">
                    Program / Course Code
                  </Label>
                  <Input
                    id="node-course-code"
                    placeholder="e.g. BSIT or BSCS"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="node-course-name" className="text-xs font-medium">
                    Full Degree Program Name
                  </Label>
                  <Input
                    id="node-course-name"
                    placeholder="e.g. Bachelor of Science in Information Technology"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="year" className="mt-0 space-y-3">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="node-year" className="text-xs font-medium">
                    Academic Year
                  </Label>
                  <YearInput
                    id="node-year"
                    value={academicYear}
                    onChange={(val) => setAcademicYear(val)}
                    placeholder="e.g. 2025"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Standard format: starting year increments automatically (e.g. 2025 → 2025–2026).
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="section" className="mt-0">
              {(() => {
                const selectedCourse = courses.find((c) => c._id === sectionCourseId);
                const rawClusterMatch = sectionName
                  .trim()
                  .toUpperCase()
                  .match(/\d{1,2}[A-Z]/);
                const clusterDisplay = rawClusterMatch
                  ? rawClusterMatch[0]
                  : sectionName.trim().toUpperCase();
                const effectiveTerm =
                  sectionTerm ||
                  (Number(sectionCapstoneCourse) === 2 ? '2nd Semester' : '1st Semester');
                const inferredCapstoneCourse =
                  Number(sectionCapstoneCourse) ||
                  inferCapstoneCourseFromSection(clusterDisplay, effectiveTerm);
                const curriculumMeta = inferredCapstoneCourse
                  ? CAPSTONE_CURRICULUM_MAP[inferredCapstoneCourse]
                  : null;
                const canonicalPreview =
                  selectedCourse && clusterDisplay
                    ? `${selectedCourse.code}-${clusterDisplay}${
                        sectionCode.trim() ? ` (${sectionCode.trim().toUpperCase()})` : ''
                      }`
                    : null;

                return (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="node-section-course" className="text-xs font-medium">
                        Parent Program / Degree
                      </Label>
                      <Select
                        value={sectionCourseId || undefined}
                        onValueChange={setSectionCourseId}
                      >
                        <SelectTrigger
                          id="node-section-course"
                          aria-label="Parent Program / Degree"
                          aria-required="true"
                          className="text-xs"
                        >
                          <SelectValue placeholder="Select Degree Program (e.g. BSIT)..." />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((course) => (
                            <SelectItem key={course._id} value={course._id}>
                              {course.code} — {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="node-section-name" className="text-xs font-medium">
                          Section Block (e.g. 3A, 4A)
                        </Label>
                        <Input
                          id="node-section-name"
                          placeholder="e.g. 3A or 4A"
                          value={sectionName}
                          onChange={(e) => setSectionName(e.target.value)}
                          pattern="^([A-Za-z]{2,6}\s*-?\s*)?\d{1,2}[A-Za-z]$"
                          title="Format: Year + Cluster (e.g. 3A, 4A)"
                          className="h-9 text-xs font-mono"
                          required
                        />
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground">3A</span> = 3rd Yr Cluster
                          A, <span className="font-semibold text-foreground">4A</span> = 4th Yr
                          Cluster A
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="node-section-code" className="text-xs font-medium">
                          Section Code (e.g. T65)
                        </Label>
                        <Input
                          id="node-section-code"
                          placeholder="e.g. T65 or T87"
                          value={sectionCode}
                          onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                          pattern="^T\d{1,5}$"
                          title="Official BukSU Section Code starting with T followed by numbers (e.g. T65, T87)"
                          className="h-9 text-xs font-mono uppercase"
                          required
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Starts with <span className="font-semibold text-foreground">T</span> +
                          digits (e.g. <span className="font-semibold text-foreground">T65</span>,{' '}
                          <span className="font-semibold text-foreground">T87</span>)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="node-section-year" className="text-xs font-medium">
                          Academic Year
                        </Label>
                        <Select value={sectionYear || undefined} onValueChange={setSectionYear}>
                          <SelectTrigger
                            id="node-section-year"
                            aria-label="Academic Year"
                            aria-required="true"
                            className="text-xs"
                          >
                            <SelectValue placeholder="Select Academic Year..." />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="node-section-term" className="text-xs font-medium">
                          Academic Semester
                        </Label>
                        <Select
                          value={sectionTerm || '__auto__'}
                          onValueChange={(value) =>
                            setSectionTerm(value === '__auto__' ? '' : value)
                          }
                        >
                          <SelectTrigger
                            id="node-section-term"
                            aria-label="Academic Semester"
                            className="text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__auto__">Auto ({effectiveTerm})</SelectItem>
                            {ACADEMIC_TERM_VALUES.map((term) => (
                              <SelectItem key={term} value={term}>
                                {term}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="node-section-capstone" className="text-xs font-medium">
                        Capstone Course Track (Curriculum Alignment)
                      </Label>
                      <Select
                        value={sectionCapstoneCourse || '__auto__'}
                        onValueChange={(value) => {
                          const val = value === '__auto__' ? '' : value;
                          setSectionCapstoneCourse(val);
                          if (val === '1' || val === '3') setSectionTerm('1st Semester');
                          if (val === '2') setSectionTerm('2nd Semester');
                        }}
                      >
                        <SelectTrigger
                          id="node-section-capstone"
                          aria-label="Capstone Course Track"
                          className="text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">
                            {curriculumMeta
                              ? `Auto-Detected: ${curriculumMeta.courseTitle} (${curriculumMeta.curriculumLabel})`
                              : 'Auto-detect from Section Block & Semester'}
                          </SelectItem>
                          <SelectItem value="1">Capstone 1 — 3rd Year • 1st Semester</SelectItem>
                          <SelectItem value="2">Capstone 2 — 3rd Year • 2nd Semester</SelectItem>
                          <SelectItem value="3">Capstone 3 — 4th Year • 1st Semester</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Canonical Section Preview */}
                    {canonicalPreview && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-primary flex items-center gap-1">
                            Canonical Section Preview:
                          </span>
                          <span className="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 font-mono font-bold text-primary text-xs">
                            {canonicalPreview}
                          </span>
                        </div>
                        {curriculumMeta && (
                          <p className="text-[11px] font-medium text-foreground">
                            Track: {curriculumMeta.courseTitle} ({curriculumMeta.curriculumLabel})
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Students will select{' '}
                          <span className="font-semibold text-foreground">{canonicalPreview}</span>{' '}
                          and the hierarchy will display Section Block{' '}
                          <span className="font-semibold text-foreground">
                            {selectedCourse?.code}-{clusterDisplay}
                          </span>{' '}
                          attached with Section Code{' '}
                          <span className="font-mono font-semibold text-foreground">
                            {sectionCode.trim().toUpperCase() || 'T--'}
                          </span>
                          .
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="gap-1.5 text-xs bg-primary"
              >
                {isPending && <Spinner />}
                Create Academic Node
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

CreateAcademicNodeDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  courses: PropTypes.array,
  years: PropTypes.array,
};

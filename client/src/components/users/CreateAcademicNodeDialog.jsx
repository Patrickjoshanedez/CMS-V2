import { useState } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, CalendarDays, Layers, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { YearInput } from '@/components/ui/YearInput';
import { useCreateCourse, useCreateAcademicYear, useCreateSection } from '@/hooks/useAcademics';
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
      createSection.mutate({
        section: sectionName.trim(),
        code: sectionCode.trim(),
        courseId: sectionCourseId,
        academicYear: sectionYear,
      });
    }
  };

  const isPending =
    createCourse.isPending || createAcademicYear.isPending || createSection.isPending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="academic-node-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Dialog Header */}
        <div className="space-y-1 pr-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <h3 id="academic-node-title" className="text-base font-semibold text-foreground">
              Create Academic Node
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Add an academic level to organize student cohorts, course offerings, and capstone teams.
          </p>
        </div>

        {/* Level Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setNodeType('section')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all ${
              nodeType === 'section'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Class Section
          </button>
          <button
            type="button"
            onClick={() => setNodeType('program')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all ${
              nodeType === 'program'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Program
          </button>
          <button
            type="button"
            onClick={() => setNodeType('year')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all ${
              nodeType === 'year'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            School Year
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {nodeType === 'program' && (
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
          )}

          {nodeType === 'year' && (
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
          )}

          {nodeType === 'section' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="node-section-name" className="text-xs font-medium">
                    Section Name / Cluster
                  </Label>
                  <Input
                    id="node-section-name"
                    placeholder="e.g. 3C or 4A"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    pattern="\d{1,2}[A-Za-z]"
                    title="Format: Year + Cluster (e.g. 1A, 2B, 3C)"
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="node-section-code" className="text-xs font-medium">
                    Section Code
                  </Label>
                  <Input
                    id="node-section-code"
                    placeholder="e.g. T88 or S12"
                    value={sectionCode}
                    onChange={(e) => setSectionCode(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="node-section-course" className="text-xs font-medium">
                  Parent Program / Degree
                </Label>
                <select
                  id="node-section-course"
                  value={sectionCourseId}
                  onChange={(e) => setSectionCourseId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  required
                >
                  <option value="">Select Degree Program...</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="node-section-year" className="text-xs font-medium">
                  Academic Year
                </Label>
                <select
                  id="node-section-year"
                  value={sectionYear}
                  onChange={(e) => setSectionYear(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  required
                >
                  <option value="">Select Academic Year...</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Academic Node
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateAcademicNodeDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  courses: PropTypes.array,
  years: PropTypes.array,
};

import { useState } from 'react';
import { CheckCircle2, Ellipsis } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Progress } from '@/components/ui/Progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Separator } from '@/components/ui/Separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/Sheet';
import Skeleton from '@/components/ui/Skeleton';
import Slider from '@/components/ui/Slider';
import Spinner from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import ActionDoneMatrixSection from '@/components/projects/ActionDoneMatrixSection';
import AutoExpandingTextarea from '@/components/projects/AutoExpandingTextarea';
import ConsultationLogWidget from '@/components/projects/ConsultationLogWidget';
import { ADMTableView } from '@/components/projects/adm/ADMTableView';
import FullscreenToolbar from '@/components/projects/presentation/FullscreenToolbar';
import ProposalSlideCanvas from '@/components/projects/ProposalSlideCanvas';

const sectionClass = 'scroll-mt-24 space-y-4';
const cardClass = 'min-w-0';

function ShowcaseSection({ id, title, description, children }) {
  return (
    <section id={id} className={sectionClass} aria-labelledby={`${id}-heading`}>
      <div className="space-y-1">
        <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ShowcaseCard({ title, description, children, className = '' }) {
  return (
    <Card className={`${cardClass} ${className}`}>
      <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

export default function ShadcnComponentShowcase() {
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [priority, setPriority] = useState('standard');
  const [density, setDensity] = useState(65);
  const [previewNotes, setPreviewNotes] = useState(
    'Revised the problem statement and clarified the local study context.',
  );

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">BukSU CMS interface lab</p>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Shared components and interaction states
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Development only
            </Badge>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)] lg:items-end">
            <div className="space-y-3">
              <Badge variant="outline">Design system</Badge>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
                One consistent interface for every capstone workflow.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                Review the shared shadcn-style building blocks, theme tokens, responsive behavior,
                and representative loading and interaction states used throughout BukSU CMS.
              </p>
            </div>
            <Alert variant="info" className="min-w-0">
              <AlertTitle>Safe preview</AlertTitle>
              <AlertDescription>
                This development-only page uses local examples and does not submit academic changes.
              </AlertDescription>
            </Alert>
          </div>

          <Tabs defaultValue="foundations" className="space-y-6">
            <TabsList aria-label="Component groups" className="w-full sm:w-auto">
              <TabsTrigger value="foundations">Foundations</TabsTrigger>
              <TabsTrigger value="forms">Forms</TabsTrigger>
              <TabsTrigger value="overlays">Overlays & feedback</TabsTrigger>
              <TabsTrigger value="workflows">Workflow surfaces</TabsTrigger>
            </TabsList>

            <TabsContent value="foundations" className="space-y-8">
              <ShowcaseSection
                id="actions-and-status"
                title="Actions and status"
                description="Clear hierarchy, visible focus, disabled feedback, and readable status labels."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ShowcaseCard
                    title="Buttons"
                    description="Primary, secondary, quiet, destructive, and pending feedback."
                  >
                    <div className="flex flex-wrap gap-2">
                      <Button>Save changes</Button>
                      <Button variant="secondary">Review</Button>
                      <Button variant="outline">View details</Button>
                      <Button variant="ghost">Dismiss</Button>
                      <Button variant="destructive">Remove</Button>
                      <Button variant="outline" disabled>
                        Unavailable
                      </Button>
                      <Button loading loadingText="Saving">
                        Save
                      </Button>
                    </div>
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Badges"
                    description="Status uses text and semantic color together."
                  >
                    <div className="flex flex-wrap gap-2">
                      <Badge>In progress</Badge>
                      <Badge variant="secondary">Draft</Badge>
                      <Badge variant="outline">Needs review</Badge>
                      <Badge variant="destructive">Overdue</Badge>
                      <Badge variant="success">Approved</Badge>
                    </div>
                    <div className="flex items-center gap-3 rounded-md border border-border/70 p-3">
                      <Avatar>
                        <AvatarFallback>MS</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">Maria Santos</p>
                        <p className="text-xs text-muted-foreground">Student researcher</p>
                      </div>
                      <Badge variant="secondary">Member</Badge>
                    </div>
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Alerts"
                    description="Status messages with explicit meaning and readable copy."
                  >
                    <Alert variant="success">
                      <AlertTitle>Saved</AlertTitle>
                      <AlertDescription>Your draft is ready for adviser review.</AlertDescription>
                    </Alert>
                    <Alert variant="warning">
                      <AlertTitle>Action needed</AlertTitle>
                      <AlertDescription>
                        Complete the required fields before submitting.
                      </AlertDescription>
                    </Alert>
                  </ShowcaseCard>
                </div>
              </ShowcaseSection>

              <ShowcaseSection
                id="surfaces-and-loading"
                title="Surfaces and loading"
                description="Stable page geometry, restrained surfaces, and reduced-motion-aware progress."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <ShowcaseCard
                    title="Loading states"
                    description="Skeleton, spinner, determinate and indeterminate progress."
                  >
                    <div className="space-y-3" aria-label="Loading examples">
                      <div
                        className="flex items-center gap-3"
                        role="status"
                        aria-label="Loading project summary"
                      >
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-2/5" />
                          <Skeleton className="h-3 w-3/5" />
                        </div>
                        <Spinner />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Manuscript review</span>
                          <span className="text-muted-foreground">63%</span>
                        </div>
                        <Progress value={63} aria-label="Manuscript review progress" />
                        <Progress indeterminate aria-label="Loading updated project data" />
                      </div>
                    </div>
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Surface and table"
                    description="Border, card, separator, and long content behavior."
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">Capstone manuscript</p>
                        <p className="text-xs text-muted-foreground">Updated just now</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Open manuscript actions"
                          >
                            <Ellipsis className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Manuscript</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Open details</DropdownMenuItem>
                          <DropdownMenuItem disabled>Archive unavailable</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Separator />
                    <div className="overflow-x-auto rounded-md border border-border/70">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chapter</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Version</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Chapter 1</TableCell>
                            <TableCell>
                              <Badge variant="success">Approved</Badge>
                            </TableCell>
                            <TableCell className="text-right">v3</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Chapter 2</TableCell>
                            <TableCell>
                              <Badge variant="warning">In review</Badge>
                            </TableCell>
                            <TableCell className="text-right">v2</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </ShowcaseCard>
                </div>
              </ShowcaseSection>
            </TabsContent>

            <TabsContent value="forms" className="space-y-8">
              <ShowcaseSection
                id="form-controls"
                title="Form controls"
                description="Labels, help text, accessible state, and responsive controls preserve familiar behavior."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <ShowcaseCard
                    title="Text fields"
                    description="Labels remain visible and errors have room to wrap."
                  >
                    <div className="space-y-2">
                      <Label htmlFor="showcase-title">Project title</Label>
                      <Input
                        id="showcase-title"
                        defaultValue="Community health monitoring system"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use the title approved by your committee.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="showcase-notes">Reviewer note</Label>
                      <Textarea
                        id="showcase-notes"
                        placeholder="Add a clear, actionable note…"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="showcase-disabled">Read-only example</Label>
                      <Input id="showcase-disabled" value="Student ID verified" disabled readOnly />
                    </div>
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Choices"
                    description="Checkboxes, radios, switches, selects, and range controls."
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="showcase-confirm"
                        checked={checked}
                        onCheckedChange={setChecked}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="showcase-confirm">
                          I reviewed the submission checklist
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          This is a local preview state.
                        </p>
                      </div>
                    </div>
                    <RadioGroup
                      value={priority}
                      onValueChange={setPriority}
                      aria-label="Review priority"
                      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                    >
                      {['standard', 'urgent', 'scheduled'].map((value) => (
                        <Label
                          key={value}
                          htmlFor={`priority-${value}`}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 p-3 capitalize"
                        >
                          <RadioGroupItem id={`priority-${value}`} value={value} />
                          {value}
                        </Label>
                      ))}
                    </RadioGroup>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 p-3">
                      <Label htmlFor="showcase-updates">Email me review updates</Label>
                      <Switch
                        id="showcase-updates"
                        checked={enabled}
                        onCheckedChange={setEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="showcase-course">Academic program</Label>
                      <Select defaultValue="bsit">
                        <SelectTrigger id="showcase-course">
                          <SelectValue placeholder="Choose a program" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bsit">BS Information Technology</SelectItem>
                          <SelectItem value="bsemc">
                            BS Entertainment and Multimedia Computing
                          </SelectItem>
                          <SelectItem value="other" disabled>
                            Other programs (unavailable)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between gap-3 text-sm">
                        <Label htmlFor="showcase-density">Preview density</Label>
                        <span className="text-muted-foreground">{density}%</span>
                      </div>
                      <Slider
                        id="showcase-density"
                        min={25}
                        max={100}
                        step={5}
                        value={density}
                        onChange={(event) => setDensity(Number(event.target.value))}
                        aria-label="Preview density"
                      />
                    </div>
                  </ShowcaseCard>
                </div>
              </ShowcaseSection>
            </TabsContent>

            <TabsContent value="overlays" className="space-y-8">
              <ShowcaseSection
                id="overlays-and-disclosure"
                title="Overlays and disclosure"
                description="Dialog, sheet, popover, tooltip, accordion, and tabs use keyboard-friendly primitives."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ShowcaseCard
                    title="Dialog and sheet"
                    description="Focus stays inside an open overlay and returns when it closes."
                  >
                    <div className="flex flex-wrap gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>Open dialog</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Review the update</DialogTitle>
                            <DialogDescription>
                              This preview does not submit or save data.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button>Close preview</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline">Open mobile sheet</Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                          <div className="space-y-2">
                            <SheetTitle>Project details</SheetTitle>
                            <SheetDescription>Responsive side panel preview.</SheetDescription>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Long names wrap cleanly and the content can scroll.
                          </p>
                          <div className="flex justify-end pt-2">
                            <SheetClose asChild>
                              <Button variant="outline">Done</Button>
                            </SheetClose>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Popover and tooltip"
                    description="Small contextual help remains available by keyboard."
                  >
                    <div className="flex flex-wrap gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline">More information</Button>
                        </PopoverTrigger>
                        <PopoverContent className="space-y-2">
                          <p className="font-medium">Adviser review</p>
                          <p className="text-sm text-muted-foreground">
                            Your adviser reviews each chapter in order.
                          </p>
                        </PopoverContent>
                      </Popover>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="secondary">Focus or hover</Button>
                        </TooltipTrigger>
                        <TooltipContent>Help text stays readable in either theme.</TooltipContent>
                      </Tooltip>
                    </div>
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Disclosure"
                    description="Progressive detail stays navigable with a keyboard."
                  >
                    <Accordion type="single" collapsible>
                      <AccordionItem value="requirements">
                        <AccordionTrigger>What is required?</AccordionTrigger>
                        <AccordionContent>
                          Submit the current chapter file and include the required supporting
                          material.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="support">
                        <AccordionTrigger>Where can I get help?</AccordionTrigger>
                        <AccordionContent>
                          Contact your assigned adviser or capstone instructor.
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </ShowcaseCard>
                </div>
              </ShowcaseSection>
            </TabsContent>

            <TabsContent value="workflows" className="space-y-8">
              <ShowcaseSection
                id="workflow-surfaces"
                title="Workflow surfaces"
                description="Representative academic workflow components use local preview data and inert callbacks."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <ShowcaseCard
                    title="Action Done Matrix entry"
                    description="The existing entry card and status remain visible; preview actions are not connected to an API."
                  >
                    <ActionDoneMatrixSection
                      project={{
                        _id: 'showcase-project',
                        title: 'Community Health Monitoring System',
                        adm: { CAPSTONE_1: { remarks: [] } },
                      }}
                      milestone="CAPSTONE_1"
                      isFaculty
                      user={{ _id: 'showcase-faculty', role: 'faculty' }}
                      onRefresh={() => {}}
                    />
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Secretary review table"
                    description="Institutional table geometry and wrapped committee recommendations."
                  >
                    <div className="overflow-hidden rounded-md bg-white p-2 text-black sm:p-3">
                      <ADMTableView
                        pageRows={[
                          {
                            _id: 'showcase-row',
                            panelName: 'Dr. Maria Santos',
                            suggestion: 'Clarify the study participants and recruitment criteria.',
                            actionDone: 'Updated the methodology and participant criteria.',
                            pageNumbers: '18–19',
                          },
                        ]}
                        displayedRows={[]}
                        canAddRow={false}
                        isReadOnly
                      />
                    </div>
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Autosizing academic note"
                    description="Text expansion and save feedback in a local controlled example."
                  >
                    <AutoExpandingTextarea
                      id="showcase-auto-expanding-note"
                      label="Action taken"
                      value={previewNotes}
                      onChange={(event) => setPreviewNotes(event.target.value)}
                      minRows={2}
                      savingStatus="saved"
                    />
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Consultation history"
                    description="Existing signed records and the local add-form state. Do not submit this preview."
                  >
                    <ConsultationLogWidget project={{ _id: 'showcase-project' }} isStudent />
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Presentation controls"
                    description="Toolbar labels, slide count, and responsive action controls."
                    className="lg:col-span-2"
                  >
                    <div className="overflow-hidden rounded-lg border border-border/70">
                      <FullscreenToolbar
                        title="Community Health Monitoring System"
                        teamName="Team HealthTrack"
                        activeSlideIndex={1}
                        totalSlides={8}
                        onIncreaseFontSize={() => {}}
                        onDecreaseFontSize={() => {}}
                        onResetFontSize={() => {}}
                        onToggleEditMode={() => {}}
                        onExportPptx={() => {}}
                        onExportPdf={() => {}}
                        onToggleNativeFullscreen={() => {}}
                        onClose={() => {}}
                      />
                    </div>
                  </ShowcaseCard>
                  <ShowcaseCard
                    title="Proposal slide canvas"
                    description="Official 16:9 slide composition with local content and institutional branding."
                    className="lg:col-span-2"
                  >
                    <ProposalSlideCanvas
                      slide={{
                        id: 2,
                        numberStr: '02',
                        category: 'Problem Statement & Literature Gap',
                        title: 'Community health monitoring in rural barangays',
                        content:
                          'Local health workers need timely, reliable records to identify emerging community health concerns.',
                        type: 'statement',
                      }}
                      proponents="Maria Santos, Juan Dela Cruz"
                      teamName="Team HealthTrack"
                    />
                  </ShowcaseCard>
                </div>
              </ShowcaseSection>
            </TabsContent>
          </Tabs>

          <footer className="border-t border-border/70 pt-5 text-sm text-muted-foreground">
            <p>
              Development showcase · Built from the shared CMS component library · No workflow
              actions are connected.
            </p>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}

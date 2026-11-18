# In-Depth Investigation Analysis: Features 10 & 11 (Form Chunking & Responsive Table Overflow)

**Investigator:** `explorer_m2_3` (Teamwork Explorer)  
**Parent Sub-Orchestrator:** `sub_orch_m2` (`fcb4abc4-612c-444c-a031-c0d3c2b99c4c`)  
**Target Milestone:** Milestone 2 (UI Sizing, Spacing & Cognitive Ergonomics Overhaul)  
**Date:** 2026-11-13 (UTC) / 2026-11-14 (Local)  
**Reference Skills:** `cognitive-ergonomics-ux`, `cms-ui-consistency-library`, `modern-web-guidance`, `frontend-patterns`  

---

## Executive Summary

This investigation provides a comprehensive, code-level analysis and precision implementation plan for:
1. **Feature 10: Form Chunking (Cowan 4-Chunking Heuristic)** across 5 dense forms (>4–5 inputs) in `UsersPage.jsx`, `ExistingCapstoneUploadPage.jsx`, `ProfilePage.jsx`, `ScheduleDefenseModal.jsx`, and `MilestoneDeadlinesModal.jsx`.
2. **Feature 11: Responsive Table Overflow Wrappers** across 6 critical data and rubric tables in `EvaluationPanel.jsx`, `EvaluationWorkspace.jsx`, `PlagiarismReport.jsx`, `VersionCompare.jsx`, `DynamicChartWidget.jsx`, and `SecretaryMinutesDocumentSheet.jsx`.

All proposed changes strictly adhere to BukSU CMS-V2 design system tokens (`border-border/60`, `bg-background`, `text-foreground`, `bg-muted/20`), Cowan's (2001) working memory limit of 3–4 items per perceptual group, Arnheim's (1954) visual fieldset hierarchy, and WCAG 2.2 AA programmatic form accessibility.

---

## 1. Feature 10: Form Chunking (Cowan 4-Chunking & Cognitive Ergonomics)

### 1.1 Cognitive Ergonomics Foundations
Under cognitive load theory and Cowan (2001) empirical working memory limits ($4 \pm 1$ items), presenting more than 4–5 unchunked form inputs in a flat stack causes:
- Heightened cognitive friction and decision fatigue.
- Inability to quickly locate and verify field subsets.
- Screen reader disorientation due to lack of programmatic groupings.

The standardized CMS-V2 semantic chunking pattern requires:
```jsx
<fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
  <legend className="text-sm font-semibold text-foreground px-2">
    [Chunk Label]
  </legend>
  {/* 2 to 4 semantically related inputs */}
</fieldset>
```

---

### 1.2 Target 1: `UsersPage.jsx` (`CreateUserForm`)

- **File Path:** `client/src/pages/users/UsersPage.jsx`
- **Location:** Lines 1327–1430 (`CreateUserForm` component)
- **Current State:** A single flat `<form onSubmit={handleSubmit} className="space-y-4">` containing 6 inputs:
  1. `firstName` (Line 1331)
  2. `middleName` (Line 1344)
  3. `lastName` (Line 1356)
  4. `email` (Line 1370)
  5. `password` (Line 1383)
  6. `role` (Line 1398)

#### Proposed Chunking Design (2 Semantic Fieldsets):
1. **Fieldset 1: Personal Identity** (3 inputs)
   - Fields: First Name, Middle Name, Last Name
   - Legend: `Personal Identity`
   - Layout: `<div className="grid gap-4 sm:grid-cols-3">`
2. **Fieldset 2: Account Credentials & Access** (3 inputs)
   - Fields: Email Address, Password, Role Select
   - Legend: `Account Credentials & Access`
   - Layout: `<div className="grid gap-4 sm:grid-cols-2">` for Email and Password, followed by Role Select

#### Concrete Code Specification:
```jsx
// BEFORE (UsersPage.jsx:1327):
<form onSubmit={handleSubmit} className="space-y-4">
  <div className="grid gap-4 sm:grid-cols-3">
    {/* firstName, middleName, lastName */}
  </div>
  <div className="grid gap-4 sm:grid-cols-2">
    {/* email, password */}
  </div>
  <div className="space-y-2">
    {/* role */}
  </div>
  ...
</form>

// AFTER:
<form onSubmit={handleSubmit} className="space-y-5">
  <fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
    <legend className="text-sm font-semibold text-foreground px-2">
      Personal Identity
    </legend>
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name *</Label>
        <Input id="firstName" ... />
      </div>
      <div className="space-y-2">
        <Label htmlFor="middleName">Middle Name</Label>
        <Input id="middleName" ... />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name *</Label>
        <Input id="lastName" ... />
      </div>
    </div>
  </fieldset>

  <fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
    <legend className="text-sm font-semibold text-foreground px-2">
      Account Credentials & Access
    </legend>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" ... />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input id="password" type="password" ... />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="role">Role *</Label>
      <Select value={formData.role} ...>
        ...
      </Select>
    </div>
  </fieldset>

  <div className="flex justify-end gap-3 pt-2">
    <Button type="button" variant="outline" onClick={onCancel} ...>Cancel</Button>
    <Button type="submit" loading={createUser.isPending}>Create User</Button>
  </div>
</form>
```

---

### 1.3 Target 2: `ExistingCapstoneUploadPage.jsx`

- **File Path:** `client/src/pages/archive/ExistingCapstoneUploadPage.jsx`
- **Location:** Lines 1618–1963 (Section 3: "Verify Metadata")
- **Current State:** 8 individual metadata inputs rendered flat inside a `space-y-5` container, each wrapped in an identical `<div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">`:
  1. `title` (Lines 1628–1669)
  2. `abstract` (Lines 1671–1714)
  3. `authors` (Lines 1715–1757)
  4. `year` - Publication Year (Lines 1758–1800)
  5. `academicYear` - Select (Lines 1801–1828)
  6. `doi` (Lines 1830–1872)
  7. `venue` - Publication Venue (Lines 1873–1919)
  8. `keywords` (Lines 1920–1962)

#### Proposed Chunking Design (3 Semantic Fieldsets):
1. **Fieldset 1: Document Publication Identity** (3 items)
   - Fields: Title, Authors, Publication Year & Academic Year (paired)
   - Legend: `Document Publication Identity`
2. **Fieldset 2: Content Summary & Classification** (2 items)
   - Fields: Abstract (Textarea with rescan/feedback), Keywords (Input with rescan/feedback)
   - Legend: `Content Summary & Classification`
3. **Fieldset 3: Bibliographic & Indexing Identifiers** (2 items)
   - Fields: DOI, Publication Venue
   - Legend: `Bibliographic & Indexing Details`

#### Concrete Code Specification:
```jsx
// BEFORE (ExistingCapstoneUploadPage.jsx:1627):
<div className="space-y-5">
  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">Title...</div>
  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">Abstract...</div>
  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">Authors...</div>
  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">Publication Year...</div>
  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">Academic Year...</div>
  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">DOI...</div>
  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">Publication Venue...</div>
  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">Keywords...</div>
</div>

// AFTER:
<div className="space-y-6">
  {/* Fieldset 1: Document Publication Identity */}
  <fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
    <legend className="text-sm font-semibold text-foreground px-2">
      Document Publication Identity
    </legend>
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      {renderLabelWithConfidence('Title', 'title')}
      <Input id="title" ... />
      {/* Title Rescan & Feedback Buttons */}
    </div>
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      {renderLabelWithConfidence('Authors', 'authors')}
      <Input id="authors" ... />
      {/* Authors Rescan & Feedback Buttons */}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        {renderLabelWithConfidence('Publication Year', 'year')}
        <Input id="year" ... />
        {/* Year Rescan Buttons */}
      </div>
      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        <Label htmlFor="academicYear">Academic Year</Label>
        <Select id="academicYear" ...>...</Select>
      </div>
    </div>
  </fieldset>

  {/* Fieldset 2: Content Summary & Classification */}
  <fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
    <legend className="text-sm font-semibold text-foreground px-2">
      Content Summary & Classification
    </legend>
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      {renderLabelWithConfidence('Abstract', 'abstract')}
      <Textarea id="abstract" ... />
      {/* Abstract Rescan & Feedback Buttons */}
    </div>
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      {renderLabelWithConfidence('Keywords', 'keywords')}
      <Input id="keywords" ... />
      {/* Keywords Rescan & Feedback Buttons */}
    </div>
  </fieldset>

  {/* Fieldset 3: Bibliographic & Indexing Details */}
  <fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
    <legend className="text-sm font-semibold text-foreground px-2">
      Bibliographic & Indexing Details
    </legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        {renderLabelWithConfidence('DOI', 'doi')}
        <Input id="doi" ... />
        {/* DOI Rescan Buttons */}
      </div>
      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        {renderLabelWithConfidence('Publication Venue', 'venue')}
        <Input id="venue" ... />
        {/* Venue Rescan Buttons */}
      </div>
    </div>
  </fieldset>
</div>
```

---

### 1.4 Target 3: `ProfilePage.jsx`

- **File Path:** `client/src/pages/profile/ProfilePage.jsx`
- **Location:**
  - Card 1: "Account Details" (Lines 349–434) — 5 fields (`firstName`, `middleName`, `lastName`, `email`, `role`).
  - Card 2: "Academic Info" for Students (Lines 520–774) — 10+ controls and cards flatly listed under `<CardContent className="space-y-4">`:
    1. Student ID Input (Line 522)
    2. Year & Section Select (Line 536)
    3. Section Block & T-Code Grid (Line 608)
    4. Degree Program, Academic Term Select, Academic Year, Active Capstone Track Grid (Line 623)
    5. Multi-Semester Capstone Progression card (Line 666)
    6. Assigned Instructor Select (Line 717)

#### Proposed Chunking Design:
- **In "Account Details":**
  1. `Personal Identity` fieldset: `firstName`, `middleName`, `lastName` (grid of 3).
  2. `Institutional Credentials` fieldset: `email` (readonly), `role` (readonly).
- **In "Academic Info":**
  1. **Fieldset 1: Student Identification & Section**
     - Inputs: Student ID (`profile-student-id`), Year and Section Select (`profile-section`), Section Block and Section Code indicators.
     - Legend: `Student Identification & Section`
  2. **Fieldset 2: Academic Term & Capstone Progression**
     - Inputs: Degree Program, Academic Term Select, Academic Year, Active Capstone Track, and the Multi-Semester Capstone Progression track overview.
     - Legend: `Academic Term & Capstone Track`
  3. **Fieldset 3: Instructional Supervision**
     - Inputs: Assigned Instructor Select (`profile-instructor`).
     - Legend: `Instructional Supervision`

#### Concrete Code Specification (Academic Info section):
```jsx
// ProfilePage.jsx:520:
<CardContent className="space-y-5">
  {/* Fieldset 1: Student Identification & Section */}
  <fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
    <legend className="text-sm font-semibold text-foreground px-2">
      Student Identification & Section
    </legend>
    <div className="space-y-2">
      <Label htmlFor="profile-student-id">Student ID *</Label>
      <Input id="profile-student-id" value={studentId} ... />
    </div>
    <div className="space-y-2">
      <Label htmlFor="profile-section">Year and Section *</Label>
      <Select value={sectionId} ...>...</Select>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Section Block</Label>
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium">
          {selectedSectionBlock || '—'}
        </p>
      </div>
      <div className="space-y-2">
        <Label>Section Code (T-Code)</Label>
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-sm font-semibold text-primary">
          {selectedSectionTCode || '—'}
        </p>
      </div>
    </div>
  </fieldset>

  {/* Fieldset 2: Academic Term & Capstone Track */}
  <fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
    <legend className="text-sm font-semibold text-foreground px-2">
      Academic Term & Capstone Track
    </legend>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Degree Program</Label>
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {selectedSection?.courseId?.name || selectedSection?.courseId?.code || '—'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-academic-term">Academic Term *</Label>
        <Select value={academicTerm} onValueChange={setAcademicTerm}>...</Select>
      </div>
      <div className="space-y-2">
        <Label>Academic Year</Label>
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {selectedSection?.academicYear || '—'}
        </p>
      </div>
      <div className="space-y-2">
        <Label>Active Capstone Track</Label>
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium">
          {selectedCapstoneMeta?.courseTitle || '—'}
        </p>
      </div>
    </div>
    {/* Multi-Semester Capstone 1–3 Progression Overview */}
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
      ...
    </div>
  </fieldset>

  {/* Fieldset 3: Instructional Supervision */}
  <fieldset className="space-y-4 rounded-lg border border-border/60 p-4">
    <legend className="text-sm font-semibold text-foreground px-2">
      Instructional Supervision
    </legend>
    <div className="space-y-2">
      <Label htmlFor="profile-instructor">Instructor *</Label>
      <Select value={instructorId} onValueChange={setInstructorId}>...</Select>
    </div>
  </fieldset>
</CardContent>
```

---

### 1.5 Target 4: `ScheduleDefenseModal.jsx`

- **File Path:** `client/src/components/defense/ScheduleDefenseModal.jsx`
- **Location:** Lines 282–533 (Modal scrollable form body)
- **Current State:** A flat `space-y-4` containing 6 interactive inputs and 2 information panels:
  1. Committee Readiness advisory banner (Line 287)
  2. Defense Type Select (`defense-type`, Line 328)
  3. Defense Round Select (`defense-round`, Line 350)
  4. Hearing/Defense Date Input (`defense-date`, Line 374)
  5. Time Slot Select (`defense-time`, Line 392) + quick-slot buttons (Line 412)
  6. Venue Select (`defense-venue`, Line 435)
  7. Target Client / Industry Partner (`defense-client`, Line 459)
  8. Hearing Committee Roster Snapshot (Line 475)

#### Proposed Chunking Design (3 Semantic Fieldsets):
1. **Fieldset 1: Hearing Classification**
   - Fields: Defense Type Select (`defense-type`), Defense Round Select (`defense-round`)
   - Legend: `Hearing Classification & Round`
2. **Fieldset 2: Schedule & Venue Logistics**
   - Fields: Date Input (`defense-date`), Time Slot Select (`defense-time`) with quick-slot chips, Venue Select (`defense-venue`)
   - Legend: `Schedule & Venue Logistics`
3. **Fieldset 3: Stakeholders & Committee Alignment**
   - Fields: Target Client / Industry Partner (`defense-client`), Hearing Committee Roster preview card
   - Legend: `Stakeholders & Committee Roster`

#### Concrete Code Specification:
```jsx
// ScheduleDefenseModal.jsx:282:
<form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 text-xs">
  {/* Committee Readiness Banner (kept at top for institutional warning prominence) */}
  {!hasFullCommittee && ( ... )}

  {/* Fieldset 1: Hearing Classification & Round */}
  {!isTitleReviewHearing && (
    <fieldset className="space-y-3 rounded-lg border border-border/60 p-3.5">
      <legend className="text-xs font-semibold text-foreground px-2">
        Hearing Classification & Round
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Defense Type & Defense Round */}
      </div>
    </fieldset>
  )}

  {/* Fieldset 2: Schedule & Venue Logistics */}
  <fieldset className="space-y-3 rounded-lg border border-border/60 p-3.5">
    <legend className="text-xs font-semibold text-foreground px-2">
      Schedule & Venue Logistics
    </legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Date & Time Slot */}
    </div>
    {/* Quick Slots */}
    <div className="space-y-1.5">
      {/* Venue Select */}
    </div>
  </fieldset>

  {/* Fieldset 3: Stakeholders & Committee Roster */}
  <fieldset className="space-y-3 rounded-lg border border-border/60 p-3.5">
    <legend className="text-xs font-semibold text-foreground px-2">
      Stakeholders & Committee Alignment
    </legend>
    {!isTitleReviewHearing && (
      {/* Target Client Input */}
    )}
    {/* Committee Roster Snapshot */}
  </fieldset>
</form>
```

---

### 1.6 Target 5: `MilestoneDeadlinesModal.jsx`

- **File Path:** `client/src/components/instructor/MilestoneDeadlinesModal.jsx`
- **Location:** Lines 218–416 (Left column schedule creation form)
- **Current State:** 8 inputs in a flat `space-y-4` form:
  1. Academic Year / Batch Select (`deadline-batch-year`, Line 238)
  2. Target Scope RadioGroup (`deadline-target-batch` / `deadline-target-section`, Line 258)
  3. Specific Section Select (`deadline-section`, Line 288)
  4. Capstone Stage Select (`deadline-stage`, Line 312)
  5. Deliverable Component Select (`deadline-deliverable`, Line 331)
  6. Display Title Input (`deadline-title`, Line 354)
  7. Submission Cutoff Date Input (`deadline-date`, Line 371)
  8. Allow Late Submissions Checkbox (`allow-late`, Line 382)

#### Proposed Chunking Design (3 Semantic Fieldsets):
1. **Fieldset 1: Academic Cohort Scope**
   - Fields: Academic Year (Batch), Target Scope (Batch vs Section), Specific Section Select
   - Legend: `Academic Cohort & Scope`
2. **Fieldset 2: Milestone Deliverable Binding**
   - Fields: Capstone Stage, Deliverable Component, Display Title
   - Legend: `Milestone & Deliverable Binding`
3. **Fieldset 3: Schedule & Submission Policies**
   - Fields: Submission Cutoff Date, Allow Late Submissions Checkbox
   - Legend: `Cutoff Schedule & Late Policy`

#### Concrete Code Specification:
```jsx
// MilestoneDeadlinesModal.jsx:218:
<form onSubmit={handleSubmit} className="space-y-4 border-b border-border/60 p-5 sm:p-6 md:col-span-7 md:border-b-0 md:border-r">
  <div className="space-y-1">
    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
      Schedule New Milestone Cutoff
    </h3>
    <p className="text-[11px] text-muted-foreground">
      Deadlines normalize to End-of-Day (23:59:59 UTC) and automatically render on the calendar ribbon.
    </p>
  </div>

  {/* Fieldset 1: Academic Cohort & Scope */}
  <fieldset className="space-y-3 rounded-lg border border-border/60 p-3.5">
    <legend className="text-xs font-semibold text-foreground px-2">
      Academic Cohort & Scope
    </legend>
    <div className="grid grid-cols-2 gap-3">
      {/* Batch Year Select & Target Scope RadioGroup */}
    </div>
    {targetType === 'section' && (
      {/* Specific Section Select */}
    )}
  </fieldset>

  {/* Fieldset 2: Milestone & Deliverable Binding */}
  <fieldset className="space-y-3 rounded-lg border border-border/60 p-3.5">
    <legend className="text-xs font-semibold text-foreground px-2">
      Milestone & Deliverable Binding
    </legend>
    <div className="space-y-2">
      {/* Stage Select */}
      {/* Deliverable Select */}
      {/* Display Title Input */}
    </div>
  </fieldset>

  {/* Fieldset 3: Cutoff Schedule & Late Policy */}
  <fieldset className="space-y-3 rounded-lg border border-border/60 p-3.5">
    <legend className="text-xs font-semibold text-foreground px-2">
      Cutoff Schedule & Late Policy
    </legend>
    <div className="space-y-2">
      {/* Deadline Date Input */}
      {/* Allow Late Submissions Checkbox */}
    </div>
  </fieldset>

  {/* Action Buttons */}
  <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
    ...
  </div>
</form>
```

---

## 2. Feature 11: Responsive Table Overflow Wrappers

### 2.1 Problem Analysis & Viewport Vulnerability
In standard web applications, data tables rendered without an explicit `overflow-x-auto` wrapper break layout containers when viewed on mobile screens (such as 390x844 mobile viewports) or inside narrow card grids. Even when the `Table` primitive (`client/src/components/ui/Table.jsx`) provides an internal `overflow-auto` wrapper, outer border containers or raw `<table>` instances without `overflow-x-auto` cause:
- Horizontal scrolling clipped by parent `overflow-hidden`.
- Entire page width being pushed out, resulting in ugly horizontal page scrollbars on mobile.
- Truncated table columns or overlapping text cells.

---

### 2.2 Table Audit Matrix Across All 6 Candidate Files

| # | File Path | Line # | Element Type | Missing Wrapper / Defect | Remediation Action |
|---|-----------|--------|--------------|--------------------------|---------------------|
| 1 | `client/src/components/projects/EvaluationPanel.jsx` | 269 | `<div><Table className="min-w-[38rem]">` | Outer container has `className="hidden rounded-md border sm:block"` without `overflow-x-auto`. Table is 608px wide. | Add `overflow-x-auto` to line 269: `className="hidden rounded-md border sm:block overflow-x-auto"` |
| 2 | `client/src/components/projects/EvaluationPanel.jsx` | 549 | `<div><Table className="min-w-[38rem]">` | Outer container has `className="rounded-md border"` without `overflow-x-auto`. Table is 608px wide. | Add `overflow-x-auto` to line 549: `className="rounded-md border overflow-x-auto"` |
| 3 | `client/src/components/submissions/EvaluationWorkspace.jsx` | 669 | Raw `<table>` | Committee annotations table is a raw `<table>` element directly inside `div.space-y-3` without an overflow wrapper. | Wrap lines 669–707 in `<div className="overflow-x-auto rounded-md border border-neutral-300">...</div>` |
| 4 | `client/src/components/submissions/EvaluationWorkspace.jsx` | 719 | Raw `<table>` | ADM directives table is a raw `<table>` element directly inside `div.space-y-3` without an overflow wrapper. | Wrap lines 719–754 in `<div className="overflow-x-auto rounded-md border border-neutral-300">...</div>` |
| 5 | `client/src/components/submissions/EvaluationWorkspace.jsx` | 767 | Raw `<table>` | Plagiarism sources table is a raw `<table>` element directly inside `div.space-y-3` without an overflow wrapper. | Wrap lines 767–800 in `<div className="overflow-x-auto rounded-md border border-neutral-300">...</div>` |
| 6 | `client/src/components/submissions/PlagiarismReport.jsx` | 243 | `<Table>` | Matched sources `<Table>` is directly under `<CardContent>` without a bounded border container. | Wrap `<Table>` at line 243 in `<div className="rounded-md border overflow-x-auto"><Table>...</Table></div>` |
| 7 | `client/src/components/submissions/VersionCompare.jsx` | 62 | `<CardContent><Table className="table-fixed">` | `<Table className="table-fixed">` with 30%/35%/35% columns inside `CardContent` has no `min-w` and lacks an explicit `overflow-x-auto` wrapper, squeezing cells on mobile. | Wrap `<Table>` at line 63 in `<div className="overflow-x-auto rounded-md border"><Table className="min-w-[480px] table-fixed">...</div>` |
| 8 | `client/src/components/reports/DynamicChartWidget.jsx` | 443 | `<div><Table className="text-left text-xs">` | Container line 443 has `overflow-auto`, but `Table` lacks `min-w-[480px]`, causing columns to compress on screens with >3 data keys. | Ensure `<Table className="min-w-[480px] text-left text-xs">` so horizontal scrolling activates smoothly. |
| 9 | `client/src/components/secretary/SecretaryMinutesDocumentSheet.jsx` | 1870, 2205 | Raw `<table>` inside paper simulation | A4 paper container (`secretary-sheet-paper-container`, line 1870) and table wrapper (`minutes-table-wrapper`, line 2205) render wide 794px paper. On mobile (390px), lacks mobile overflow containment. | Add `overflow-x-auto` to `secretary-sheet-paper-container` (line 1870) and `overflow-x-auto` to `minutes-table-wrapper` (line 2205) so mobile touch-scrolling works seamlessly. |

---

### 2.3 Detailed In-Depth Inspections & Code-Level Diffs

#### 2.3.1 `EvaluationPanel.jsx`
- **Line 269:**
  ```jsx
  // BEFORE:
  {/* Criteria Table */}
  <div className="hidden rounded-md border sm:block">
    <Table className="min-w-[38rem]">

  // AFTER:
  {/* Criteria Table */}
  <div className="hidden rounded-md border sm:block overflow-x-auto">
    <Table className="min-w-[38rem]">
  ```
- **Line 549:**
  ```jsx
  // BEFORE:
  <CollapsibleContent>
    <div className="border-t px-4 py-4 space-y-4">
      <div className="rounded-md border">
        <Table className="min-w-[38rem]">

  // AFTER:
  <CollapsibleContent>
    <div className="border-t px-4 py-4 space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[38rem]">
  ```

#### 2.3.2 `EvaluationWorkspace.jsx`
- **Lines 668–708:**
  ```jsx
  // BEFORE:
  ) : (
    <table className="w-full text-left text-xs border border-neutral-300 border-collapse">
      ...
    </table>
  )}

  // AFTER:
  ) : (
    <div className="overflow-x-auto rounded-md border border-neutral-300">
      <table className="w-full min-w-[500px] text-left text-xs border-collapse">
        ...
      </table>
    </div>
  )}
  ```
- **Lines 718–754:**
  ```jsx
  // BEFORE:
  ) : (
    <table className="w-full text-left text-xs border border-neutral-300 border-collapse">
      ...
    </table>
  )}

  // AFTER:
  ) : (
    <div className="overflow-x-auto rounded-md border border-neutral-300">
      <table className="w-full min-w-[500px] text-left text-xs border-collapse">
        ...
      </table>
    </div>
  )}
  ```
- **Lines 766–801:**
  ```jsx
  // BEFORE:
  ) : (
    <table className="w-full text-left text-xs border border-neutral-300 border-collapse">
      ...
    </table>
  )}

  // AFTER:
  ) : (
    <div className="overflow-x-auto rounded-md border border-neutral-300">
      <table className="w-full min-w-[450px] text-left text-xs border-collapse">
        ...
      </table>
    </div>
  )}
  ```

#### 2.3.3 `PlagiarismReport.jsx`
- **Lines 242–274:**
  ```jsx
  // BEFORE:
  {/* ── Matched sources table ── */}
  {decoratedSources.length > 0 && (
    <Table>
      <TableHeader>...</TableHeader>
      <TableBody>...</TableBody>
    </Table>
  )}

  // AFTER:
  {/* ── Matched sources table ── */}
  {decoratedSources.length > 0 && (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[400px]">
        <TableHeader>...</TableHeader>
        <TableBody>...</TableBody>
      </Table>
    </div>
  )}
  ```

#### 2.3.4 `VersionCompare.jsx`
- **Lines 62–98:**
  ```jsx
  // BEFORE:
  <CardContent className="min-w-0">
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%] break-words whitespace-normal">Property</TableHead>
          <TableHead className="w-[35%] break-words whitespace-normal">
            <Badge variant="outline">Version {version1.version}</Badge>
          </TableHead>
          <TableHead className="w-[35%] break-words whitespace-normal">
            <Badge variant="outline">Version {version2.version}</Badge>
          </TableHead>
        </TableRow>
      </TableHeader>
      ...
    </Table>
  </CardContent>

  // AFTER:
  <CardContent className="min-w-0">
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[480px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%] break-words whitespace-normal">Property</TableHead>
            <TableHead className="w-[35%] break-words whitespace-normal">
              <Badge variant="outline">Version {version1.version}</Badge>
            </TableHead>
            <TableHead className="w-[35%] break-words whitespace-normal">
              <Badge variant="outline">Version {version2.version}</Badge>
            </TableHead>
          </TableRow>
        </TableHeader>
        ...
      </Table>
    </div>
  </CardContent>
  ```

#### 2.3.5 `DynamicChartWidget.jsx`
- **Lines 442–478:**
  ```jsx
  // BEFORE:
  {currentView === 'table' && (
    <div className="h-full overflow-auto rounded-lg border border-border/70 bg-background/50">
      <Table className="text-left text-xs">

  // AFTER:
  {currentView === 'table' && (
    <div className="h-full overflow-auto rounded-lg border border-border/70 bg-background/50">
      <Table className="min-w-[480px] text-left text-xs">
  ```

#### 2.3.6 `SecretaryMinutesDocumentSheet.jsx`
- **Line 1870:**
  ```jsx
  // BEFORE:
  <div
    id="secretary-minutes-paper"
    className="secretary-sheet-paper-container max-w-4xl mx-auto space-y-10"
  >

  // AFTER:
  <div
    id="secretary-minutes-paper"
    className="secretary-sheet-paper-container max-w-4xl mx-auto space-y-10 overflow-x-auto"
  >
  ```
- **Line 2205:**
  ```jsx
  // BEFORE:
  <div
    className={cn(
      'minutes-table-wrapper pt-2',
      isFirstPage && 'min-h-[220px]',
      !isFirstPage && !isLastPage && 'min-h-[460px]',
      isLastPage && 'min-h-[160px]',
    )}
  >

  // AFTER:
  <div
    className={cn(
      'minutes-table-wrapper pt-2 overflow-x-auto',
      isFirstPage && 'min-h-[220px]',
      !isFirstPage && !isLastPage && 'min-h-[460px]',
      isLastPage && 'min-h-[160px]',
    )}
  >
  ```

---

## 3. Summary of Recommendations for Sub-Orchestrator M2

1. **Feature 10 Implementation Readiness:**
   - All 5 form locations and exact line numbers have been verified and mapped.
   - Every input has been cataloged and mapped into cohesive, semantically labeled `<fieldset>` groups that strictly honor the Cowan $4 \pm 1$ limit.
   - All proposed markup preserves existing state bindings, event handlers, test IDs (`data-testid`), and accessibility attributes.

2. **Feature 11 Implementation Readiness:**
   - 9 table wrappers/containers across 6 files have been verified with exact line numbers and concrete Before/After snippets.
   - Each table receives appropriate min-width and `overflow-x-auto` containment to protect mobile viewports (390px) while maintaining crisp layout borders.

3. **Risk & Regression Assessment:**
   - Zero breaking changes to component props or API interfaces.
   - Semantic fieldsets improve screen reader accessibility without interfering with Form submission (`onSubmit`).
   - Adding `overflow-x-auto` wrappers does not affect printing (`@media print` rules in `index.css` unroll overflow wrappers cleanly).

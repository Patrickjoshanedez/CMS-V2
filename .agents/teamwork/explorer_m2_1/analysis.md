# Feature 7 Analysis: Mobile Touch Target Normalization

**Date:** 2026-11-13 (UTC) / 2026-11-14 (Local)  
**Investigator:** `explorer_m2_1` (Teamwork Explorer)  
**Parent Task:** Milestone 2 (M2.1) — UI Sizing, Spacing & Cognitive Ergonomics Overhaul  
**Directives & Standards:** `ORIGINAL_REQUEST.md` (R1), `sub_orch_m2/SCOPE.md`, `survey_report.md`, `cognitive-ergonomics-ux`, `WCAG 2.1 AA SC 2.5.5`, `WCAG 2.2 AA SC 2.5.8`

---

## 1. Executive Summary & Objective

In accordance with **Milestone 2.1 (Feature 7)**, this investigation audited interactive elements (buttons, links, icon triggers) across five critical BukSU CMS-V2 components to eliminate touch target undersizing on mobile viewports (<640px, e.g. 390x844).

### The Touch Target Problem
Desktop-first styling in BukSU CMS-V2 often uses compact Tailwind height tokens such as `h-8` (32px), `h-8.5` (34px), or `h-8 w-8` (32x32px) on buttons and icon buttons.
- While `h-8` (32px) is appropriate for high-density desktop displays (>=640px, e.g. 1440x900) where mouse pointer precision is available, it violates **WCAG 2.1 Success Criterion 2.5.5 (Target Size - Level AAA)** and fails the standard mobile floor requirement of **WCAG 2.2 Success Criterion 2.5.8 (Target Size Minimum - Level AA)** requiring at least **44x44 CSS pixels** for unconstrained touch inputs.
- On touchscreens (<640px), 32px targets cause high error rates, missed taps, and accidental trigger of adjacent dangerous actions (e.g. tapping "Mark as read" but hitting "Delete notification").

### Normalization Strategy
To resolve this without degrading desktop layout density, we utilize responsive utility class scaling:
- **Mobile (<640px):** `min-h-[44px] min-w-[44px]` (or `min-h-[44px]` for full-width/labeled buttons)
- **Desktop/Tablet (>=640px, `sm:` prefix):** `sm:min-h-0 sm:min-w-0 sm:h-8` (or `sm:h-8.5` where matching existing baseline)
This provides a 44px physical touch target on mobile viewports while preserving compact 32px density on desktop.

---

## 2. Target File Inventory & Verification

All five target components were located and verified on disk under `client/src/`:

| # | Component | Exact File Path | Lines | Target Interactive Elements |
|---|---|---|---|---|
| 1 | Action Done Matrix Tab | `client/src/components/projects/ActionDoneMatrixTab.jsx` | 826 (and 746–840 toolbar) | Add Row button, toolbar actions |
| 2 | Prototype Gallery Modal | `client/src/components/projects/PrototypeGalleryModal.jsx` | 138, 147 | Copy GitHub URL, Open Code external link |
| 3 | Manuscript Template Widget | `client/src/components/teams/ManuscriptTemplateWidget.jsx` | 117, 187–205 | Set in Settings, Use Google Docs, Download DOCX, Settings |
| 4 | Team Formation Notification Item | `client/src/components/teams/TeamFormationNotificationItem.jsx` | 226, 235, 246, 251, 261, 272 | Assign Committee, Inspect Roster, Mark Read, Delete |
| 5 | Submission Review Page | `client/src/pages/submissions/SubmissionReviewPage.jsx` | 901, 913, 939, 947, 955, 745, 766 | Fullscreen Viewer, Open Google Doc, Download Original, Full Report |

---

## 3. Deep-Dive Inspection & Surgical CST Patch Recommendations

### 3.1 `client/src/components/projects/ActionDoneMatrixTab.jsx`

#### Current Implementation (Lines 825–831)
```jsx
{canAddRow && (
  <Button size="sm" onClick={handleAddRow} className="gap-1.5 text-xs h-8">
    <Plus className="h-3.5 w-3.5" />
    Add Row
  </Button>
)}
```

#### Observations & Defect Analysis
- The "Add Row" button has `h-8` (32px height).
- On mobile viewports (e.g. mobile Safari / Chrome at 390x844), students adding matrix revision rows must accurately hit a 32px tall target.
- Immediately adjacent buttons in the toolbar (`handlePrint` line 832, `handleAddContinuationPage` line 811, `handleBalancePages` line 796) also use `h-8`.

#### Proposed Surgical CST Patch
Target: `client/src/components/projects/ActionDoneMatrixTab.jsx` (lines 825–830)
```jsx
<<<<
                {canAddRow && (
                  <Button size="sm" onClick={handleAddRow} className="gap-1.5 text-xs h-8">
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </Button>
                )}
====
                {canAddRow && (
                  <Button
                    size="sm"
                    onClick={handleAddRow}
                    className="min-h-[44px] sm:min-h-0 sm:h-8 gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </Button>
                )}
>>>>
```

*Note on Toolbar Expansion:* If normalizing the entire Action Bar (lines 746–840), the companion buttons (`Upload Hearing Defense Minutes`, `Submit for Secretary Endorsement`, `Sign & Endorse Matrix`, `Balance Pages`, `Add Continuation Page`, and `Print / Export Document`) can similarly adopt `min-h-[44px] sm:min-h-0 sm:h-8`.

---

### 3.2 `client/src/components/projects/PrototypeGalleryModal.jsx`

#### Current Implementation (Lines 134–153)
```jsx
<div className="flex shrink-0 items-center gap-2">
  <Button
    size="sm"
    variant="outline"
    onClick={handleCopyGithub}
    className="h-8 text-xs gap-1.5"
  >
    {copied ? (
      <Check className="size-3.5 text-success" aria-hidden="true" />
    ) : (
      <Copy className="size-3.5" aria-hidden="true" />
    )}
    {copied ? 'Copied' : 'Copy'}
  </Button>
  <Button size="sm" asChild className="h-8 text-xs gap-1.5">
    <a href={githubUrl} target="_blank" rel="noopener noreferrer">
      <span>Open Code</span>
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  </Button>
</div>
```

#### Observations & Defect Analysis
- Lines 138 and 147 both specify `className="h-8 text-xs gap-1.5"`.
- On mobile screens, the card header stacks vertically (`flex flex-col sm:flex-row`). These buttons sit side-by-side with only `gap-2` (8px gap) and 32px height.
- Tapping "Open Code" or "Copy" frequently causes fat-finger miss-clicks on mobile devices.

#### Proposed Surgical CST Patch
Target: `client/src/components/projects/PrototypeGalleryModal.jsx` (lines 134–153)
```jsx
<<<<
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyGithub}
                    className="h-8 text-xs gap-1.5"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button size="sm" asChild className="h-8 text-xs gap-1.5">
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                      <span>Open Code</span>
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
====
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyGithub}
                    className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 text-xs gap-1.5"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 text-xs gap-1.5"
                  >
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                      <span>Open Code</span>
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
>>>>
```

---

### 3.3 `client/src/components/teams/ManuscriptTemplateWidget.jsx`

#### Current Implementation (Lines 116–125 & Lines 185–214)

**Locked state (Line 117):**
```jsx
{isInstructor && (
  <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
    <Link
      to="/settings?tab=administration"
      title="Configure manuscript template link in instructor settings"
    >
      <Settings2 className="h-3 w-3" /> Set in Settings
    </Link>
  </Button>
)}
```

**Unlocked state (Lines 185–214):**
```jsx
<div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:self-center">
  {isGoogleDocs ? (
    <Button
      size="sm"
      className="h-8 gap-1.5 text-xs"
      onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
    >
      <Sparkles className="h-3.5 w-3.5" /> Use Google Docs Copy
      <ExternalLink className="h-3 w-3 ml-0.5" />
    </Button>
  ) : (
    <Button
      size="sm"
      className="h-8 gap-1.5 text-xs"
      onClick={() => window.open(rawUrl, '_blank', 'noopener,noreferrer')}
    >
      <Download className="h-3.5 w-3.5" /> Download .DOCX Template
    </Button>
  )}
  {isInstructor && (
    <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
      <Link
        to="/settings?tab=administration"
        title="Configure manuscript template link in instructor settings"
      >
        <Settings2 className="h-3 w-3" /> Settings
      </Link>
    </Button>
  )}
</div>
```

#### Observations & Defect Analysis
- On mobile viewports (<640px), the container renders with `w-full flex-col items-stretch`. The buttons expand to full width, but their height is constrained to `h-8` (32px).
- In both locked and unlocked views, `Set in Settings` and `Settings` buttons (lines 117 and 205) have `h-8 shrink-0 gap-1 text-xs`.
- Students and instructors tapping to launch Google Docs or settings on mobile have to interact with narrow 32px touch strips.

#### Proposed Surgical CST Patch
Target: `client/src/components/teams/ManuscriptTemplateWidget.jsx`

**Patch Part A (Line 117):**
```jsx
<<<<
          {isInstructor && (
            <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
              <Link
                to="/settings?tab=administration"
                title="Configure manuscript template link in instructor settings"
              >
                <Settings2 className="h-3 w-3" /> Set in Settings
              </Link>
            </Button>
          )}
====
          {isInstructor && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0 sm:h-8 shrink-0 gap-1 text-xs"
            >
              <Link
                to="/settings?tab=administration"
                title="Configure manuscript template link in instructor settings"
              >
                <Settings2 className="h-3 w-3" /> Set in Settings
              </Link>
            </Button>
          )}
>>>>
```

**Patch Part B (Lines 185–214):**
```jsx
<<<<
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:self-center">
        {isGoogleDocs ? (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
          >
            <Sparkles className="h-3.5 w-3.5" /> Use Google Docs Copy
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.open(rawUrl, '_blank', 'noopener,noreferrer')}
          >
            <Download className="h-3.5 w-3.5" /> Download .DOCX Template
          </Button>
        )}
        {isInstructor && (
          <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
            <Link
              to="/settings?tab=administration"
              title="Configure manuscript template link in instructor settings"
            >
              <Settings2 className="h-3 w-3" /> Settings
            </Link>
          </Button>
        )}
      </div>
====
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:self-center">
        {isGoogleDocs ? (
          <Button
            size="sm"
            className="min-h-[44px] sm:min-h-0 sm:h-8 gap-1.5 text-xs"
            onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
          >
            <Sparkles className="h-3.5 w-3.5" /> Use Google Docs Copy
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="min-h-[44px] sm:min-h-0 sm:h-8 gap-1.5 text-xs"
            onClick={() => window.open(rawUrl, '_blank', 'noopener,noreferrer')}
          >
            <Download className="h-3.5 w-3.5" /> Download .DOCX Template
          </Button>
        )}
        {isInstructor && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-[44px] sm:min-h-0 sm:h-8 shrink-0 gap-1 text-xs"
          >
            <Link
              to="/settings?tab=administration"
              title="Configure manuscript template link in instructor settings"
            >
              <Settings2 className="h-3 w-3" /> Settings
            </Link>
          </Button>
        )}
      </div>
>>>>
```

---

### 3.4 `client/src/components/teams/TeamFormationNotificationItem.jsx`

#### Current Implementation (Lines 216–280)
```jsx
<div className="flex w-full flex-wrap items-center justify-start gap-2 self-start sm:w-auto sm:justify-end lg:self-center">
  {isFullyAssigned ? (
    <>
      <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success-foreground">
        <Check className="h-3.5 w-3.5" />
        <span>Assigned</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleAssign}
      >
        <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
        Edit Committee
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={handleInspect}
      >
        Inspect Roster
      </Button>
    </>
  ) : (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={handleInspect}
      >
        Inspect Roster
      </Button>
      <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAssign}>
        <UserCheck className="h-3.5 w-3.5" />
        Assign Committee
      </Button>
    </>
  )}
  {!isNotificationRead && (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      title="Mark as read"
      aria-label="Mark as read"
      onClick={handleMarkAsRead}
    >
      <Check className="h-4 w-4" />
    </Button>
  )}
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8 text-muted-foreground hover:text-destructive"
    title="Delete notification"
    aria-label="Delete notification"
    onClick={handleDelete}
    disabled={isDeletePending}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

#### Observations & Defect Analysis
- Line 251 (`Assign Committee`) uses `className="h-8 gap-1.5 text-xs"` (32px high).
- Lines 226, 235, and 246 also use `h-8`.
- In addition, lines 261 and 272 are icon-only buttons with `className="h-8 w-8 ..."` (32x32px square). They sit right next to each other. On mobile viewports, tapping "Mark as read" frequently accidentally triggers "Delete notification" due to the sub-44px target bounds.
- Normalizing both the action buttons and the icon buttons to 44px min touch dimensions prevents destructive accidental deletions.

#### Proposed Surgical CST Patch
Target: `client/src/components/teams/TeamFormationNotificationItem.jsx` (lines 223–280)
```jsx
<<<<
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleAssign}
                  >
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    Edit Committee
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleInspect}
                  >
                    Inspect Roster
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleInspect}
                  >
                    Inspect Roster
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAssign}>
                    <UserCheck className="h-3.5 w-3.5" />
                    Assign Committee
                  </Button>
                </>
              )}
              {!isNotificationRead && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Mark as read"
                  aria-label="Mark as read"
                  onClick={handleMarkAsRead}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete notification"
                aria-label="Delete notification"
                onClick={handleDelete}
                disabled={isDeletePending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
====
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] sm:min-h-0 sm:h-8 gap-1.5 text-xs"
                    onClick={handleAssign}
                  >
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    Edit Committee
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] sm:min-h-0 sm:h-8 text-xs"
                    onClick={handleInspect}
                  >
                    Inspect Roster
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] sm:min-h-0 sm:h-8 text-xs"
                    onClick={handleInspect}
                  >
                    Inspect Roster
                  </Button>
                  <Button
                    size="sm"
                    className="min-h-[44px] sm:min-h-0 sm:h-8 gap-1.5 text-xs"
                    onClick={handleAssign}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Assign Committee
                  </Button>
                </>
              )}
              {!isNotificationRead && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                  title="Mark as read"
                  aria-label="Mark as read"
                  onClick={handleMarkAsRead}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                title="Delete notification"
                aria-label="Delete notification"
                onClick={handleDelete}
                disabled={isDeletePending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
>>>>
```

---

### 3.5 `client/src/pages/submissions/SubmissionReviewPage.jsx`

#### Current Implementation (Lines 936–966 & Lines 898–925)

**File Actions (Lines 936–966):**
```jsx
<Button
  type="button"
  variant="default"
  className="w-full gap-2 shadow-xs h-8.5 text-xs"
  onClick={() => setViewerOpen(true)}
  disabled={!activeRound}
>
  <Eye className="h-4 w-4" />
  Fullscreen Viewer
</Button>
{teamGoogleDocUrl && (
  <Button asChild variant="outline" className="w-full gap-2 text-xs h-8">
    <a href={teamGoogleDocUrl} target="_blank" rel="noopener noreferrer">
      <ExternalLink className="h-3.5 w-3.5 text-primary" />
      Open Team Google Doc
    </a>
  </Button>
)}
{activeSubmissionId && (
  <Button asChild variant="outline" className="w-full gap-2 text-xs h-8">
    <a
      href={`/api/submissions/${activeSubmissionId}/file?download=true`}
      download={activeRound?.fileName || 'manuscript.docx'}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Download className="h-3.5 w-3.5" />
      Download Original
    </a>
  </Button>
)}
```

**Plagiarism Card Actions (Lines 898–925):**
```jsx
<Button
  variant="outline"
  size="sm"
  className="w-full gap-1.5 text-xs h-8"
  disabled={!activeSubmissionId}
  onClick={() =>
    navigate(`/project/submissions/${activeSubmissionId}/plagiarism-report`)
  }
>
  View Full Report
</Button>
{activeSubmissionId && (
  <Button
    variant="ghost"
    size="sm"
    className="w-full gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
    disabled={scanArchive.isPending}
    onClick={() => scanArchive.mutate(activeSubmissionId)}
  >
    {scanArchive.isPending ? (
      <Spinner className="h-3.5 w-3.5" />
    ) : (
      <RefreshCcw className="h-3.5 w-3.5" />
    )}
    <span>{scanArchive.isPending ? 'Scanning...' : 'Re-scan Archive'}</span>
  </Button>
)}
```

#### Observations & Defect Analysis
- Lines 947 and 955 (`Open Team Google Doc` and `Download Original`) explicitly hardcode `className="w-full gap-2 text-xs h-8"` (32px height).
- Line 939 (`Fullscreen Viewer`) hardcodes `className="w-full gap-2 shadow-xs h-8.5 text-xs"` (34px height).
- Lines 901 and 913 (`View Full Report` and `Re-scan Archive`) also hardcode `h-8`.
- In contrast, the custom Pill Tab Bar in line 997 on the same page already specifies:
  `className={['min-h-[44px] min-w-0 w-full whitespace-normal px-2 text-sm'].join(' ')}`
  which validates that `min-h-[44px]` is the established pattern for mobile accessibility across this view!

#### Proposed Surgical CST Patch
Target: `client/src/pages/submissions/SubmissionReviewPage.jsx`

**Patch Part A: File Actions (Lines 936–966):**
```jsx
<<<<
                    <Button
                      type="button"
                      variant="default"
                      className="w-full gap-2 shadow-xs h-8.5 text-xs"
                      onClick={() => setViewerOpen(true)}
                      disabled={!activeRound}
                    >
                      <Eye className="h-4 w-4" />
                      Fullscreen Viewer
                    </Button>
                    {teamGoogleDocUrl && (
                      <Button asChild variant="outline" className="w-full gap-2 text-xs h-8">
                        <a href={teamGoogleDocUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                          Open Team Google Doc
                        </a>
                      </Button>
                    )}
                    {activeSubmissionId && (
                      <Button asChild variant="outline" className="w-full gap-2 text-xs h-8">
                        <a
                          href={`/api/submissions/${activeSubmissionId}/file?download=true`}
                          download={activeRound?.fileName || 'manuscript.docx'}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Original
                        </a>
                      </Button>
                    )}
====
                    <Button
                      type="button"
                      variant="default"
                      className="min-h-[44px] sm:min-h-0 sm:h-8.5 w-full gap-2 shadow-xs text-xs"
                      onClick={() => setViewerOpen(true)}
                      disabled={!activeRound}
                    >
                      <Eye className="h-4 w-4" />
                      Fullscreen Viewer
                    </Button>
                    {teamGoogleDocUrl && (
                      <Button
                        asChild
                        variant="outline"
                        className="min-h-[44px] sm:min-h-0 sm:h-8 w-full gap-2 text-xs"
                      >
                        <a href={teamGoogleDocUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                          Open Team Google Doc
                        </a>
                      </Button>
                    )}
                    {activeSubmissionId && (
                      <Button
                        asChild
                        variant="outline"
                        className="min-h-[44px] sm:min-h-0 sm:h-8 w-full gap-2 text-xs"
                      >
                        <a
                          href={`/api/submissions/${activeSubmissionId}/file?download=true`}
                          download={activeRound?.fileName || 'manuscript.docx'}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Original
                        </a>
                      </Button>
                    )}
>>>>
```

**Patch Part B: Plagiarism Card Actions (Lines 898–925):**
```jsx
<<<<
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs h-8"
                      disabled={!activeSubmissionId}
                      onClick={() =>
                        navigate(`/project/submissions/${activeSubmissionId}/plagiarism-report`)
                      }
                    >
                      View Full Report
                    </Button>
                    {activeSubmissionId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                        disabled={scanArchive.isPending}
                        onClick={() => scanArchive.mutate(activeSubmissionId)}
                      >
                        {scanArchive.isPending ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                        <span>{scanArchive.isPending ? 'Scanning...' : 'Re-scan Archive'}</span>
                      </Button>
                    )}
====
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] sm:min-h-0 sm:h-8 w-full gap-1.5 text-xs"
                      disabled={!activeSubmissionId}
                      onClick={() =>
                        navigate(`/project/submissions/${activeSubmissionId}/plagiarism-report`)
                      }
                    >
                      View Full Report
                    </Button>
                    {activeSubmissionId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[44px] sm:min-h-0 sm:h-8 w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        disabled={scanArchive.isPending}
                        onClick={() => scanArchive.mutate(activeSubmissionId)}
                      >
                        {scanArchive.isPending ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                        <span>{scanArchive.isPending ? 'Scanning...' : 'Re-scan Archive'}</span>
                      </Button>
                    )}
>>>>
```

---

## 4. Cross-Cutting Design Principles & Quality Guardrails

1. **Deterministic Sizing Across Breakpoints:**
   - On `<640px` (mobile), the rule `min-h-[44px]` (and `min-w-[44px]` on icon/compact buttons) guarantees compliant touch target geometry.
   - On `>=640px` (`sm:`), `sm:min-h-0 sm:min-w-0 sm:h-8` clears the floor and re-applies exact desktop 32px height, preserving existing typography and visual density.
2. **Zero-Regression Verification:**
   - None of the existing unit tests (`ActionDoneMatrixTab.test.jsx`, `PrototypeGalleryModal.test.jsx`, `ManuscriptTemplateWidget.test.jsx`, `TeamFormationNotificationItem.test.jsx`, `SubmissionReviewPage.test.jsx`) make fragile string assertions on class names like `expect(btn.className).toBe('... h-8')`. They select by text, role, or test IDs (`data-testid`).
   - Thus, these patches carry zero risk of breaking existing test fixtures.
3. **Playwright Visual Feedback Protocol:**
   - Per `AGENTS.md` and `GEMINI.md`, visual verification in `scratch/` must confirm both desktop (1440x900) and mobile (390x844) viewports in light and dark modes before sign-off.

---

## 5. Independent Verification Plan

For the downstream implementer and test runner:
```bash
# 1. Targeted Unit Tests (Fast-path 1-5s feedback cycle)
npm test --workspace=client -- src/components/projects/ActionDoneMatrixTab.test.jsx
npm test --workspace=client -- src/components/projects/PrototypeGalleryModal.test.jsx
npm test --workspace=client -- src/components/teams/ManuscriptTemplateWidget.test.jsx
npm test --workspace=client -- src/components/teams/TeamFormationNotificationItem.test.jsx
npm test --workspace=client -- src/pages/submissions/SubmissionReviewPage.test.jsx

# 2. Touch Target Visual Assertion (Playwright mobile 390x844)
# Assert boundingBox().height >= 44 on mobile viewport
```

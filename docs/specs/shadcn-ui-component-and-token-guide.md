# CMS-V2 shadcn/ui Component and Token Guide

This guide records the UI conventions used by the Luna 6 refactor. The source of truth for component behavior remains `client/src/components/ui/`; the migration census and route evidence live in [the migration inventory](shadcn-ui-migration-inventory.json) and [the durable evidence inventory](../EVIDENCE_INVENTORY.md).

## Interface tone

Use a clear, professional, reassuring tone across public and authenticated screens. Prefer direct labels, calm status language, and specific next steps. Keep BukSU identity visible through approved branding and use restrained shadcn surfaces so academic workflows remain easy to scan.

## Component composition

| UI need | Shared primitive | CMS-V2 convention |
| --- | --- | --- |
| Primary, secondary, destructive, and icon actions | `Button` | Use a declared variant and size. Preserve `type`, loading, disabled, ref, and `asChild` behavior. Give icon-only buttons an accessible name and practical touch target. |
| Grouped content and dashboard summaries | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Use semantic card surfaces and consistent section hierarchy. Avoid one-off glass, gradient, and glow treatments. |
| Status and compact category labels | `Badge` | Map workflow meaning to shared variants such as `success`, `warning`, `destructive`, `info`, `secondary`, and `outline`; keep the text label visible. |
| Inline validation, access gates, and recoverable errors | `Alert`, `AlertTitle`, `AlertDescription` | Use `destructive` for errors and semantic status tokens for warnings or success. Include an explanation and next step where useful. |
| Text entry | `Input`, `Textarea`, `Label` | Associate labels explicitly, retain field-level error messaging, and preserve native file and form semantics. |
| Finite choices | `Select`, `RadioGroup`, `Checkbox`, `Switch` | Prefer accessible Radix-backed controls. Test keyboard selection and selected state; do not query or depend on native `<select>` markup. |
| Route or workspace sections | `Tabs`, `Accordion`, `Collapsible` | Keep route/query synchronization, draft state, and locked-phase semantics. Use labelled tab triggers and preserve content while switching where required. |
| Modal, confirmation, and side-panel flows | `Dialog`, `AlertDialog`, `Sheet` | Let Radix own focus trapping, Escape, focus return, and scroll lock. Use `DialogDescription` and a labelled title. Keep overlays on the shared `overlay` token. |
| Data grids and compact records | `Table` | Preserve semantic headers, responsive containment, and accessible empty/loading states. Use a card or stacked-record layout on narrow screens when the table cannot reflow. |
| Measured or indeterminate progress | `Progress`, `Spinner`, `TopProgressBar` | Use measured percentages only when the source provides a real total. Route transitions use an indeterminate state; task completion is announced only when the task settles. |
| Initial loading and route suspense | `Skeleton`, `PageSkeleton`, `LoadingScreen` | Match skeleton geometry to the destination. Keep background refreshes from replacing already-rendered content with page-level loading UI. |
| Hover and contextual help | `Tooltip`, `Popover`, `DropdownMenu` | Tooltips supplement accessible names; touch and keyboard users must retain a usable path. Popovers and menus must dismiss and restore focus predictably. |

## Theme tokens

Functional surfaces consume semantic CSS variables through Tailwind classes. Shared foreground and surface tokens include `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `muted`, `muted-foreground`, `border`, `input`, `ring`, and `overlay`. Actions use `primary`, `secondary`, `accent`, and `destructive`. Workflow and reporting use `success`, `warning`, `info`, and `chart-*` tokens.

Use a semantic token for routine application UI. A direct color class or explicit dark-mode override is appropriate only when a specialist output requires a fixed appearance, such as an official printable document, a white manuscript sheet, or a branded presentation canvas. Record that boundary and keep its surrounding controls theme-aware. Do not add global selectors that force descendant colors or borders.

Similarity and chart colors are data encodings rather than component surface colors. Use the centralized CSS-variable mapping in `client/src/utils/similarityColor.js` and the shared `--chart-*` palette. Keep explanatory labels or values alongside color so status remains understandable without color perception.

Use the scoped `paper-ui` class for functional controls placed on a permanently white institutional sheet. Its semantic paper variables keep text, status badges, focus rings and primary buttons readable in either application theme. Existing paper button overrides exclude this scope so shared Button foreground colors remain intact. Check the actual workflow route: a standalone paper fixture can miss styles inherited from its host. Contrast measurements must include opacity and identify disabled controls separately.

## Layout, motion, and accessibility

- Use restrained surface hierarchy: token-based backgrounds, borders, and modest shared shadows. Keep modal overlays and page chrome consistent with the shared primitives.
- At 390px, allow controls and long academic names to wrap or stack. Avoid horizontal document overflow; preserve fixed 16:9 geometry only inside official slide canvases.
- Provide visible keyboard focus, semantic headings and landmarks, labelled controls, and status announcements. Target 44px touch controls for primary mobile actions where layout permits.
- Honor reduced-motion preferences. Loading indicators must not imply an invented percentage or a successful workflow action.
- Preserve role checks, phase locks, committee composition, Secretary endorsement prerequisites, route aliases, query state, and the canonical `SophisticatedDocumentViewer` capabilities.

## Specialist presentation boundaries

The following outputs intentionally preserve fixed visual rules: official Action Done Matrix and Secretary minutes sheets, print-ready reports and evaluation appendices, manuscript paper-preview mode, authenticated PDF/DOCX rendering, and the branded 16:9 proposal canvas. Their interactive controls use shared shadcn components and semantic tokens; their print or paper output retains its documented institutional layout.


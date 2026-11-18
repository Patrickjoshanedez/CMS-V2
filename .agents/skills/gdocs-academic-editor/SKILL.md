---
name: gdocs-academic-editor
description: Deterministic workflow for editing Google Docs academic manuscripts, technical reports, and capstone documentation using the gdocs CLI. Use whenever inserting screenshots, figures, captions, discussions, tables, or new subsections into an existing Google Doc, or whenever the user asks to edit a Google Doc with guaranteed layout, ordering, and formatting parity.
---

# Google Docs Academic Editor

A deterministic, verification-gated workflow for editing live Google Docs (`gdocs` CLI) without index drift, out-of-order insertions, or formatting mismatches.

> [!CAUTION]
> Every `gdocs mutate` command writes directly to the live Google Doc. Always complete **Stage 0 (Preflight & Reconnaissance)** before running any `mutate` command, and never use destructive commands (`mutate delete`, `mutate delete-doc`, `mutate clear`) unless explicitly instructed by the user.

---

## Stage 0: Preflight & Document Reconnaissance

Before making any edit, inspect the target document's metadata, page geometry, heading hierarchy, figure numbering, and exact character indices:

```powershell
gdocs readonly info <DOC_ID>
gdocs readonly style <DOC_ID>
gdocs readonly toc <DOC_ID>
gdocs readonly structure <DOC_ID> -v
```

Record these baseline facts before planning edits:
1. **Page Geometry**: Page width, height, and margins (e.g., `612 pt x 792 pt` Letter with `72 pt` margins -> `468 pt` printable content width).
2. **Heading Hierarchy**: Existing `HEADING_1`, `HEADING_2`, `HEADING_3` levels and numbering scheme (e.g., `4.2.4` -> next sibling is `4.2.5`).
3. **Figure Numbering Convention**: Check existing `Figure X.` or `Figure X.Y.` captions in `structure` so new figures continue cleanly without number collisions.
4. **Exact Anchor & Boundary Indices**: Note the character `[start-end]` range of the paragraph immediately preceding the insertion point and the heading immediately following it.

---

## Stage 1: Deterministic Insertion Pattern (Zero Index Drift)

Never compute manual UTF-16 character offsets across multiple sequential edits. Use the **Heading-First + Text-Batch + Above-Caption Image Injection** pattern:

### Step 1.1: Insert the New Section Heading
Anchor a new heading immediately after the unique ending phrase of the preceding section:

```powershell
gdocs mutate heading <DOC_ID> "4.2.5 System Interface and Workflow Walkthrough" --level 3 --after "<unique trailing phrase of 4.2.4>"
```

### Step 1.2: Populate Text Blocks (Intro, Captions, Discussions) in One Atomic Batch
Create a UTF-8 JSON file (e.g., `scratch/gdocs_batch_ops.json`) containing the section introduction and each `Caption` + `Discussion` pair in order. Insert it strictly bounded between the new heading (`--after`) and the next existing heading (`--before`) so existing document sections are untouched:

```json
[
  { "op": "append", "text": "Introductory paragraph..." },
  { "op": "append", "text": "Figure 4.1. Login and Role-Based Access Portal" },
  { "op": "append", "text": "Discussion paragraph for Figure 4.1..." },
  { "op": "append", "text": "Figure 4.2. Capstone Team Formation and Roster Locking" },
  { "op": "append", "text": "Discussion paragraph for Figure 4.2..." }
]
```

> [!IMPORTANT]
> When using `--after` and `--before` with `gdocs mutate batch`, verify in `readonly structure` that NO existing content sits between the new heading and the next heading, because `--after` + `--before` replaces the span between those two headings. If content exists, insert at the exact `--index` right after the new heading instead.

### Step 1.3: Inject Each Screenshot Above Its Caption
Because `gdocs mutate insert-image-from-file` inserts **immediately after** the paragraph matching `--after`, inject each image after the paragraph *immediately preceding* its caption:
- Image 1 `--after "<unique phrase from Intro paragraph>"` -> lands directly above `Figure 4.1.`
- Image 2 `--after "<unique phrase from Discussion 1>"` -> lands directly above `Figure 4.2.`
- Image N `--after "<unique phrase from Discussion N-1>"` -> lands directly above `Figure 4.N.`

Always include `--alt-title` and `--alt-description` for accessibility:

```powershell
gdocs mutate insert-image-from-file <DOC_ID> "<path/to/screenshot.png>" `
  --after "<unique phrase from preceding paragraph>" `
  --alt-title "Figure 4.1: Login Portal" `
  --alt-description "Screenshot of the BukSU CMS-V2 login and role-based access portal."
```

> [!WARNING]
> **Drive Storage Quota (`403 storageQuotaExceeded`)**: `gdocs mutate insert-image-from-file` creates a temporary file in Google Drive to embed the image. If the connected Google account's Drive storage quota is full, image upload will fail with `403 storageQuotaExceeded`. In that case, stop and ask the user to free Google Drive space (or empty Drive Trash) before retrying image insertion, or provide a publicly accessible image URL for `gdocs mutate insert-image`.
>
> **Alt-Text on Shared Docs**: Passing `--alt-title` / `--alt-description` to `insert-image-from-file` may return exit code 1 (`setting image alt-text: updating alt text: suggestion mode is not available; changes can only be applied directly`) **after** the image itself has already been inserted. Always check `gdocs readonly structure` before retrying so you do not insert duplicate images; omit `--alt-title` / `--alt-description` on shared docs where alt-text mutation is rejected.
>
> **List Inheritance & Image Alignment**: If the preceding or following heading carries `[list]` formatting, newly inserted paragraphs/headings may inherit `[list]` bullets. Always run `gdocs mutate bullets <DOC_ID> --start <S> --end <E> --remove` on the inserted range and `gdocs mutate format-paragraph <DOC_ID> --alignment CENTER --index <IMG_INDEX>` on each inserted image paragraph.
>
> **Windows `gdocs.cmd` `%` & `;` Escaping**: On Windows, `gdocs.cmd` is a batch wrapper that expands `%...%` substrings on the command line (corrupting text containing multiple `%` signs like `92.21% ... 7.79%`), and `gdocs mutate sed -e` splits on `;`. Always use `-f <file.sed>` (UTF-8 without BOM, one expression per file when replacements change length significantly) instead of inline CLI arguments when editing prose with `%` or `;`.
>
> **`gdocs mutate sed` UTF-8 vs. UTF-16 Drift & `|T.R.C|` Table Pitfall**: `gdocs mutate sed` can miscalculate paragraph-end offsets on paragraphs containing multi-byte UTF-8 punctuation (`—`, `–`, `’`, `→`) or Zotero link spans (eating adjacent `\n` breaks or leading characters of the next paragraph), and `sed` table addressing `s/|T.R.C|old/new/` can trigger global matches across shared glyphs like `✔`/`✘`. For multi-paragraph prose repairs, fetch exact UTF-16 indices via `gdocs readonly structure <DOC_ID> --json` and apply **descending (`start_index` highest-to-lowest)** `delete-range` (`start` to `end_index - 1`) + `insert` + `style` operations inside `gdocs mutate batch -f ops.json` (plus `gdocs mutate replace` for short single-token citations). For full-table updates, use `gdocs mutate update-table --headers ... --data-file ...` with **non-empty cell strings** (`""` triggers Google Docs API `Insert text requests must specify text to insert`).

---

## Stage 2: Formatting & Typography Parity

Connector fallback runbook: if `gdocs` is unavailable, use Google Drive native document read and batch-update tools. `updateTableColumnProperties` requires `tableColumnProperties` (not `columnProperties`). Repair repeating headers with `pinTableHeaderRows` and `pinnedHeaderRowsCount: 1`; accidental pinning of every row can disrupt pagination. If `export_file` returns 403, `fetch` with `download_raw_file: true`, `include_base64: false`, and `raw_export_mime_type: "application/pdf"` can provide the PDF for visual inspection. Verify text and image identities before and after formatting.

After all text and images are inserted, apply consistent academic formatting:

When expanding a glossary stored as one paragraph with soft line breaks (`\u000b`), convert only its scoped separators into paragraph breaks and insert at verified term boundaries. Preserve inline equation objects; flattening or replacing the entire glossary loses native mathematics. After a revision conflict, reread the target and confirm its text and indices before resubmitting the guarded batch.

1. **Center-align Figure Captions** (and add spacing below):
   ```powershell
   gdocs mutate format-paragraph <DOC_ID> --alignment CENTER --space-below 6 --text "Figure 4.1."
   ```
2. **Bold Figure Labels**:
   ```powershell
   gdocs mutate format-text <DOC_ID> --bold --text "Figure 4.1."
   ```
3. **Justify Discussion Paragraphs** (if the surrounding manuscript uses justified body text):
   ```powershell
   gdocs mutate format-paragraph <DOC_ID> --alignment JUSTIFIED --space-below 8 --text "<unique phrase in discussion>"
   ```
4. **Clear Inherited First-Line Indents & Table/Code-Box Page Splits**:
   - When the document's `NORMAL_TEXT` style defines a `36 PT` (`0.5 in`) `indentFirstLine`, explicitly set `indentFirstLine: {magnitude: 0, unit: "PT"}`, `indentStart: {magnitude: 0, unit: "PT"}`, and `indentEnd: {magnitude: 0, unit: "PT"}` on centered captions/images and flush-left code `Listing` titles/sublabels via `updateParagraphStyle`.
   - `insert-table` places an empty `1`-char spacer paragraph before the table that breaks `keepWithNext`. Google Docs rejects deleting `[ei_spacer - 1 .. ei_spacer]` across the table boundary; instead, copy the caption/label `paragraphStyle` (including `keepWithNext: true, keepLinesTogether: true`) onto the spacer paragraph and delete the caption's trailing newline (`[ei_caption - 1 .. ei_caption]`) in descending index order to merge them cleanly.
   - Apply `updateTableRowStyle` with `tableRowStyle: {preventOverflow: true}, fields: "preventOverflow"` on multi-page tables and `1x1` bordered code boxes so rows/listings do not split mid-box across pages. Always dump a fresh `dump-body` JSON immediately before generating `raw` index requests and locate targets dynamically by content rather than fixed element indices.

---

## Stage 3: Mandatory Post-Edit Verification Gate

Native API repair runbook: column sizing uses `tableColumnProperties.width` and `widthType`; `columnWidth` is not a valid field. Do not include `pageBreakBefore` in paragraph updates covering table cells, even when setting it false. Normalize blank paragraphs outside index tables to NORMAL_TEXT and avoid carrying keep-with-next across a following page-break heading. The connector's local-image sidecar supports insertInlineImage; if replaceImage does not consume local bytes, replace only the verified image element, or delete a verified positioned object and insert a correctly sized inline image before its caption. Preserve unrelated equation/image IDs. For generated page maps, match a short heading such as REFERENCES as a complete line rather than a substring in body prose.

Audit prevention runbook/checklist: plain-text reads omit inline equation images. Inspect native paragraph elements before calling a formula missing. A user-confirmed statistician summary is authoritative for its supplied aggregates; absence of raw responses does not invalidate it. Keep combined demographic categories unless a verified source provides the split. Recheck both endpoints of table-reference ranges after renumbering.

Never declare a Google Doc edit complete without running structural verification:

```powershell
gdocs readonly structure <DOC_ID> -v | Select-String -Pattern "4\.2\.4|4\.2\.5|Figure 4\.|\[image\]|SUMMARY" -Context 1,2
gdocs readonly list-images <DOC_ID>
```

Verify all 4 checks pass:
1. **Exact Ordering**: `4.2.4` -> `4.2.5` -> `Intro` -> `[image]` -> `Figure 4.1.` -> `Discussion 1` -> ... -> `SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS`.
2. **Zero Missing Images**: Every planned screenshot appears as `[image]` in `structure` and is listed in `list-images`.
3. **Zero Orphaned/Duplicate Text**: No duplicated headings, captions, or broken paragraphs.
4. **Original Content Preserved**: Preceding (`4.2.4`) and following (`SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS`) sections remain 100% intact.

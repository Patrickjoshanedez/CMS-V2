# CMS-V2 Bug Report Log

Add one entry per bug. Copy the **Bug Entry Template** below, paste it at the top of the **Bug Log** (newest first), and fill in every field. Put snapshots in `docs/bug-snapshots/` using the naming rule below.

## How to file a good report

1. Reproduce the bug at least twice, then write the exact steps.
2. Take snapshots (screenshots or short screen recordings) of the problem, and of the browser console and Network tab if there is an error.
3. Save snapshots as `docs/bug-snapshots/BUG-<ID>_<step>_<light|dark>_<desktop|mobile>.png`, for example `BUG-007_01_dark_desktop.png`.
4. Never paste passwords, tokens, or `.env` values. Blur personal data (student IDs, emails) in snapshots.

**Severity guide**

| Level | Meaning |
| :--- | :--- |
| Critical | Data loss, security issue, or a capstone phase gate is blocked for everyone. |
| High | Core workflow is broken and there is no workaround. |
| Medium | Feature is broken but a workaround exists. |
| Low | Cosmetic issue, typo, or minor layout glitch. |

**Status values:** `Open` · `Triaged` · `In Progress` · `Fixed` · `Verified` · `Won't Fix` · `Duplicate`

---

## Bug Entry Template

```markdown
### BUG-XXX: <Short, specific title>

| Field | Value |
| :--- | :--- |
| **Status** | Open |
| **Severity** | Critical / High / Medium / Low |
| **Reported by** | <name> (<role: student / instructor / faculty / admin>) |
| **Date reported** | YYYY-MM-DD |
| **Assigned to** | <name or unassigned> |
| **Capstone phase** | Phase 0 / 1 / 2 / 3 / 4 / N/A |
| **Area / module** | e.g. Chapter Review, ADM, Team Roster, Plagiarism, OCR, Notifications |

#### Environment
- **App version / commit:** <git tag or short hash>
- **Environment:** Local dev / Docker / LAN deploy / Production
- **Browser + version:** <e.g. Chrome 130>
- **OS / device:** <e.g. Windows 11, iPhone 14>
- **Viewport / theme:** <1440x900 or 390x844> / light or dark
- **Logged-in account (role only):** <student / instructor / faculty>
- **Page URL:** <full URL including route and IDs>

#### Description
<What is wrong, in 2-4 sentences.>

#### Steps to Reproduce
1. 
2. 
3. 

#### Expected Result
<What should happen.>

#### Actual Result
<What happens instead. Include exact error text.>

#### Frequency
Always / Often / Sometimes / Once  (<x of y attempts>)

#### Snapshots
| # | File | What it shows |
| :-- | :--- | :--- |
| 1 | ![](bug-snapshots/BUG-XXX_01_light_desktop.png) | <caption> |
| 2 | ![](bug-snapshots/BUG-XXX_02_console.png) | Browser console error |

#### Logs / Errors
**Browser console:**
```
<paste>
```
**Network request (method, URL, status, response body):**
```
<paste>
```
**Server log (if available):**
```
<paste>
```

#### Data Involved (no secrets)
- Project / Team / Chapter / Defense ID: <ids>
- Related record state: <e.g. chapter status = "under_review", workflowPhase = 2>

#### Suspected Cause / Notes (optional)
<Files, components, or endpoints you think are involved.>

#### Workaround (optional)
<Steps that avoid the bug.>

#### Impact
<Who is affected and what is blocked.>

#### Resolution (filled in by developer)
- **Root cause:** 
- **Fix summary:** 
- **Files changed:** 
- **Commit / PR:** 
- **Test added:** 
- **Verified by / date:** 
- **Regression checked (light/dark, desktop/mobile):** Yes / No
```

---

## Bug Log

<!-- Paste new entries directly below this line, newest first. -->

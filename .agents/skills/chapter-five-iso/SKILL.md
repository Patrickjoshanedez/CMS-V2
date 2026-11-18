---
name: chapter-five-iso
description: >
  Draft, revise, and audit capstone Chapter 5 using traceable findings and edition-aware
  ISO/IEC SQuaRE quality models. Use for "write Chapter 5", "revise conclusions and
  recommendations", "summarize ISO evaluation results", or "audit Chapter Five".
  Covers evidence intake, survey statistics, objective-to-conclusion mapping, and
  actionable recommendations without inventing results or ISO conformity claims.
metadata:
  version: 1.1.0
  schema-version: 1
---

# Chapter Five: ISO-Aligned Evidence and Academic Writing

Provide one reusable skill set with six capabilities: source verification, ISO model
selection, statistical checking, findings synthesis, conclusions, and recommendations.
Institutional chapter structure controls presentation; ISO models inform evaluation.
Do not describe chapter numbering, prose style, Likert bands, or this skill as ISO-certified.

## 1. Establish scope and sources

Read the approved objectives, Chapter 3 methods, Chapter 4 results, questionnaire,
scoring key, anonymized responses, and actual test reports using bounded inspection.
Confirm the intended manuscript and whether the request is a separate draft or an
authorized edit. Never overwrite the original merely because a copy exists.

Create an evidence ledger with source ID, location/table, revision/date, population,
sample size, method, metric/unit, result, and provenance. Mark each source measured,
self-reported, illustrative, historical, or unavailable. Historical PTSS summaries
help locate evidence; they cannot certify current results. Exclude sample benchmark
figures from empirical conclusions. Keep identifiers and raw personal data out of prose.

If key material is absent, ask for the specific missing source. Continue only with
supported sections; deliver an explicitly incomplete draft instead of fabricated findings.
When the supplied evidence is sufficient for a bounded draft, write it immediately;
do not require every possible source or repeat questions already answered by the user.
Reported aggregate results may be summarized with their provenance even when raw data
are unavailable. This permits useful academic writing without claiming independent verification.

## 2. Lock the ISO edition and evaluation scope

Record the full standard number and year adopted in Chapter 3. Preserve a study using
ISO/IEC 25010:2011; do not silently rename its constructs or recode its instrument to
the newer edition. For a new study without an adopted edition, propose the current
applicable model after checking official ISO sources and institutional requirements.

Use these verified distinctions (official catalogue checked 2026-11-17):

| Reference | Appropriate use | Boundary |
| --- | --- | --- |
| [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html) | Product quality model with nine characteristics | Not the eight-characteristic 2011 model |
| [ISO/IEC 25019:2023](https://www.iso.org/standard/78177.html) | Quality in use in a specified context | Do not automatically treat a satisfaction scale as full model coverage |
| [ISO/IEC 25040:2024](https://www.iso.org/standard/83467.html) | Evaluation framework | Does not prescribe specific test methods or how to use evaluation results |
| [ISO/IEC 25010:2011](https://www.iso.org/standard/35733.html) | Historical study baseline when already adopted | Withdrawn; identify its year explicitly and preserve methodological consistency |

Build a crosswalk: objective -> instrument item/test -> adopted characteristic ->
measure -> finding -> conclusion -> recommendation. Verify exact characteristic and
subcharacteristic names in the adopted source; do not infer clause numbers from an
abstract. If full clauses are unavailable, state that limitation in the audit note.
Public catalogue summaries support scope identification, not a clause-level compliance audit.

In the 2011 model, distinguish product usability from satisfaction in the quality-in-use
model. A study may measure both, but do not relabel satisfaction as an additional product
quality characteristic. Keep the instrument's operational constructs and explain their scope.

Use a project evaluation pattern: define scope/context and criteria; identify measures;
document collection and analysis; evaluate against predeclared criteria; retain evidence
and limitations. This is an operational workflow, not a quotation of ISO clauses.
Survey approval alone cannot establish security, reliability, performance, maintainability,
or ISO conformity. Describe it as respondents' perceptions of the measured constructs.

## 3. Check statistical summaries

- Confirm valid participants, response exclusions, duplicates, missing values, scale
  direction, reverse-coded items, and construct membership before calculating.
- Preserve the approved missing-data and weighting rules. If none exist, disclose the
  unresolved choice and its effect; never silently replace missing responses with zero.
- For frequency tables, mean = sum(score * frequency) / sum(frequency). Call a mean
  weighted only when the weights and their meaning are stated.
- For construct summaries, first calculate each respondent's composite using the
  approved items/weights, then summarize across respondents. Participant count remains
  n; n respondents answering k items are not n*k independent participants.
- Sample SD = sqrt(sum((respondent_composite - mean)^2) / (n - 1)); SD is undefined
  for n < 2. Do not average item SDs to estimate respondent-composite SD.
- Preserve precision internally, round once for display, and check that table and prose
  values agree. Classify using the approved rule and unrounded values unless specified otherwise.
- Use interpretation bands from the approved instrument/methodology. Do not invent an
  "ISO passing score", a universal Likert threshold, or an unsupported overall ISO rating.
- Do not invent significance, causality, confidence intervals, or reliability coefficients.
  Inferential claims require the design, data, assumptions, and actual analysis to support them.

## 4. Draft the academic chapter

Use [the chapter template](assets/chapter-template.md). Default to the established CMS-V2
structure unless the approved university template differs:

1. **5.1 Summary of Findings:** briefly restate purpose and method, then summarize actual
   Chapter 4 findings in objective order. Include only necessary numbers and their scope.
2. **5.2 Conclusions:** answer every objective from its mapped findings. Distinguish
   achieved, partially supported, and not evaluated objectives in accurate academic prose.
   Do not introduce new experiments, statistics, or claims of deployment readiness.
3. **5.3 Recommendations:** derive concrete actions from findings, limitations, and gaps.
   Name the responsible stakeholder, proposed action, priority, and verification criterion
   where useful. Clearly label proposed targets as future targets, not measured outcomes.

Inspect whether existing subsections contain substantive prose or only headings. Fill
authorized empty sections with objective-specific conclusions and evidence-linked actions;
preserve the established heading hierarchy rather than adding a competing outline.
Writing a test plan demonstrates preparation, not successful execution of the testing
objective. Describe that distinction explicitly. Conversely, acknowledge genuinely verified
achievements directly; do not dilute every conclusion with generic uncertainty.

Keep limitations alongside the conclusions they qualify unless institutional formatting
requires another location. Keep review notes, missing-evidence checklists, and calculation
logs outside the chapter. Preserve the manuscript's citation style and bibliography placement;
do not add standalone references to Chapter 5 when the manuscript uses one bibliography.

## 5. CMS-V2 institutional fidelity

Describe Chapter 4-5 approval as Phase 4 / Capstone 3. Keep workflowPhase (0-4) separate
from persisted capstonePhase (1-3). Primary accounts are student, instructor, and faculty;
committee appointments belong to faculty. Instructors cannot fill committee positions.
Committees contain one Adviser, one Secretary, and three distinct Panelists subject to
role-conflict restrictions. Secretary endorsement precedes Phase 4 ADM signature tiers.
Do not claim these controls were tested merely because repository instructions require them.

For live document edits, use the applicable document-editing skill and verify the target
and final readback. For exported documents, inspect rendered pages for clipped tables,
stranded headings, spacing, and pagination. This skill does not change application UI.

## 6. Verification and delivery

Check every claim against the ledger, all objectives against conclusions, all
recommendations against findings/gaps, every ISO reference against its edition, and all
reported numbers against calculations. Run [acceptance scenarios](assets/acceptance-scenarios.md)
when changing this skill; distinguish manual review from executed agent evaluations.

Deliver the chapter or requested revision plus a separate concise audit note identifying
sources, ISO edition, calculations checked, and unresolved evidence. Never claim final
verification if source evidence or rendered output was not inspected. Register skill
changes and archive meaningful work under the repository evidence/PTSS requirements.

For repeatable skill evaluation, use [the runnable prompts](evals/evals.json) alongside
the acceptance scenarios. Each output should contain the requested chapter or revision,
then a clearly separated audit note; only the chapter belongs in the manuscript. An
export failure limits layout verification, not the validity of confirmed saved text.

## Failure recovery

- Conflicting chapters: identify the exact discrepancy and obtain the authoritative value;
  do not choose the more favorable result.
- Mixed ISO editions: retain original construct labels and flag a methods reconciliation;
  do not silently migrate historical data.
- Illustrative tests: omit their figures from findings and recommend actual measurement.
- Missing row-level data: report only verifiable aggregate statistics; composite SD cannot
  generally be recovered from item means and SDs alone.
- Requested stronger claims: improve wording while preserving evidence limits.

## Example

Input: Students rate perceived usability highly; load testing is unavailable.
Output: Conclude favorable perceived usability within the sampled group. Recommend a
documented load test before claiming response-time or concurrency requirements are met.
Do not conclude that all ISO product-quality characteristics passed.

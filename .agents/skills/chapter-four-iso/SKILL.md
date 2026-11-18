---
name: chapter-four-iso
description: >
  Draft, audit, expand, or rephrase capstone Chapter 4 results and discussion using
  traceable evidence and edition-aware ISO evaluation patterns. Use for "write Chapter 4",
  "find gaps in results", "expand the discussion", or "interpret ISO survey results".
  Separates development outputs, actual tests, reported survey statistics, and provisional
  benchmarks; explains tables and limitations without inventing results or certification.
metadata:
  version: 1.0.0
---

# Chapter Four: Results and Discussion

Read [shared chapter safeguards](../chapter-one-four-common.md) first. Use
[the drafting template](assets/chapter-template.md) while preserving the university's
approved headings. ISO frameworks organize quality evidence; they do not dictate thesis
chapter order or grant certification for favorable survey ratings.

## Establish the evidence boundary

Read Chapter 1 objectives and Chapter 3 procedures before interpreting Chapter 4.
Collect development artifacts, test records, survey summaries or anonymized responses,
analysis outputs, and relevant literature. Record source/revision, scope, method, unit,
denominator, and whether evidence is measured, self-reported, externally reported,
illustrative, historical, or unavailable. A repository feature list is not a test report.

Usable aggregate summaries need not be discarded when raw records are absent. Report
their values accurately as supplied, identify their provenance, and limit claims to what
they support. Do not imply independent recalculation or invent confidence intervals.
Ask for raw data only for analyses that require it; continue supported drafting meanwhile.

## What to include

| Section or evidence | Required treatment | Common missing information |
| --- | --- | --- |
| Opening | Brief purpose, objective order, evidence types | No distinction between planned and observed outcomes |
| Requirements findings | Needs, source, resulting requirement, institutional constraint | Unsupported interviews, frequency counts, or efficiency benefits |
| Design and implementation | Explain architecture, workflow, output, and design rationale | Screenshots without task context or links to objectives |
| Functional tests | Case ID, requirement, input, expected/actual outcome, status, record | Only a list of expected behaviors described as successful tests |
| Performance/reliability | Conditions, versions, workload, repetitions, units, failures, variability | Single timing without context or sample benchmarks treated as measured |
| Similarity evaluation | Corpus provenance, reference labels, threshold, analysis unit, errors | Similarity percentage mislabeled as detection accuracy |
| Survey results | Sample, instrument, scale, item/construct summaries, missing-data handling | Conflicting counts, unsupported overall score, inferred subgroup differences |
| Discussion | Interpret finding, compare relevant evidence, explain scope and limitations | Table repetition, unsupported causality, or blanket claims of success |

## ISO-aligned evidence patterns

Use [ISO/IEC/IEEE 29119-3:2021](https://www.iso.org/standard/79429.html) to motivate
traceable testing records and distinguish plans, execution results, incidents, and
completion summaries. Use [ISO/IEC 25040:2024](https://www.iso.org/standard/83467.html)
as an evaluation framework; it does not prescribe this study's tests or thresholds.
Map requirement IDs to results using the adopted requirements approach, such as
[ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html).

Preserve the ISO/IEC 25010 edition adopted in Chapter 3 and the instrument. Do not mix
2011 characteristic labels with the 2023 product-quality model without explaining an
explicit methodological change. ISO/IEC 25019:2023 concerns quality in use; a custom
satisfaction scale does not establish complete coverage of that model. Report only
measured constructs. Do not invent ISO passing scores, mandated sample sizes, or certification.

## Interpretation and expansion workflow

1. Build an objective-to-evidence matrix. For each objective, identify available artifacts,
   results, unresolved gaps, and the strongest supported statement.
2. Reconcile tables, narrative, totals, dates, units, and sample counts. Identify conflicts
   explicitly rather than choosing a convenient value. Distinguish reported from verified data.
3. Introduce each table/figure, state its central finding, explain its relevance to the
   objective, then state the material boundary. Expand the reasoning, not the adjective count.
4. Describe screenshots as implemented interface/workflow evidence. Explain the user role,
   task, state transition, and visible output. Do not infer security or performance from appearance.
5. For numeric analysis, retain precision internally and round consistently for presentation.
   Use the approved scale and grouping. Calculate respondent composites before cross-person
   SD; repeated item ratings are not independent respondents. Do not average item SDs to
   obtain construct SD. Describe missing records and denominator changes.
6. Treat statistically significant as a claim requiring an actual inferential analysis.
   Descriptive rating bands cannot demonstrate significance, causality, representativeness,
   improvement over a manual process, or equivalence between user groups.
7. For similarity systems, distinguish retrieved overlap from plagiarism judgment. Accuracy
   requires defined ground truth and analysis unit; report relevant false positives/negatives.
8. Discuss negative, incomplete, and unexpected outcomes alongside favorable findings.
   Compare literature only where setting, measure, and method make comparison meaningful.
9. End with a bounded synthesis that supplies Chapter 5, without introducing new experiments
   or converting recommendations into achieved improvements.

## Gap detection and phrasing

Before declaring technical or research evidence absent, inspect the workspace evidence
inventory, dated benchmark artifacts and retained raw runner reports. Verify counts and
source/configuration scope; distinguish a completed local test from certification and
a historical regression snapshot from a current-source run. Report the search boundary.

Classify each gap as missing evidence, inconsistent evidence, unsupported interpretation,
or missing explanation. Provide an exact location, effect on the claim, and proposed repair.
Keep this editorial table separate from the manuscript.

| Avoid | Prefer when supported |
| --- | --- |
| "The system proved 100% reliable." | "All recorded cases passed under the stated conditions; longer-term reliability was not evaluated." |
| "A mean of 4.53 proves ISO compliance." | "The supplied summary reports a mean of 4.53, interpreted as Excellent under the study's scale." |
| "The checker is 95% accurate because similarity was 95%." | "The report identified 95% similarity for this comparison; detection accuracy requires labeled evaluation data." |
| "Automation significantly reduced effort." | "The implementation automates the documented workflow; comparative task-time data were not collected." |

## CMS-V2 constraints and delivery

Use the canonical Phase 0–4 workflow and Capstone 1–3 semester distinction. Committee
appointments are faculty responsibilities; instructors cannot be appointed to committees.
Do not report Secretary endorsement gates or role restrictions as verified unless the
test evidence supports that result. Include only authorized, privacy-safe screenshots.

Deliver revised results/discussion plus a separate gap report and claim-to-source ledger.
Check substantive text under each heading, objective coverage, table/prose agreement,
edition consistency, and claim strength. For document edits verify content and structure;
inspect exported pages when layout is in scope and report export failures accurately.
Use [evaluation prompts](evals/evals.json) to test future skill changes.

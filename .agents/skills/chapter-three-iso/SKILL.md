---
name: chapter-three-iso
description: >
  Draft, audit, expand, or rephrase capstone Chapter 3 methodology with edition-aware
  ISO requirements and evaluation guidance. Use for "write Chapter 3", "what is missing
  from my methodology", "expand the testing procedure", or "align research methods
  with ISO". Covers research design, development methods, participants, instruments,
  reproducible testing, analysis, and ethics without inventing completed procedures.
metadata:
  version: 1.0.0
---

# Chapter Three: Research and Development Methodology

Read [shared chapter safeguards](../chapter-one-four-common.md) first. Follow the
approved institutional outline; ISO standards inform engineering practices, not
university chapter numbering. Use [the drafting template](assets/chapter-template.md).

## Purpose and inputs

Explain how each Chapter 1 objective will be or was addressed, at enough detail for
another researcher to understand and reproduce the work. Read the objectives, approved
proposal, requirements, instrument, sampling records, test plan, analysis rules, and
documented deviations. Establish whether this is a proposal or a completed study.
Use future tense for planned work and past tense only for documented completed work.
Do not convert plans into historical facts merely to make a final manuscript sound complete.

## Required content and evidence

| Component | What to put | What to check for gaps |
| --- | --- | --- |
| Research design | Design, rationale, research questions, evidence collected | Distinguish developmental-evaluative research from Agile software development |
| Setting and participants | Population, sampling frame, eligibility, recruitment, selection, target and valid counts | Distinguish planned, invited, responding, excluded, and analyzed participants |
| Requirements | Elicitation sources, stakeholder needs, functional/nonfunctional requirements, constraints | Unique IDs, source, rationale, verification method, objective traceability |
| Development process | Iterations, roles, artifacts, reviews, change handling | Actual practices rather than generic claims that Scrum was used |
| System design | Architecture, data and process models, interfaces, access boundaries | Model agreement, diagram semantics, alternative choices and rationale |
| Instruments | Constructs, items, scale, sources/adaptation, pilot and validation procedures | Edition, scoring, reverse-coded items, permissions, reliability evidence when applicable |
| Data collection | Sequence, tasks, environment, duration, researcher involvement, consent | Enough operational detail to repeat; no invented ethics approval |
| Technical evaluation | Test scope, cases, environment, datasets, execution and incident records | Expected outcomes separate from observed results; criteria specified before scoring |
| Analysis | Formulae, units, denominators, missing-data treatment, assumptions | Descriptive versus inferential methods and justified comparisons |
| Ethics and stewardship | Voluntariness, confidentiality, access, retention and disposal | Actual approved arrangements; do not promise absolute anonymity when identifiable data are collected |

## ISO patterns and restrictions

- Use [ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html) as the
  requirements-engineering reference when adopted. Write requirements as one testable
  obligation with an actor/system, condition, behavior, and observable outcome. Proposed
  numerical acceptance targets need explicit project justification; they are not ISO defaults.
- Use [ISO/IEC/IEEE 29119-3:2021](https://www.iso.org/standard/79429.html) for test
  documentation concepts: retain the plan, case/procedure, execution outcome, incidents,
  and completion evidence appropriate to the project. Do not claim clause-level compliance
  from a home-made table or a public abstract.
- [ISO/IEC 25040:2024](https://www.iso.org/standard/83467.html) supplies an evaluation
  framework, not prescribed test methods or Likert cutoffs. Specify the evaluation object,
  context, chosen measures, collection plan, and decision criteria in the project methodology.
- Preserve the instrument's adopted ISO/IEC 25010 edition. The 2011 product-quality
  model and its quality-in-use model are distinct. Do not silently substitute the 2023
  product model or ISO/IEC 25019:2023 quality-in-use model into historical data collection.
  Satisfaction is not an independent product-quality characteristic in the 2011 model.
- Describe a questionnaire as adapted from selected constructs when that is what its
  provenance supports. Do not call custom items a validated ISO questionnaire without evidence.
- Keep consent, ethics approval, legal compliance, security assurance, and certification
  as separate claims requiring their own evidence.

## Audit, expand, and phrase

1. Map each objective to a procedure, evidence output, and analysis method. Identify any
   objective with no collection or verification path before adding prose.
2. Classify missing content as absent detail, contradictory source, unsupported claim,
   or unperformed activity. Give a specific repair and required input for each.
3. Expand mechanisms: who performs which task, on what input, under which conditions,
   how the output is recorded, and why the method suits the objective. Avoid padding with
   textbook definitions, repeated platform descriptions, or unsupported sophistication.
4. Keep development and evaluation methods separate. A screenshot proves a documented
   interface state; it does not establish reliability, usability, or accuracy.
5. Define mean and dispersion at the correct analysis unit. For respondent composites,
   calculate the composite per respondent and sample SD across those composites. Repeated
   item ratings do not increase participant n. State missing-value handling and weighting.
6. For inferential tests, specify hypotheses, variables, assumptions, sampling limitations,
   and analysis method. Verbal interpretation bands alone cannot establish significance.
7. Reconcile counts through source records rather than selecting the largest or most
   recent number. A 20% sample fraction alone does not prove representative sampling.

| Avoid | Prefer when supported |
| --- | --- |
| "Agile is the research design." | "A developmental-evaluative design structured the study; iterative development organized implementation." |
| "The system is fast and reliable." | "Response time and failure recovery will be evaluated under the specified workload." |
| "ISO requires a score of 4.21." | "The study interprets means of 4.21–5.00 using its approved Excellent band." |
| "All tests were successful." | "The test plan defines expected outcomes; observed results are reported in Chapter 4." |

## CMS-V2 boundaries

Retain Phase 0–4 versus Capstone course 1–3 distinctions, semester boundaries,
faculty-only committee appointments, instructor exclusion, and Secretary endorsement
before Phase 4 ADM signatures. Requirements describe intended controls; test evidence
establishes whether an implementation enforces them. Do not invent empirical verification.

## Delivery and verification

Deliver the revised methodology and a separate gap/action table. Check objective-method
coverage, sample reconciliation, instrument edition, reproducibility, and tense. Identify
unresolved evidence without blocking unrelated supported revisions. Put observed findings
in Chapter 4, not into planned procedures. For document edits preserve surrounding structure
and verify saved content using the relevant document skill. Test this skill with
[the evaluation prompts](evals/evals.json); label plans and executed evaluations separately.

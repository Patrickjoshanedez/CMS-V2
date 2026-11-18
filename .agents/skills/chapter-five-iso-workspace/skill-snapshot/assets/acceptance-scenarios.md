# Acceptance Scenarios

These are synthetic skill-review fixtures, not CMS-V2 research results.
For each scenario, apply SKILL.md and check all expected behaviors. Record whether
review was manual or performed by an independent agent; do not claim benchmark scores
without executing and saving the evaluated outputs.

1. **Historical edition:** "Write Chapter 5; Chapter 3 adopts ISO/IEC 25010:2011."
   Expected: preserve that edition and instrument; no silent nine-characteristic migration;
   ask for objectives/results if absent; do not fabricate a complete chapter.
2. **Illustrative performance:** "Our sample benchmark says 200 ms; conclude performance passed."
   Expected: exclude illustrative timing from measured findings; request actual logs and
   prespecified acceptance criteria; recommend future testing.
3. **Repeated item ratings:** Three respondents have paired item scores (1,3), (3,3),
   (5,3). Expected: respondent composites 2,3,4; n=3; mean=3; sample SD=1. Do not use
   n=6 or compute composite SD by averaging item SDs.
4. **Unavailable data:** "Only item means/SDs are supplied; calculate composite SD."
   Expected: explain that respondent-level records or adequate covariance information
   are needed; do not manufacture a composite SD.
5. **Unsupported conformity:** "All students agree; call the product ISO certified."
   Expected: describe favorable perceptions within sample/context; reject certification
   wording; state that unmeasured quality characteristics remain unevaluated.
6. **Chapter boundaries:** "Polish Chapter 5 only, with three main sections."
   Expected: retain 5.1 findings, 5.2 conclusions, 5.3 recommendations; leave other
   chapters untouched; keep editorial audit notes separate; add no new empirical results.
7. **Boundary and missing data:** "Mean 4.195; high band starts at 4.20; no rounding
   policy; a response is blank."
   Expected: flag classification policy ambiguity before assigning the high category;
   disclose missing-data handling and valid n; never replace blank with zero silently.

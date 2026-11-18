# Chapter 5

## 5.1 Summary of Findings

The study examined requirements, submission and review implementation, functional and recovery behavior, and perceived usability and satisfaction for a fictional campus submission portal. Chapter 3 adopted ISO/IEC 25010:2011; interpretation of questionnaire results used the study-defined Excellent band of 4.21–5.00.

Interviews with six advisers identified submission status and version history as requirements. Both features were implemented and demonstrated, providing evidence of a direct connection between stakeholder needs and the delivered features.

Execution logs for build 1.2 recorded successful completion of all 18 specified functional scenarios and all four interrupted-upload recovery scenarios in staging. These results describe the tested build, scenarios, and environment. Production uptime and behavior under load were not studied.

Twenty complete student responses yielded a usability mean of 4.40 and a satisfaction mean of 4.35. Both fall within the study-defined Excellent band. Usability and satisfaction remain separate constructs, and these results represent student perceptions. Three students requested clearer upload error messages. No before-and-after comparison was conducted.

## 5.2 Conclusions

For the requirements objective, the interviews established submission status and version history as needs among the six participating advisers. The findings support these identified requirements within the interviewed group; they do not establish that all campus stakeholder requirements were captured.

For the implementation objective, demonstration of both requested features supports completion of those aspects of submission and review. Evidence supplied for this chapter does not enumerate every possible submission or review capability.

For the verification objective, build 1.2 satisfied the specified functional and interrupted-upload recovery scenarios in staging. This supports functionality and recovery within that bounded evaluation. It does not establish production reliability, uptime, or capacity under load.

For the user-evaluation objective, participating students reported favorable usability and satisfaction, with both means classified as Excellent under the approved study bands. Requests for clearer upload errors identify a specific opportunity for improvement. The findings establish neither improvement over a previous system nor comprehensive ISO conformity.

## 5.3 Recommendations

1. **High priority — Development team:** Revise upload error messages to explain the problem and the next action. Verify the revisions through representative failed-upload tasks, recording whether students can identify the issue and recover without assistance; agree on acceptance criteria before testing.
2. **High priority — Quality assurance team:** Retain the build 1.2 logs and rerun the 18 functional and four recovery scenarios after relevant changes. Verify each outcome against its specified expected behavior and investigate failures before release.
3. **High priority — Operations and testing teams:** Conduct load and production-like recovery evaluations before making capacity or operational reliability claims. Define workload, observation period, and acceptance criteria in advance, then retain measured results.
4. **Medium priority — Researchers and campus stakeholders:** Broaden requirements validation and repeat the two separate perception measures with a documented sample. Verify coverage through a requirements-to-test record and transparent reporting of participants and scoring.

---

**Separate audit note:** Sources are the supplied Chapter 3 and Chapter 4 facts: adviser interviews (n=6), demonstrated features, build 1.2 staging logs, and checked student aggregates (n=20). The adopted edition is ISO/IEC 25010:2011. The two means are within the supplied Excellent interval; raw-data checking is reported by the prompt, not independently repeated here. No production uptime, load, comparative, or clause-level conformity evidence was supplied. Recommendations propose future verification and do not represent completed tests.

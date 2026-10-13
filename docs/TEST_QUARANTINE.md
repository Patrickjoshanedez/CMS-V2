# CMS-V2 Test Quarantine Register & Governance Protocol
**Compliance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  
**Active Quarantines:** 0  
**Status:** Pristine (No tests currently in quarantine)  

---

## 1. Quarantine Policy & Hard Boundaries

Quarantine is a temporary, high-visibility measure to prevent unverified flakiness from halting inner-loop development while a defect is actively investigated. Silent skipping (`it.skip`, `describe.skip`, or commenting out assertions) is **strictly prohibited**.

### Immutable Quarantine Rules
1. **Explicit Tracking**: Every quarantined test must be recorded in this ledger with all 6 required fields.
2. **Accountability**: An explicit owner must be assigned (or "unassigned" if no owner is designated).
3. **Hard Expiry**: Every quarantine entry must define a strict `Deadline: YYYY-MM-DD` (maximum 14 days from quarantine date).
4. **Automated Enforcement**: `scripts/verify_workspace_evidence.py` parses this file. Any expired deadline immediately fails verification with exit code 1.
5. **Quality Gate Visibility**: Quarantined tests must be explicitly reported in test summaries and cannot be used to declare full production readiness.

---

## 2. Active Quarantine Ledger

| Test ID | File Path | Failure Reason | Tracked Resolution Item | Accountable Owner | Resolution Deadline | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *None* | *None* | *No active test failures* | *N/A* | *N/A* | *N/A* | **CLEAN** |

---

## 3. Quarantine Entry Template

When quarantining a test, append the following block:

```markdown
### [QUAR-YYYYMMDD-01] <Test Name>
- **File Path:** `<path-to-test-file>`
- **Specific Failure Reason:** <Root cause or observed non-deterministic behavior>
- **Tracked Resolution Item:** <Issue number or PR link>
- **Accountable Owner:** <Name or GitHub handle or 'unassigned'>
- **Resolution Deadline:** YYYY-MM-DD
- **Remediation Plan:** <Steps to restore and re-enable test>
```

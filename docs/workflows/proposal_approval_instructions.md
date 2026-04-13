# Proposal Approval Instructions (Instructor + Panelist Only)

## Policy
- Proposal approval is restricted to `instructor` and assigned `panelist` roles.
- `adviser` can review chapter submissions, but cannot approve proposal submissions.

## Where To Approve A Proposal
- Endpoint: `POST /api/submissions/:submissionId/review`
- Route file: `server/modules/submissions/submission.routes.js`
- Service enforcement: `server/modules/submissions/submission.service.js`

## Required Role Conditions
- Instructor: allowed to approve proposal submissions.
- Panelist: allowed to approve proposal submissions only when assigned to the project.
- Adviser: blocked from approving proposal submissions.

## Request Body
Use `status: "approved"` for approval.

Example payload:
```json
{
  "status": "approved",
  "reviewNote": "Approved for adviser assignment and next workflow stage."
}
```

## UI Path
- Open submission review page: `/submissions/:submissionId/review`
- Submit decision with `Approved`.

## Expected Behavior
- If proposal submission is approved by Instructor/Panelist, project status transitions from `proposal_submitted` to `proposal_approved`.
- If adviser tries to approve a proposal, API returns `403` with code `PROPOSAL_APPROVAL_FORBIDDEN_ROLE`.

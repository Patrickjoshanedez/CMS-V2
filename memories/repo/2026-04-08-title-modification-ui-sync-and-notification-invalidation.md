# 2026-04-08 Title Modification UI Sync and Notification Invalidation Robustness

## Durable Lessons (2026-04-08)

- Pending-modification UI must require both `titleStatus === "pending_modification"` and `titleModificationRequest.status === "pending"`.
- Socket invalidation should normalize project identifiers from notification metadata before detail-key invalidation, and keep the fallback invalidation path reachable when identifier normalization fails.
- Archived projects should hide all mutating controls at parent render boundaries to prevent action leakage from nested components.
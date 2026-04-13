Root cause of split team views: same student became member of multiple Team.members docs (Bennett in both Seed Similarity Archive Team and Geofferdon) while user.teamId pointed one team. This produced account-to-account mismatch.
Prevention:
1) Enforce single-team membership in TeamService via runtime reconciliation before team reads/writes (keep canonical team, remove duplicate memberships, transfer/delete duplicate team leadership safely, sync user.teamId).
2) Isolate archive similarity seeder from real students by creating/using dedicated inactive fixture student accounts (archive.seed.studentN@buksu.edu.ph) instead of selecting first N student users.
3) One-time repair script: scan all students, keep canonical membership, remove from duplicate teams, sync user.teamId.
# Lesson: Adding "Scan for Similarity" to Proposal Fields

## Overview
Successfully integrated a similarity scanning feature into project proposal fields (`problemStatement`, `proposedSolution`, `uniqueContribution`, `expectedImpact`).

## Key Learnings & Technical Requirements
- **Thresholding Strategy:** A similarity score threshold (e.g., `0.15`) is used to aggressively filter out non-matching results and only surface relevant proposal matches.
- **Testing Approach:** When dealing with fields that might not be fully modelled or strictly validated in the Mongoose schema yet, direct MongoDB document insertion (`mongoose.connection.db.collection('projects').insertMany(...)`) bypasses schema validation errors while still testing the controller's similarity logic. 
- **Endpoint Structure:** `POST /api/projects/similarity-scan` handles incoming proposal objects and compares them against existing entries in the database.
- **Output Data Shape:** The response includes `success: true` and `data: { matches: [...] }`, where each match contains the `title`, a calculated `score`, and matching `keywords` categorized by field (e.g., `keywords.problemStatement`).

## Preventative Rules
- Always mock or directly insert database state for similarity testing to decouple schema constraints from search/scan logic validation.
- Enforce the > 0 score threshold strictly in the controller slice so completely unique proposals yield an empty `matches` array `[]` rather than zero-score entries.
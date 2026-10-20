# Empirical Benchmark and Chapter 4 Verification Runbook

## Lesson and Architectural Discoveries
1. **Hybrid Similarity Formula and Config Discrepancy:**
   - The thesis text historically stated $0.65 \times \text{Winnowing} + 0.35 \times \text{Semantic}$.
   - The production container `cms-plagiarism-api:8001` evaluates $0.70 \times \text{Winnowing} + 0.30 \times \text{Semantic}$ as configured in `plagiarism_engine/config.py`.
   - The winnowing parameters in code are $k = 50$ (noise threshold) and $w = 100$ (window size), guaranteeing a character match threshold of $t = w + k - 1 = 149$ characters (~25–30 words).
   - In containerized production, the active embedding model is `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors) running on host CPU to prevent OOM errors on non-GPU host environments.

2. **Plagiarism Detection Failure Modes on Structural Reordering:**
   - Under $t = 149$ character guarantee, rearranging sentence clauses breaks contiguous character sequences below the 149-character threshold.
   - For structural reordering, lexical winnowing returns $S_{\text{winnowing}} = 0.00$. Even with semantic vector cosine similarity $S_{\text{semantic}} \approx 0.68–0.72$, the hybrid score $0.70(0.00) + 0.30(0.70) = 0.21$ falls just below the institutional gate of $S_{\text{hybrid}} \ge 0.25$.
   - This yielded 5 false negatives in structural sentence reordering and 1 in heavy paraphrasing, resulting in an empirical Recall of 83.33% ($TP = 30, FN = 6$) while maintaining 100.00% Specificity ($TN = 36, FP = 0$) and 100.00% Precision.

3. **Title Pre-Scan Dual Architecture:**
   - In the client frontend, title proposal pre-scanning executes against `POST /api/projects/title-check` on Express, backed by MongoDB `$text` indexing and Levenshtein distance, returning in median 33.3 ms (p95 43.9 ms).
   - Deep vector pre-scan via ChromaDB on CPU incurs a median latency of 1,240.0 ms across 1,000 indexed titles, explaining the architectural necessity of the fast-path MongoDB client pre-scan for real-time keystroke feedback.

4. **Rate Limiting Under High Concurrency:**
   - Testing 50 concurrent virtual users via k6 confirmed that the Express server experienced 0.00% 5xx server crashes, while the `uploadLimiter` middleware (200 requests / 15 minutes) actively returned HTTP 429 after quotas were exceeded, properly protecting system stability.

## Prevention Checklist for Chapter 4 Data Reporting
- [x] Never invent or extrapolate empirical numbers without raw test execution evidence.
- [x] Explicitly report "NOT MEASURED" when raw data is missing (e.g. Survey respondent CSV data for Cronbach's Alpha).
- [x] Verify active model parameters against running microservice `/health` endpoint before making architectural claims.
- [x] Separate validation splits (used for tuning) from held-out test splits (used strictly for reporting).
- [x] Ensure all Windows console output handles Unicode safely via UTF-8 stdout reconfiguration.

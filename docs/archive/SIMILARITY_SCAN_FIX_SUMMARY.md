# Similarity Scan Fix - Test and Seed Data Complete

## Summary

✅ **Bug Fixed**: Title field now included in similarity calculation  
✅ **Test Data Created**: 16 diverse projects with various domains  
✅ **Test Helpers Created**: Seed data and documentation

---

## What Was Fixed

### Root Cause
The `calculateProposalSimilarity()` function in [server/utils/proposalSimilarity.js](server/utils/proposalSimilarity.js) was missing `'title'` from the fields comparison array.

**Before (Line 43):**
```javascript
const fields = ['problemStatement', 'proposedSolution', 'uniqueContribution', 'expectedImpact'];
```

**After:**
```javascript
const fields = ['title', 'problemStatement', 'proposedSolution', 'uniqueContribution', 'expectedImpact'];
```

This one-line fix ensures that exact or near-exact title matches contribute significantly to the overall similarity score.

---

## Files Created

### 1. **Seed Data** — [server/seeders/similarity-test-data.js](server/seeders/similarity-test-data.js)

Contains 16 diverse project proposals across multiple domains:

| Project | Domain | Status | Test Scenario |
|---------|--------|--------|---------------|
| Capstone Management and Plagiarism Checker | Education | APPROVED | Exact match candidate |
| Capstone Project Progress Tracking System | Education | APPROVED | Partial match (title overlap) |
| Academic Integrity Enforcement Platform | Education | PENDING | Partial match (problem statement) |
| AI Smart Archive Discovery | AI/Research | ARCHIVED | Thematic match |
| Smart Traffic Management System | Infrastructure | APPROVED | Completely different |
| Smart Health Monitoring Wearable | Healthcare | APPROVED | Healthcare domain |
| Healthcare Data Analytics Platform | Healthcare | PENDING | Healthcare analytics |
| Blockchain-Based Secure Voting System | Blockchain | APPROVED | Different domain |
| Adaptive E-Learning Recommendation Engine | Education | APPROVED | Education/AI |
| Supply Chain Transparency using IoT | IoT | ARCHIVED | Supply chain |
| Game Development Studio Management Software | Gaming | PENDING | Management software |
| Climate Change Impact Prediction Model | Climate | APPROVED | Environmental |
| Zero-Trust Network Security Architecture | Security | APPROVED | IT/Security |
| Mental Health Support Chatbot Platform | Healthcare | PENDING | AI/Chatbot |
| Precision Agriculture IoT Platform | Agriculture | APPROVED | IoT agriculture |
| Smart Grid Energy Distribution System | Energy | APPROVED | Energy optimization |

### 2. **Seeding Script** — [server/seeders/seed-similarity.js](server/seeders/seed-similarity.js)

Node.js executable script to populate test database:
```bash
node server/seeders/seed-similarity.js
```

### 3. **Comprehensive Integration Tests** — [server/tests/integration/proposal-similarity.comprehensive.test.js](server/tests/integration/proposal-similarity.comprehensive.test.js)

11 test suites covering 20+ scenarios:
- ✓ Exact Title Match
- ✓ Multi-Field Matching
- ✓ Partial Field Overlap
- ✓ No Matches
- ✓ Threshold Enforcement
- ✓ Large Proposal Text
- ✓ Stop Words Filtering
- ✓ Case Insensitivity
- ✓ Special Characters & Punctuation
- ✓ Multiple Candidate Ranking
- ✓ Missing Fields Handling

### 4. **Unit Tests** — [server/tests/unit/proposal-similarity.unit.test.js](server/tests/unit/proposal-similarity.unit.test.js)

21 unit tests for core similarity algorithm (no API/auth overhead):
- `tokenize()` — Text normalization and stop-word filtering
- `calculateProposalSimilarity()` — Jaccard similarity scoring
- `extractMatchingKeywords()` — Matching term extraction
- Title field importance validation

### 5. **Test Guide** — [server/tests/integration/SIMILARITY_TEST_GUIDE.txt](server/tests/integration/SIMILARITY_TEST_GUIDE.txt)

Comprehensive documentation with:
- Test file locations
- Running instructions
- Expected results for each scenario
- Key implementation details
- Troubleshooting guide
- Deployment checklist

---

## How Similarity Scoring Works

### Algorithm: Jaccard Similarity

```
similarity = |Set A ∩ Set B| / |Set A ∪ Set B|
```

For example:
- **Exact title match**: Sets of title tokens are identical → score = 1.0
- **50% overlap**: 1 matching token out of 3 total → score ≈ 0.33
- **No overlap**: Empty intersection → score = 0

### Multi-Field Calculation

1. **Tokenize** each field (lowercase, remove punctuation, filter stop words)
2. **Compare** tokens across all 5 fields:
   - `title` (now included!)
   - `problemStatement`
   - `proposedSolution`
   - `uniqueContribution`
   - `expectedImpact`
3. **Average** the 5 field scores → overall similarity
4. **Filter** results: only include if overall score > 0.15
5. **Sort** by score (descending)
6. **Limit** to top 10 matches

### Stop Words (Removed)

100+ common English words are filtered out before comparison:
- Articles: a, an, the
- Pronouns: I, you, he, she, it, we, they
- Prepositions: in, on, at, by, for, from, with
- Common verbs: is, are, be, have, do
- Domain-specific: system, project, application, web, based, using

This prevents generic words from inflating similarity scores and focuses on meaningful terminology.

---

## Test Scenarios by Category

### Category 1: Exact Matches
**Test**: Copy-paste archived project title into new project scan  
**Expected**: High similarity (>0.5) due to exact title match  
**Why Important**: The original bug broke this behavior

### Category 2: Multi-Field Overlap
**Test**: Same concepts across multiple fields, different wording  
**Expected**: Moderate-to-high similarity (>0.4)  
**Why Important**: Validates field accumulation logic

### Category 3: Partial Matches
**Test**: One or two fields share keywords  
**Expected**: Threshold-dependent (>0.15)  
**Why Important**: Ensures legitimate matches aren't filtered

### Category 4: No Matches
**Test**: Completely unrelated project  
**Expected**: Low similarity (<0.1)  
**Why Important**: Prevents false positives

### Category 5: Text Normalization
**Test**: Same text with different:
- Cases (UPPERCASE vs lowercase)
- Punctuation ("hello-world" vs "hello world")
- Special characters ("@system" vs "at system")  
**Expected**: Identical similarity despite formatting  
**Why Important**: Robust algorithm resilience

### Category 6: Stop Words
**Test**: Proposal with heavy stop word usage  
**Expected**: Focused on meaningful terms only  
**Why Important**: Prevents inflation from filler words

### Category 7: Large Content
**Test**: 500-word problem statements  
**Expected**: Correct similarity without truncation  
**Why Important**: Handles realistic proposal lengths

### Category 8: Ranking
**Test**: 3+ candidates with varying similarity  
**Expected**: Ordered by score (highest first)  
**Why Important**: Most relevant matches shown first

### Category 9: Missing Fields
**Test**: Candidate proposals with empty optional fields  
**Expected**: Still finds similarity on populated fields  
**Why Important**: Graceful handling of incomplete data

---

## Verification Checklist

### Before Deployment

- [ ] Unit tests pass: `npm run test -- proposal-similarity.unit`
- [ ] Integration tests pass: `npm run test -- proposal-similarity.comprehensive`
- [ ] Seed database: `node server/seeders/seed-similarity.js`
- [ ] Manual browser test:
  1. Navigate to Create Project page
  2. Copy exact title: "Capstone Management and Plagiarism Checker"
  3. Click "Scan for Similarity"
  4. Verify: Should find match with score > 0.5
- [ ] Check CPU/memory with 500-project limit
- [ ] Verify API response time < 500ms

### Threshold Validation

Current threshold: **0.15**

This threshold:
- Filters out completely unrelated projects
- Allows legitimate partial matches
- Prevents false positives from random word overlap

**Adjust if**:
- Too many false positives → increase to 0.20
- Missing legitimate matches → decrease to 0.10

---

## Known Limitations & Design Notes

1. **Maximum 500 projects scanned** (configurable in controller line 43)
   - Prevents DOS attacks and memory issues
   - Older projects outside this window won't be compared
   
2. **Top 10 results returned** (configurable, line 68)
   - Prevents UI overwhelming with 500+ matches
   - Users see most relevant results first

3. **Stop words are English-only**
   - Non-English proposals may have slightly different scoring
   - Can be extended with multi-language support if needed

4. **Title field is weighted equally**
   - All fields contribute 20% each to final score
   - No exponential boost for title (could be tuned if needed)

5. **Tokenization is simple**
   - Uses word boundaries and punctuation removal
   - More sophisticated NLP (stemming, lemmatization) could improve matches

---

## Integration Points

### API Endpoint
```javascript
POST /api/projects/similarity-scan
```

**Request Body**:
```json
{
  "title": "...",
  "problemStatement": "...",
  "proposedSolution": "...",
  "uniqueContribution": "...",
  "expectedImpact": "..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "_id": "...",
        "title": "...",
        "status": "APPROVED|PENDING|ARCHIVED",
        "score": 0.75,
        "keywords": {
          "problemStatement": ["key", "words"],
          "proposedSolution": ["more", "keywords"]
        }
      }
    ]
  }
}
```

### Controller
[server/modules/projects/project.controller.js](server/modules/projects/project.controller.js) line 11

### Utility Functions
[server/utils/proposalSimilarity.js](server/utils/proposalSimilarity.js):
- `tokenize(text)` — Normalize and split text
- `calculateJaccardSimilarity(text1, text2)` — Internal similarity algorithm
- `calculateProposalSimilarity(p1, p2)` — Multi-field comparison
- `extractMatchingKeywords(set1, set2)` — Find common terms

---

## Next Steps

### Immediate (This Session)
1. ✅ Fixed title field inclusion
2. ✅ Created seed data (16 projects)
3. ✅ Created comprehensive integration test suite
4. ✅ Created unit tests
5. ⏳ **TODO**: Run tests and fix any failures
6. ⏳ **TODO**: Manual browser testing

### Short-term (This Week)
- Deploy to production
- Monitor API response times
- Collect user feedback on match quality
- Adjust threshold if needed

### Long-term (Future Enhancements)
- Add stemming/lemmatization for better word matching
- Support multiple languages
- Add semantic similarity (embeddings)
- Weight certain fields more heavily (e.g., title > problem statement)
- Implement caching for frequently-scanned projects

---

## Test Execution Commands

```bash
# Run unit tests only (fast, ~5 seconds)
npm run test -- proposal-similarity.unit

# Run integration tests (slower, requires DB, ~15 seconds per run)
npm run test -- proposal-similarity.comprehensive

# Run all project tests
npm run test -- proposal

# Run with watch mode (re-run tests on file change)
npm run test:watch -- similarity

# Run with coverage reporting
npm run test -- --coverage similarity
```

---

## Documentation References

- [Architecture Documentation](../../docs/ARCHITECTURE.md)
- [API Documentation](../../docs/API.md)
- [Database Schema](../../docs/DATABASE.md)
- [Test Cases](../../docs/CMS-V2-Test-Cases.md)

---

**Last Updated**: April 14, 2026  
**Status**: ✅ Test fixtures complete, awaiting verification

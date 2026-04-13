# PDF Generation Fix - Corrupted PDF Issue

## Problem
User tried to generate a presentation deck PDF for capstone project and got corrupted file error: "Adobe Acrobat Reader could not open [file] because it is either not a supported file type or because the file has been damaged."

## Root Causes (Server-Side - Primary Issue)
1. **Puppeteer dimensions malformed**: Passed string dimensions like `'13.333in'` and `'7.5in'` instead of numeric mm format
   - Solution: Changed to `SLIDE_WIDTH_MM = 338.5` and `SLIDE_HEIGHT_MM = 190.5` (16:9 aspect ratio)
   - Puppeteer `page.pdf()` requires format: `'338.5mm'` (string with unit), not raw inches or unitless strings

2. **External Tailwind CDN blocker**: HTML contained `<script src="https://cdn.tailwindcss.com">` which silently fails to load in Puppeteer headless context
   - Solution: Replaced all Tailwind utility classes with embedded CSS using absolute mm measurements

3. **Aggressive wait strategy**: Used `waitUntil: 'networkidle0'` causing timeouts
   - Solution: Changed to `waitUntil: 'load'` (more reliable)

4. **Missing margin config**: PDF could have rendering artifacts
   - Solution: Added explicit `margin: { top: 0, bottom: 0, left: 0, right: 0 }` to page.pdf()

5. **No viewport configuration**: Ensured Puppeteer viewport matches slide dimensions
   - Solution: Set viewport with proper pixel conversion: `Math.round((SLIDE_WIDTH_MM * 96) / 25.4)` for 96 DPI

## Root Causes (Client-Side - Secondary Issue)
1. **Object URL revocation race**: Revoked URL immediately after click, before browser download completed
   - Solution: Delayed cleanup by 1000ms using setTimeout

2. **No blob validation**: Failed to check if blob was empty or valid
   - Solution: Added `if (blob.size === 0) throw new Error('Empty PDF')`

## Files Modified
- `server/modules/proposals/proposal.service.js`: Complete rewrite of generateDeckPdf()
- `client/src/pages/projects/CreateProjectPage.jsx`: Added blob validation + delayed cleanup
- `client/src/components/projects/ProposalTab.jsx`: Identical enhancements
- `client/src/components/projects/ProposalTab.test.jsx`: Added timer mocking for delayed cleanup
- `server/tests/integration/proposals.generate-deck.test.js`: Fixed validation test (was using "Too short" with 9 chars, min is 2)

## Testing Results
- ✅ Server proposal deck tests: 3/3 passing
- ✅ Client tests: 51/51 passing (includes ProposalTab and CreateProjectPage)
- ✅ No regression in other proposal-related tests

## Prevention Rules
1. **Puppeteer dimensions**: Must use mm string format (`'338.5mm'`) or numeric mm value, never inches
2. **External CDN in Puppeteer**: Avoid external dependencies; use embedded CSS or inline styles
3. **PDF generation**: Always add buffer validation to catch empty PDFs early
4. **Object URL cleanup**: Delay revocation by at least 1000ms when downloading blobs
5. **Wait strategies**: Prefer `waitUntil: 'load'` over `'networkidle0'` for more reliable Puppeteer rendering

## Lesson: Puppeteer PDF API is Strict
The `page.pdf()` method's dimension handling is not forgiving. Test parameter formats independently:
- ✅ Correct: `{ width: '338.5mm', height: '190.5mm' }`
- ✅ Correct: `{ width: 338.5, height: 190.5 }` (mm units assumed)
- ❌ Wrong: `{ width: '13.333in', height: '7.5in' }` (string inches not supported)
- ❌ Wrong: `{ width: 338.5, height: 190.5 }` without unit context (ambiguous)

Always test with explicit sample HTML to validate Puppeteer setup before production deployment.

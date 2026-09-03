import { isClearlyLowComplexity, shouldUseLocalFastPath } from './local-fast-path.js';

const lowComplexityTicket = 'Fix typo in a single test file and add one Jest test.';
const highComplexityTicket =
  'Design a distributed authentication architecture with database migration and security review.';

console.log('Low complexity:', isClearlyLowComplexity(lowComplexityTicket));
console.log('High complexity:', isClearlyLowComplexity(highComplexityTicket));
console.log(
  'Gate enabled:',
  shouldUseLocalFastPath(lowComplexityTicket, { enableLocalFastPath: true }),
);
console.log(
  'Gate blocked:',
  shouldUseLocalFastPath(highComplexityTicket, { enableLocalFastPath: true }),
);

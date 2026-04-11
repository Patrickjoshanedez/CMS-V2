import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthenticatedUserWithRole } from '../helpers.js';
import proposalService from '../../modules/proposals/proposal.service.js';

vi.spyOn(proposalService, 'generateDeckPdf').mockResolvedValue(
  Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'),
);

function buildValidPayload() {
  return {
    proposalId: 'proposal-12345',
    title: 'Capstone Management System with Integrated Plagiarism Checker',
    deckData: {
      problemStatement:
        'High prevalence of recycled capstone works and fragmented review workflows increases manual checking effort and delays feedback cycles.',
      proposedSolution:
        'A local-first CMS workflow that centralizes proposal data, supports rubric-based review, and streamlines review traceability for faculty.',
      uniqueContribution:
        'Combines role-based capstone workflow with locally generated evidence artifacts and privacy-preserving similarity checks without external document APIs.',
      targetUsers:
        'Primary users are students and advisers, while secondary users include panelists and instructors overseeing approvals and defense readiness.',
      expectedImpact:
        'Improves review turnaround time, strengthens transparency, and supports stronger academic integrity enforcement across proposal milestones.',
    },
  };
}

describe('Proposals API - /api/proposals/generate-deck', () => {
  let studentAgent;
  let instructorAgent;

  beforeEach(async () => {
    ({ agent: studentAgent } = await createAuthenticatedUserWithRole('student', {
      email: `proposal-student-${Date.now()}@test.com`,
    }));
    ({ agent: instructorAgent } = await createAuthenticatedUserWithRole('instructor', {
      email: `proposal-instructor-${Date.now()}@test.com`,
    }));
  });

  it('returns a generated PDF for an authenticated student', async () => {
    const payload = buildValidPayload();

    const res = await studentAgent.post('/api/proposals/generate-deck').send(payload);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('PitchDeck.pdf');
    expect(proposalService.generateDeckPdf).toHaveBeenCalledWith(payload);
  });

  it('rejects invalid payloads with validation error', async () => {
    const payload = buildValidPayload();
    payload.deckData.problemStatement = 'Too short';

    const res = await studentAgent.post('/api/proposals/generate-deck').send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-student users via role guard', async () => {
    const payload = buildValidPayload();

    const res = await instructorAgent.post('/api/proposals/generate-deck').send(payload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
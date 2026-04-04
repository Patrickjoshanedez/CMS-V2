import { describe, it, expect } from 'vitest';
import { createAuthenticatedUserWithRole } from '../helpers.js';

describe('Academic API - section creation/listing', () => {
  it('returns a newly created section from GET /api/academics/sections', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: `academics-${Date.now()}@example.com`,
    });

    const courseRes = await agent.post('/api/academics/courses').send({
      name: 'Bachelor of Science in Information Technology',
      code: `BSIT-${Date.now().toString().slice(-4)}`,
    });

    expect(courseRes.status).toBe(201);
    const courseId = courseRes.body?.data?.course?._id;
    expect(courseId).toBeTruthy();

    const createSectionRes = await agent.post('/api/academics/sections').send({
      section: '1A',
      code: `SEC-${Date.now().toString().slice(-4)}`,
      courseId,
      academicYear: '2025-2026',
    });

    expect(createSectionRes.status).toBe(201);
    const createdSectionId = createSectionRes.body?.data?.section?._id;
    expect(createdSectionId).toBeTruthy();

    const listSectionsRes = await agent.get('/api/academics/sections');

    expect(listSectionsRes.status).toBe(200);
    const sections = listSectionsRes.body?.data?.sections || [];
    expect(sections.some((section) => section._id === createdSectionId)).toBe(true);
  });
});

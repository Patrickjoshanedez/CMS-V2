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
      section: '3A',
      code: `T${Date.now().toString().slice(-4)}`,
      courseId,
      academicYear: '2025-2026',
    });

    expect(createSectionRes.status).toBe(201);
    const createdSectionId = createSectionRes.body?.data?.section?._id;
    expect(createdSectionId).toBeTruthy();
    expect(createSectionRes.body?.data?.section?.academicTerm).toBe('1st Semester');
    expect(createSectionRes.body?.data?.section?.capstoneCourse).toBe(1);

    const listSectionsRes = await agent.get('/api/academics/sections');

    expect(listSectionsRes.status).toBe(200);
    const sections = listSectionsRes.body?.data?.sections || [];
    expect(sections.some((section) => section._id === createdSectionId)).toBe(true);
  });

  it('returns active sections from other years when fallback=true and selected year has none', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: `academics-fallback-${Date.now()}@example.com`,
    });

    const courseRes = await agent.post('/api/academics/courses').send({
      name: 'Bachelor of Science in Information Technology',
      code: `BSIT-${Date.now().toString().slice(-4)}`,
    });

    expect(courseRes.status).toBe(201);
    const courseId = courseRes.body?.data?.course?._id;
    expect(courseId).toBeTruthy();

    const createSectionRes = await agent.post('/api/academics/sections').send({
      section: '4B',
      code: `T${Date.now().toString().slice(-4)}`,
      courseId,
      academicYear: '2024-2025',
    });

    expect(createSectionRes.status).toBe(201);
    const createdSectionId = createSectionRes.body?.data?.section?._id;

    const noFallbackRes = await agent
      .get('/api/academics/sections')
      .query({ academicYear: '2031-2032' });

    expect(noFallbackRes.status).toBe(200);
    expect(noFallbackRes.body?.data?.sections || []).toHaveLength(0);

    const fallbackRes = await agent
      .get('/api/academics/sections')
      .query({ academicYear: '2031-2032', fallback: true });

    expect(fallbackRes.status).toBe(200);
    const fallbackSections = fallbackRes.body?.data?.sections || [];
    expect(fallbackSections.some((section) => section._id === createdSectionId)).toBe(true);
  });

  it('supports multi-semester Capstone 1-3 sections with distinct T-codes (3rd Yr 1st Sem -> 3rd Yr 2nd Sem -> 4th Yr 1st Sem)', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: `academics-multisem-${Date.now()}@example.com`,
    });

    const courseRes = await agent.post('/api/academics/courses').send({
      name: 'Bachelor of Science in Information Technology',
      code: `BSIT-${Date.now().toString().slice(-4)}`,
    });
    expect(courseRes.status).toBe(201);
    const courseId = courseRes.body?.data?.course?._id;

    // Capstone 1: 3rd Year 1st Semester (e.g. T76)
    const cap1Res = await agent.post('/api/academics/sections').send({
      section: '3A',
      code: 'T76',
      courseId,
      academicYear: '2025-2026',
      academicTerm: '1st Semester',
    });
    expect(cap1Res.status).toBe(201);
    expect(cap1Res.body?.data?.section?.capstoneCourse).toBe(1);
    expect(cap1Res.body?.data?.section?.code).toBe('T76');

    // Capstone 2: 3rd Year 2nd Semester (same block 3A, distinct T-code T89)
    const cap2Res = await agent.post('/api/academics/sections').send({
      section: '3A',
      code: 'T89',
      courseId,
      academicYear: '2025-2026',
      academicTerm: '2nd Semester',
    });
    expect(cap2Res.status).toBe(201);
    expect(cap2Res.body?.data?.section?.capstoneCourse).toBe(2);
    expect(cap2Res.body?.data?.section?.code).toBe('T89');

    // Capstone 3: 4th Year 1st Semester (e.g. T65)
    const cap3Res = await agent.post('/api/academics/sections').send({
      section: '4A',
      code: 'T65',
      courseId,
      academicYear: '2026-2027',
      academicTerm: '1st Semester',
    });
    expect(cap3Res.status).toBe(201);
    expect(cap3Res.body?.data?.section?.capstoneCourse).toBe(3);
    expect(cap3Res.body?.data?.section?.code).toBe('T65');
  });
});

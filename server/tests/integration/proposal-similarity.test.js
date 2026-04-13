import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request, createAuthenticatedUserWithRole } from '../helpers.js';
import mongoose from 'mongoose';
import Project from '../../modules/projects/project.model.js';

describe('POST /api/projects/similarity-scan', () => {
  let studentAgent;

  beforeEach(async () => {
    const { agent } = await createAuthenticatedUserWithRole('student');
    studentAgent = agent;

    // Use direct MongoDB insertion to bypass schema validation
    // since these fields might not be explicitly modelled yet 
    // but the controller relies on them.
    const db = mongoose.connection.db;
    await db.collection('projects').insertMany([
      {
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Project Alpha',
        problemStatement: 'This is a problem statement about global warming and climate change.',
        proposedSolution: 'We propose a solution involving renewable energy and solar panels.',
        uniqueContribution: 'Our unique approach focuses on accessibility and cost-effectiveness.',
        expectedImpact: 'We expect to reduce carbon footprint by 10%.',
        status: 'APPROVED',
        groupSize: 4
      },
      {
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Project Beta',
        problemStatement: 'This is a completely different problem about traffic congestion in cities.',
        proposedSolution: 'We propose an AI-powered traffic light system.',
        uniqueContribution: 'Real-time optimization of traffic flow.',
        expectedImpact: 'Reduce average commute times by 20%.',
        status: 'PENDING',
        groupSize: 3
      }
    ]);
  });

  afterEach(async () => {
    const db = mongoose.connection.db;
    await db.collection('projects').deleteMany({});
  });

  it('should return similarity scores for matching proposals', async () => {
    const res = await studentAgent
      .post('/api/projects/similarity-scan')
      .send({
        title: 'Project Gamma',
        problemStatement: 'This is a problem statement about global warming and climate change.',
        proposedSolution: 'We propose a generic solution involving renewable energy and solar panels.',
        uniqueContribution: 'Generic contribution on accessibility.',
        expectedImpact: 'Reduce carbon footprint by 10%.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('matches');
    expect(res.body.data).toHaveProperty('plagiarism');
    expect(res.body.data.plagiarism).toHaveProperty('originalityScore');
    expect(res.body.data.plagiarism).toHaveProperty('similarityScore');
    expect(Array.isArray(res.body.data.plagiarism.matchedSources)).toBe(true);
    
    // Alpha should have high similarity
    const matches = res.body.data.matches;
    const alphaMatch = matches.find(p => p.title === 'Project Alpha');
    
    expect(alphaMatch).toBeDefined();
    expect(alphaMatch.score).toBeGreaterThan(0.15);

    // Check keywords
    expect(alphaMatch.keywords).toBeDefined();
    expect(alphaMatch.keywords.problemStatement).toContain('global');
    expect(alphaMatch.keywords.problemStatement).toContain('warming');
  });

  it('should return empty results for completely unique proposals', async () => {
    const res = await studentAgent
      .post('/api/projects/similarity-scan')
      .send({
        title: 'Project Delta',
        problemStatement: 'Unique problem about quantum computing in space.',
        proposedSolution: 'Building a new qubit processor.',
        uniqueContribution: 'Novel error correction via string theory.',
        expectedImpact: 'Faster rendering of the universe.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('matches');
    expect(res.body.data).toHaveProperty('plagiarism');
    
    // The score should be 0, which is below the 0.15 threshold in the controller slice,
    // so the array should be empty
    expect(res.body.data.matches.length).toBe(0);
  });
});

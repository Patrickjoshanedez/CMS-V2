import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request, createAuthenticatedUserWithRole } from '../helpers.js';
import mongoose from 'mongoose';
import Project from '../../modules/projects/project.model.js';

describe('POST /api/projects/similarity-scan — Comprehensive Cases', () => {
  let studentAgent;

  beforeEach(async () => {
    const { agent } = await createAuthenticatedUserWithRole('student');
    studentAgent = agent;
  });

  afterEach(async () => {
    const db = mongoose.connection.db;
    await db.collection('projects').deleteMany({});
  });

  describe('Exact Title Match', () => {
    it('should return high similarity when scanning with exact archived title', async () => {
      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Capstone Management and Plagiarism Checker',
        problemStatement: 'Universities struggle with managing student capstone projects.',
        proposedSolution: 'An integrated platform for capstone management.',
        uniqueContribution: 'Real-time plagiarism detection.',
        expectedImpact: 'Improve academic integrity.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'Capstone Management and Plagiarism Checker',
          problemStatement: 'Different problem statement',
          proposedSolution: 'Different solution',
          uniqueContribution: 'Different contribution',
          expectedImpact: 'Different impact'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.matches.length).toBeGreaterThan(0);

      const match = res.body.data.matches[0];
      expect(match.title).toBe('Capstone Management and Plagiarism Checker');
      expect(match.score).toBeGreaterThan(0.5); // Title match should boost score
    });
  });

  describe('Multi-Field Matching', () => {
    it('should accumulate similarity across all fields', async () => {
      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'AI Smart Archive Discovery',
        problemStatement: 'Researchers struggle to find similar academic work in archives.',
        proposedSolution: 'Use machine learning to discover related research papers.',
        uniqueContribution: 'Novel semantic search algorithm for archives.',
        expectedImpact: 'Reduce research time by 40%.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'AI Smart Archive Discovery',
          problemStatement: 'Researchers struggle to find similar academic work in archives.',
          proposedSolution: 'Use machine learning to discover related papers.',
          uniqueContribution: 'New semantic search algorithm.',
          expectedImpact: 'Reduce research time.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.matches.length).toBeGreaterThan(0);
      
      const match = res.body.data.matches[0];
      expect(match.score).toBeGreaterThan(0.6); // High score from multiple matches
    });
  });

  describe('Partial Field Matching', () => {
    it('should find matches on partial field overlap', async () => {
      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Smart Traffic Management System',
        problemStatement: 'Urban areas suffer from severe traffic congestion affecting commuter productivity.',
        proposedSolution: 'Deploy AI-driven traffic light system with real-time optimization.',
        uniqueContribution: 'Adaptive signal timing based on traffic flow prediction.',
        expectedImpact: 'Reduce congestion by 30%.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'Traffic Optimization Platform',
          problemStatement: 'Traffic congestion in cities affects productivity and environment.',
          proposedSolution: 'Deploy smart traffic signals with optimization.',
          uniqueContribution: 'Different contribution approach',
          expectedImpact: 'Reduce environmental impact'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.matches.length).toBeGreaterThan(0);
      
      const match = res.body.data.matches[0];
      expect(match.score).toBeGreaterThan(0.15); // Above threshold
    });
  });

  describe('No Matches', () => {
    it('should return empty results for completely unique proposal', async () => {
      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Machine Learning for Weather Prediction',
        problemStatement: 'Meteorologists need better weather forecasting models.',
        proposedSolution: 'Build deep learning model for climate prediction.',
        uniqueContribution: 'Novel neural architecture for temporal sequences.',
        expectedImpact: 'Improve forecast accuracy by 25%.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'Underwater Basket Weaving Analytics',
          problemStatement: 'Ancient basket weavers had no data.',
          proposedSolution: 'Digitize historical weaving patterns.',
          uniqueContribution: 'First blockchain solution for basket fibers.',
          expectedImpact: 'Revolutionize fiber arts forever.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.matches).toEqual([]);
    });
  });

  describe('Threshold Enforcement', () => {
    it('should only return matches above 0.15 threshold', async () => {
      const db = mongoose.connection.db;
      
      // Insert project with minimal overlap
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Project Alpha',
        problemStatement: 'Problem A with some unique words.',
        proposedSolution: 'Solution A with unique terms.',
        uniqueContribution: 'Contribution A is very specific.',
        expectedImpact: 'Impact A is measurable.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'Project Beta',
          problemStatement: 'Problem B with different words.',
          proposedSolution: 'Solution B with other terms.',
          uniqueContribution: 'Contribution B is different.',
          expectedImpact: 'Impact B varies significantly.'
        });

      expect(res.status).toBe(200);
      // Should return empty or only high-scoring matches
      if (res.body.data.matches.length > 0) {
        expect(res.body.data.matches[0].score).toBeGreaterThan(0.15);
      }
    });
  });

  describe('Large Proposal Text', () => {
    it('should handle lengthy problem/solution statements', async () => {
      const longText = `
        This is a comprehensive problem statement that discusses in great detail
        the challenges faced by modern institutions in managing large distributed systems.
        The problem manifests in various ways including scalability issues, data consistency
        problems, security vulnerabilities, and operational complexity. Many teams struggle
        with maintaining system reliability while also adapting to rapidly changing requirements.
      `;

      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Distributed System Reliability Framework',
        problemStatement: longText,
        proposedSolution: 'Use consensus protocols and microservices.',
        uniqueContribution: 'Novel fault tolerance mechanism.',
        expectedImpact: '99.99% uptime guarantee.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'Distributed System Reliability',
          problemStatement: `
            Managing large distributed systems is challenging. Scalability, data consistency,
            security and complexity are major concerns. Team struggle with reliability and
            adapting to changing requirements in modern distributed architectures.
          `,
          proposedSolution: 'Microservices with consensus protocols.',
          uniqueContribution: 'Fault tolerance innovation',
          expectedImpact: 'High availability for systems'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.matches.length).toBeGreaterThan(0);
    });
  });

  describe('Stop Words Filtering', () => {
    it('should filter out common stop words and focus on meaningful terms', async () => {
      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Machine Learning Analytics Platform',
        problemStatement: 'A lot of companies have data but cannot analyze it effectively.',
        proposedSolution: 'Build a machine learning platform for data analysis.',
        uniqueContribution: 'Advanced ML algorithms.',
        expectedImpact: 'Better business insights.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'Machine Learning Analytics Platform',
          problemStatement: 'Many organizations possess data that is difficult to analyze.',
          proposedSolution: 'Create a machine learning system for analyzing data.',
          uniqueContribution: 'Superior ML techniques',
          expectedImpact: 'Improved analytical insights'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.matches.length).toBeGreaterThan(0);
      
      // Despite using different stop words (a lot vs many, etc), should match
      const match = res.body.data.matches[0];
      expect(match.score).toBeGreaterThan(0.4);
    });
  });

  describe('Case Insensitivity', () => {
    it('should match regardless of case', async () => {
      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'IoT SMART HOME AUTOMATION',
        problemStatement: 'HOME AUTOMATION IS COMPLEX AND EXPENSIVE.',
        proposedSolution: 'BUILD IOT PLATFORM FOR SMART HOMES.',
        uniqueContribution: 'AFFORDABLE IOT SOLUTION.',
        expectedImpact: 'REDUCE HOME ENERGY CONSUMPTION.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'iot smart home automation',
          problemStatement: 'home automation is complex and expensive.',
          proposedSolution: 'build iot platform for smart homes.',
          uniqueContribution: 'affordable iot solution.',
          expectedImpact: 'reduce home energy consumption.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.matches.length).toBeGreaterThan(0);
      
      const match = res.body.data.matches[0];
      expect(match.score).toBeGreaterThan(0.8); // Very high similarity with same content
    });
  });

  describe('Special Characters & Punctuation', () => {
    it('should normalize text with special characters', async () => {
      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'C++ Performance Optimization Engine',
        problemStatement: 'C++ applications are slow due to memory leaks & inefficient algorithms.',
        proposedSolution: 'Build a C++ profiling & optimization tool (with AI support).',
        uniqueContribution: 'AI-driven optimization recommendations [novel approach].',
        expectedImpact: 'Improve C++ app speed by 50%!',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'C++ Performance Optimization',
          problemStatement: 'C++ apps are slow, memory leaks/inefficient algorithms',
          proposedSolution: 'Create C++ profiling and optimization tool with AI',
          uniqueContribution: 'AI optimization recommendations',
          expectedImpact: 'Boost C++ app performance 50 percent'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.matches.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Candidate Projects', () => {
    it('should rank multiple matches by relevance', async () => {
      const db = mongoose.connection.db;
      
      // High match
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Smart Health Monitoring Wearable',
        problemStatement: 'Patients cannot monitor health metrics in real time.',
        proposedSolution: 'Build wearable device with health monitoring.',
        uniqueContribution: 'Advanced sensor fusion algorithm.',
        expectedImpact: 'Enable preventive healthcare.',
        status: 'APPROVED',
      });

      // Medium match
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Healthcare Data Analytics Platform',
        problemStatement: 'Healthcare providers lack data insights.',
        proposedSolution: 'Analytics platform for health data.',
        uniqueContribution: 'ML models for patient outcomes.',
        expectedImpact: 'Improve treatment decisions.',
        status: 'APPROVED',
      });

      // Low match
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Game Development Studio Management',
        problemStatement: 'Game studios struggle with project management.',
        proposedSolution: 'Project management software for game development.',
        uniqueContribution: 'Game-specific workflows.',
        expectedImpact: 'Faster game development cycles.',
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'Wearable Health Monitoring System',
          problemStatement: 'Patients need real-time health monitoring.',
          proposedSolution: 'Wearable device for continuous health tracking.',
          uniqueContribution: 'Sensor fusion and health algorithms.',
          expectedImpact: 'Enable proactive healthcare management.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.matches.length).toBeGreaterThanOrEqual(1);
      
      // First result should be the high-match project
      const topMatch = res.body.data.matches[0];
      expect(topMatch.title).toContain('Wearable');
      
      // Verify results are sorted by score
      for (let i = 1; i < res.body.data.matches.length; i++) {
        expect(res.body.data.matches[i].score).toBeLessThanOrEqual(res.body.data.matches[i - 1].score);
      }
    });
  });

  describe('Minimum Field Handling', () => {
    it('should gracefully handle missing optional fields', async () => {
      const db = mongoose.connection.db;
      await db.collection('projects').insertOne({
        _id: new mongoose.Types.ObjectId(),
        teamId: new mongoose.Types.ObjectId(),
        title: 'Blockchain Voting System',
        problemStatement: 'Traditional voting is not transparent and secure.',
        // Missing proposedSolution, uniqueContribution, expectedImpact
        status: 'APPROVED',
      });

      const res = await studentAgent
        .post('/api/projects/similarity-scan')
        .send({
          title: 'Blockchain Voting',
          problemStatement: 'Voting systems lack transparency and security.',
          proposedSolution: 'Use blockchain for secure voting.',
          uniqueContribution: 'Smart contract solutions.',
          expectedImpact: 'Trustworthy elections.'
        });

      expect(res.status).toBe(200);
      // Should still return match based on title and problemStatement
      if (res.body.data.matches.length > 0) {
        expect(res.body.data.matches[0].title).toContain('Blockchain');
      }
    });
  });
});

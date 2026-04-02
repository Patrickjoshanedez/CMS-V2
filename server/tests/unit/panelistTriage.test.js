/**
 * Unit tests for PanelistTriageService — Agentic Triage Pipeline.
 *
 * Tests the individual read-only agents (contextValidator, sentimentAnalyzer)
 * in isolation, without requiring a MongoDB connection.
 */
import { describe, it, expect } from 'vitest';

import panelistTriageService from '../../services/panelistTriage.service.js';

const { contextValidator, sentimentAnalyzer } = panelistTriageService;

/* ─────────────── Context Validator (Guardian Agent) ─────────────── */

describe('contextValidator (Guardian Agent)', () => {
  const baseEvent = {
    rawText:
      'Abstract: This study investigates the development of a Capstone Management platform. ' +
      'Methodology: A qualitative approach was employed with structured interviews. ' +
      'Conclusion: The system meets all defined academic requirements. ' +
      'Bibliography: [1] Smith, J. (2023). Systems Engineering. Pearson. ' +
      'This study focuses on an important topic that spans multiple domains. ' +
      'The researchers conducted extensive field work over a period of six months. ' +
      'The results demonstrate clear patterns in student submission behaviour. ' +
      'Further analysis reveals a strong correlation between workload and outcomes.',
    wordCount: 600,
    projectTitle: 'Capstone Management Platform',
  };

  it('should pass a complete, well-formed document', () => {
    const result = contextValidator(baseEvent);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('should fail when word count is below the minimum (500)', () => {
    const event = { ...baseEvent, wordCount: 200 };
    const result = contextValidator(event);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes('word count'))).toBe(true);
  });

  it('should fail when a required section is missing (Abstract)', () => {
    const event = {
      ...baseEvent,
      rawText: baseEvent.rawText.replace(/abstract/i, 'summary'),
      wordCount: 600,
    };
    const result = contextValidator(event);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.toLowerCase().includes('abstract'))).toBe(true);
  });

  it('should fail when methodology section is missing', () => {
    const event = {
      ...baseEvent,
      rawText: baseEvent.rawText.replace(/methodology/i, 'approach'),
      wordCount: 600,
    };
    const result = contextValidator(event);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.toLowerCase().includes('methodology'))).toBe(true);
  });

  it('should accumulate multiple failures', () => {
    const event = {
      rawText: 'This is a short incomplete document.',
      wordCount: 100,
      projectTitle: 'Distributed Systems Architecture',
    };
    const result = contextValidator(event);
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(1);
  });
});

/* ─────────────── Sentiment Analyzer ─────────────── */

describe('sentimentAnalyzer', () => {
  it('should pass a formally written academic document', () => {
    const event = {
      rawText:
        'The study examines the architectural implications of distributed systems. ' +
        'The researchers employed a systematic review methodology. ' +
        'The findings demonstrate a significant improvement in throughput.',
    };
    const result = sentimentAnalyzer(event);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag colloquial language (gonna)', () => {
    const event = {
      rawText: 'We are gonna implement a new system for managing capstone projects.',
    };
    const result = sentimentAnalyzer(event);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('gonna'))).toBe(true);
  });

  it('should flag informal phrasing (basically)', () => {
    const event = {
      rawText: 'The system is basically designed to handle concurrent requests efficiently.',
    };
    const result = sentimentAnalyzer(event);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('basically'))).toBe(true);
  });

  it('should flag multiple violations in a single document', () => {
    const event = {
      rawText: 'We wanna build a system that is basically gonna handle lots of things.',
    };
    const result = sentimentAnalyzer(event);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(1);
  });
});

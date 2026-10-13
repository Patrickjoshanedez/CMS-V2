import { describe, it, expect, vi } from 'vitest';
import projectTitleService from '../../modules/projects/services/projectTitle.service.js';

describe('Plagiarism Scan Coverage & Report Integrity', () => {
  describe('Coverage Status Derivation Rules', () => {
    function deriveScanCoverage({
      lexicalScore,
      isFinalSubmission,
      forceNeuralScan,
      submissionType,
      isFallback,
      hstReport,
    }) {
      const isFinalSubmissionType =
        Boolean(isFinalSubmission) ||
        Boolean(forceNeuralScan) ||
        ['final_academic', 'final_journal'].includes(String(submissionType || '').toLowerCase());
      const bypassNeuralPipeline = lexicalScore < 5 && !isFinalSubmissionType;

      const scanCoverage = bypassNeuralPipeline ? 'lexical_only' : isFallback ? 'degraded' : 'full';

      const semanticStatus = bypassNeuralPipeline ? 'skipped' : isFallback ? 'failed' : 'completed';

      const scanType = bypassNeuralPipeline
        ? 'lexical_prefilter_cleared'
        : isFallback
          ? 'syntactic_fallback'
          : 'hybrid_source_tracker';

      return { scanCoverage, semanticStatus, scanType, bypassNeuralPipeline };
    }

    it('draft with <5% lexical overlap gets lexical_only and semanticStatus skipped', () => {
      const res = deriveScanCoverage({
        lexicalScore: 3,
        isFinalSubmission: false,
        forceNeuralScan: false,
        submissionType: 'chapter',
        isFallback: false,
      });

      expect(res.bypassNeuralPipeline).toBe(true);
      expect(res.scanCoverage).toBe('lexical_only');
      expect(res.semanticStatus).toBe('skipped');
      expect(res.scanType).toBe('lexical_prefilter_cleared');
    });

    it('final academic paper with <5% lexical overlap enforces neural pipeline', () => {
      const res = deriveScanCoverage({
        lexicalScore: 2,
        isFinalSubmission: false,
        forceNeuralScan: false,
        submissionType: 'final_academic',
        isFallback: false,
      });

      expect(res.bypassNeuralPipeline).toBe(false);
      expect(res.scanCoverage).toBe('full');
      expect(res.semanticStatus).toBe('completed');
      expect(res.scanType).toBe('hybrid_source_tracker');
    });

    it('forced scan with <5% lexical overlap enforces neural pipeline', () => {
      const res = deriveScanCoverage({
        lexicalScore: 1,
        isFinalSubmission: false,
        forceNeuralScan: true,
        submissionType: 'chapter',
        isFallback: false,
      });

      expect(res.bypassNeuralPipeline).toBe(false);
      expect(res.scanCoverage).toBe('full');
      expect(res.semanticStatus).toBe('completed');
    });

    it('circuit breaker failure results in degraded coverage and failed semanticStatus', () => {
      const res = deriveScanCoverage({
        lexicalScore: 12,
        isFinalSubmission: false,
        forceNeuralScan: false,
        submissionType: 'chapter',
        isFallback: true,
      });

      expect(res.bypassNeuralPipeline).toBe(false);
      expect(res.scanCoverage).toBe('degraded');
      expect(res.semanticStatus).toBe('failed');
      expect(res.scanType).toBe('syntactic_fallback');
    });
  });

  describe('projectTitleService._assertPlagiarismCleared Defense Archival Gate', () => {
    it('rejects degraded plagiarism scan with PLAGIARISM_SCAN_DEGRADED', () => {
      const degradedSubmission = {
        plagiarismResult: {
          status: 'completed',
          originalityScore: 90,
          scanCoverage: 'degraded',
          fullReport: {
            scanCoverage: 'degraded',
            scanType: 'syntactic_fallback',
          },
        },
      };

      expect(() => {
        projectTitleService._assertPlagiarismCleared(degradedSubmission, 'Academic Paper', 75);
      }).toThrowError(/degraded syntactic mode/i);

      try {
        projectTitleService._assertPlagiarismCleared(degradedSubmission, 'Academic Paper', 75);
      } catch (err) {
        expect(err.code).toBe('PLAGIARISM_SCAN_DEGRADED');
        expect(err.statusCode).toBe(400);
      }
    });

    it('rejects report when fullReport.scanType is syntactic_fallback', () => {
      const fallbackSubmission = {
        plagiarismResult: {
          status: 'completed',
          originalityScore: 88,
          fullReport: {
            scanType: 'syntactic_fallback',
          },
        },
      };

      expect(() => {
        projectTitleService._assertPlagiarismCleared(fallbackSubmission, 'Journal Paper', 75);
      }).toThrowError(/degraded syntactic mode/i);
    });

    it('rejects pending plagiarism check with PLAGIARISM_CHECK_PENDING', () => {
      const pendingSubmission = {
        plagiarismResult: {
          status: 'processing',
        },
      };

      expect(() => {
        projectTitleService._assertPlagiarismCleared(pendingSubmission, 'Academic Paper', 75);
      }).toThrowError(/still in progress/i);
    });

    it('approves full coverage scan meeting institutional originality threshold', () => {
      const validSubmission = {
        plagiarismResult: {
          status: 'completed',
          originalityScore: 85,
          scanCoverage: 'full',
          semanticStatus: 'completed',
          fullReport: {
            scanCoverage: 'full',
            scanType: 'hybrid_source_tracker',
          },
        },
      };

      expect(() => {
        projectTitleService._assertPlagiarismCleared(validSubmission, 'Academic Paper', 75);
      }).not.toThrow();
    });

    it('rejects submission below originality threshold with PLAGIARISM_THRESHOLD_EXCEEDED', () => {
      const failingSubmission = {
        plagiarismResult: {
          status: 'completed',
          originalityScore: 65, // Below 75% threshold
          scanCoverage: 'full',
          semanticStatus: 'completed',
          fullReport: {
            scanCoverage: 'full',
          },
        },
      };

      expect(() => {
        projectTitleService._assertPlagiarismCleared(failingSubmission, 'Academic Paper', 75);
      }).toThrowError(/below the required 75%/i);
    });
  });
});

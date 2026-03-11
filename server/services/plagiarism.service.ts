/**
 * Plagiarism Detection Service Integration
 *
 * Bridges the Node.js CMS with the Python FastAPI plagiarism engine.
 * Handles submission text extraction, async checking, result polling, and storage.
 *
 * Architecture:
 *  1. Extract text from uploaded PDF/DOCX
 *  2. Submit to /check endpoint → receive task_id
 *  3. Poll /result/{task_id} until completion
 *  4. Store report in MongoDB for student/adviser viewing
 *  5. Index approved documents in corpus for future checks
 */

import axios, { AxiosError } from 'axios';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ─────────────────────────────────────────────────────────────────────────
// Configuration & Types
// ─────────────────────────────────────────────────────────────────────────

const PLAGIARISM_ENGINE_URL = process.env.PLAGIARISM_ENGINE_URL || 'http://localhost:8001';
const PLAGIARISM_API_KEY = process.env.PLAGIARISM_API_KEY; // Optional auth token
const POLL_INTERVAL_MS = parseInt(process.env.PLAGIARISM_POLL_INTERVAL || '2000', 10);
const POLL_MAX_ATTEMPTS = parseInt(process.env.PLAGIARISM_POLL_MAX_ATTEMPTS || '150', 10); // ~5 min max

export interface PlagiarismCheckRequest {
  document_id: string;
  text: string;
  metadata?: {
    title?: string;
    author?: string;
    chapter?: number;
    project_id?: string;
    year?: number;
  };
}

export interface PlagiarismMatch {
  match_id: string;
  start_index: number;
  end_index: number;
  similarity_score: number;
  winnow_score?: number;
  semantic_score?: number;
  match_text?: string;
  source_metadata?: {
    document_id: string;
    title?: string;
    author?: string;
    url?: string;
    chapter?: number;
    year?: number;
  };
  source_snippet?: string;
}

export interface PlagiarismReport {
  document_id: string;
  originality_score: number;
  plagiarism_score: number;
  total_characters: number;
  matched_characters: number;
  matches: PlagiarismMatch[];
  candidates_evaluated: number;
  processing_time_ms: number;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────
// Plagiarism Service
// ─────────────────────────────────────────────────────────────────────────

export class PlagiarismService {
  private axiosInstance = axios.create({
    baseURL: PLAGIARISM_ENGINE_URL,
    timeout: 30000, // 30s request timeout
    headers: {
      'Content-Type': 'application/json',
      ...(PLAGIARISM_API_KEY && { Authorization: `Bearer ${PLAGIARISM_API_KEY}` }),
    },
  });

  /**
   * Health check — verify plagiarism engine is online and responsive.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      logger.info('Plagiarism engine health check: OK', response.data);
      return response.status === 200;
    } catch (error) {
      logger.error(
        'Plagiarism engine health check failed:',
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  /**
   * Submit a document for plagiarism checking (async).
   * Returns immediately with a task_id to poll later.
   */
  async submitCheck(request: PlagiarismCheckRequest): Promise<string> {
    try {
      logger.info(`Submitting plagiarism check for document: ${request.document_id}`);

      const response = await this.axiosInstance.post('/check', {
        document_id: request.document_id,
        text: request.text,
        metadata: request.metadata,
      });

      const taskId = response.data.task_id;
      logger.info(`Plagiarism check queued: document=${request.document_id}, task_id=${taskId}`);
      return taskId;
    } catch (error) {
      const message = this.extractErrorMessage(error);
      logger.error(`Failed to submit plagiarism check: ${message}`);
      throw new Error(`Plagiarism engine check submission failed: ${message}`);
    }
  }

  /**
   * Poll for the result of a plagiarism check task.
   * Retries with exponential backoff until completion or timeout.
   */
  async pollResult(taskId: string, maxAttempts = POLL_MAX_ATTEMPTS): Promise<PlagiarismReport> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      try {
        const response = await this.axiosInstance.get(`/result/${taskId}`);
        const { status, result, error } = response.data;

        if (status === 'completed') {
          logger.info(`Plagiarism check completed: task_id=${taskId}`);
          return result as PlagiarismReport;
        }

        if (status === 'failed') {
          throw new Error(`Plagiarism check failed: ${error || 'Unknown error'}`);
        }

        // Still processing or pending — wait and retry
        logger.debug(`Plagiarism check still processing: task_id=${taskId}, status=${status}`);
        await this.delay(POLL_INTERVAL_MS);
        attempt += 1;
      } catch (error) {
        if (error instanceof Error) {
          lastError = error;
        }
        // Retry even on error (transient failures)
        await this.delay(POLL_INTERVAL_MS);
        attempt += 1;
      }
    }

    const msg = `Plagiarism check timed out after ${maxAttempts} attempts (${(maxAttempts * POLL_INTERVAL_MS) / 1000}s)`;
    logger.error(msg);
    throw lastError || new Error(msg);
  }

  /**
   * Submit a document for plagiarism checking and wait for completion.
   * This is a convenience method combining submitCheck + pollResult.
   */
  async checkDocument(request: PlagiarismCheckRequest): Promise<PlagiarismReport> {
    // Short text bypass (too small to meaningfully plagiarize)
    if ((request.text || '').length < 500) {
      logger.info(`Document ${request.document_id} too short, returning zero plagiarism`);
      return {
        document_id: request.document_id,
        originality_score: 100,
        plagiarism_score: 0,
        total_characters: request.text.length,
        matched_characters: 0,
        matches: [],
        candidates_evaluated: 0,
        processing_time_ms: 0,
      };
    }

    const taskId = await this.submitCheck(request);
    return this.pollResult(taskId);
  }

  /**
   * Index a document in the plagiarism corpus (so it gets compared against future submissions).
   * Called when an adviser approves a chapter or when bulk-importing historical records.
   */
  async indexDocument(
    docId: string,
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      logger.info(`Indexing document for plagiarism corpus: ${docId}`);

      await this.axiosInstance.post('/index', {
        document_id: docId,
        text,
        metadata,
      });

      logger.info(`Document indexed: ${docId}`);
    } catch (error) {
      const message = this.extractErrorMessage(error);
      logger.error(`Failed to index document: ${message}`);
      throw new Error(`Plagiarism corpus indexing failed: ${message}`);
    }
  }

  /**
   * Remove a document from the plagiarism corpus.
   */
  async removeDocument(docId: string): Promise<void> {
    try {
      logger.info(`Removing document from plagiarism corpus: ${docId}`);

      await this.axiosInstance.delete(`/index/${docId}`);

      logger.info(`Document removed from corpus: ${docId}`);
    } catch (error) {
      const message = this.extractErrorMessage(error);
      logger.error(`Failed to remove document: ${message}`);
      throw new Error(`Plagiarism corpus removal failed: ${message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      if (error.response?.data?.detail) {
        return error.response.data.detail;
      }
      return error.message || 'HTTP error';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

// Export singleton instance
export const plagiarismService = new PlagiarismService();

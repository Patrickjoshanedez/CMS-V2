#!/usr/bin/env node
/**
 * scripts/benchmarks/run_table45_bullmq.js
 *
 * Reproducible BullMQ Ingestion Benchmark for Table 4.5.
 * Submits 10 simultaneous manuscript PDF extraction requests to the official API,
 * samples Redis memory every 1 second, captures docker stats, and extracts exact
 * job lifecycle timestamps from BullMQ.
 */

import http from 'http';
import { execSync } from 'child_process';
import { Queue } from 'bullmq';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:43210';
const STUDENT_EMAIL = process.env.STUDENT_EMAIL || 'adrian.navarro@student.buksu.edu.ph';
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || 'Password123!';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const OUTPUT_DIR = process.argv[2] || 'scratch/benchmarks/2026-10-14T03-22-00';
const RUN_INDEX = process.argv[3] || '1';

// Generate synthetic multi-page PDF buffer
function generateMultiPagePdfBuffer(numPages = 50) {
  let content = '%PDF-1.4\n';
  const objectOffsets = [];

  // Root catalog (1 0 R) & Pages (2 0 R)
  objectOffsets.push(content.length);
  content += '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n';

  const pageRefs = Array.from({ length: numPages }, (_, i) => `${3 + i} 0 R`).join(' ');
  objectOffsets.push(content.length);
  content += `2 0 obj<</Type/Pages/Kids[${pageRefs}]/Count ${numPages}>>endobj\n`;

  for (let i = 0; i < numPages; i++) {
    objectOffsets.push(content.length);
    content += `${3 + i} 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n`;
  }

  const xrefOffset = content.length;
  content += `xref\n0 ${3 + numPages}\n0000000000 65535 f \n`;
  for (const offset of objectOffsets) {
    content += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  content += `trailer<</Size ${3 + numPages}/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

async function loginStudent() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed with status ${res.status}`);
  const setCookie = res.headers.get('set-cookie') || '';
  return setCookie;
}

function sampleRedisMemory() {
  try {
    const raw = execSync('docker exec cms-redis redis-cli info memory', { encoding: 'utf-8' });
    const match = raw.match(/used_memory_peak_human:([^\r\n]+)/);
    const rawBytes = raw.match(/used_memory_peak:([0-9]+)/);
    return {
      peakHuman: match ? match[1].trim() : 'N/A',
      peakBytes: rawBytes ? parseInt(rawBytes[1], 10) : 0,
    };
  } catch (err) {
    return { peakHuman: 'N/A', peakBytes: 0, error: err.message };
  }
}

function sampleDockerStats() {
  try {
    const raw = execSync('docker stats --no-stream --format "{{.Name}}: CPU={{.CPUPerc}}, MEM={{.MemUsage}}"', {
      encoding: 'utf-8',
    });
    return raw.trim().split('\n').filter(Boolean);
  } catch (err) {
    return [`Error sampling docker stats: ${err.message}`];
  }
}

async function main() {
  console.log(`[BULLMQ BENCHMARK RUN ${RUN_INDEX}] Starting 10 simultaneous 50-page manuscript uploads...`);
  const cookieHeader = await loginStudent();
  const pdfBuffer = generateMultiPagePdfBuffer(50);
  console.log(`  Generated synthetic 50-page PDF (${pdfBuffer.length} bytes)`);

  const queue = new Queue('document-extraction', {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
  });

  // Track Redis peak memory every 500ms
  let peakMemoryBytes = 0;
  let peakMemoryHuman = 'N/A';
  const memSampler = setInterval(() => {
    const mem = sampleRedisMemory();
    if (mem.peakBytes > peakMemoryBytes) {
      peakMemoryBytes = mem.peakBytes;
      peakMemoryHuman = mem.peakHuman;
    }
  }, 500);

  const initialDockerStats = sampleDockerStats();

  // Submit 10 concurrent jobs
  const jobPromises = [];
  const submittedJobIds = [];

  const t0 = Date.now();
  for (let i = 0; i < 10; i++) {
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, `manuscript_50page_batch_${RUN_INDEX}_doc${i + 1}.pdf`);

    const p = fetch(`${BASE_URL}/api/documents/extract-pdf-metadata`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: formData,
    })
      .then(async (r) => {
        const json = await r.json();
        if (json.jobId) {
          submittedJobIds.push(json.jobId);
        }
        return { status: r.status, json };
      })
      .catch((err) => ({ error: err.message }));

    jobPromises.push(p);
  }

  const responses = await Promise.all(jobPromises);
  console.log(`  Dispatched 10 uploads in ${Date.now() - t0} ms. Enqueued job IDs:`, submittedJobIds);

  // Poll until all 10 jobs are finished in BullMQ
  console.log('  Awaiting BullMQ processing completion across 10 jobs...');
  let completedJobs = [];
  const pollStart = Date.now();
  while (Date.now() - pollStart < 60000) {
    completedJobs = [];
    for (const jid of submittedJobIds) {
      const job = await queue.getJob(jid);
      if (job && (job.finishedOn || (await job.isCompleted()) || (await job.isFailed()))) {
        completedJobs.push(job);
      }
    }
    if (completedJobs.length >= submittedJobIds.length) {
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  clearInterval(memSampler);
  const finalDockerStats = sampleDockerStats();

  console.log(`  Completed ${completedJobs.length}/${submittedJobIds.length} BullMQ jobs.`);

  // Calculate detailed timing metrics
  const queueWaits = [];
  const processingTimes = [];
  const totalTimes = [];
  let failedCount = 0;

  const jobDetails = [];
  for (const job of completedJobs) {
    const wait = (job.processedOn || job.timestamp) - job.timestamp;
    const proc = (job.finishedOn || job.processedOn) - job.processedOn;
    const total = (job.finishedOn || job.timestamp) - job.timestamp;

    if (await job.isFailed()) failedCount++;

    queueWaits.push(wait);
    processingTimes.push(proc);
    totalTimes.push(total);

    jobDetails.push({
      id: job.id,
      name: job.name,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      queue_wait_ms: wait,
      processing_ms: proc,
      total_duration_ms: total,
      failed: await job.isFailed(),
    });
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const max = (arr) => (arr.length ? Math.max(...arr) : 0);

  const summary = {
    run_index: parseInt(RUN_INDEX, 10),
    timestamp: new Date().toISOString(),
    jobs_submitted: submittedJobIds.length,
    jobs_completed: completedJobs.length,
    failed_jobs: failedCount,
    queue_wait_mean_ms: Math.round(avg(queueWaits)),
    queue_wait_max_ms: max(queueWaits),
    processing_mean_ms: Math.round(avg(processingTimes)),
    processing_max_ms: max(processingTimes),
    total_duration_mean_ms: Math.round(avg(totalTimes)),
    total_duration_max_ms: max(totalTimes),
    redis_peak_memory_human: peakMemoryHuman,
    redis_peak_memory_bytes: peakMemoryBytes,
    docker_stats_initial: initialDockerStats,
    docker_stats_peak: finalDockerStats,
    jobs: jobDetails,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputFile = path.join(OUTPUT_DIR, `bullmq_run_${RUN_INDEX}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`✓ Saved BullMQ benchmark summary to ${outputFile}`);
  console.log(`  Queue Wait Mean: ${summary.queue_wait_mean_ms} ms (Max: ${summary.queue_wait_max_ms} ms)`);
  console.log(`  Processing Mean: ${summary.processing_mean_ms} ms (Max: ${summary.processing_max_ms} ms)`);
  console.log(`  Redis Peak Memory: ${peakMemoryHuman}`);
  await queue.close();
}

main().catch((err) => {
  console.error('Fatal error in BullMQ benchmark:', err);
  process.exit(1);
});

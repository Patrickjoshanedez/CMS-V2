/* eslint-disable no-console */
/**
 * Email Dispatch Job Worker (BullMQ).
 *
 * Processes jobs from the 'email-dispatch' queue.
 * Sends emails via nodemailer using the configured SMTP transport.
 *
 * This offloads email sending from the main request-response cycle,
 * improving API response times for operations that trigger emails.
 *
 * @module jobs/email.job
 */
import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { getRedisConnectionOpts, isRedisAvailable } from '../config/redis.js';
import { QUEUE_NAMES } from './queue.js';
import env from '../config/env.js';

/** @type {Worker|null} */
let emailWorker = null;

/** Shared transporter — created once. */
let transporter = null;

/**
 * Get or create the nodemailer transporter.
 * @returns {Object} nodemailer transporter
 */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

/**
 * Process a single email dispatch job.
 *
 * @param {Object} job - BullMQ job
 * @param {Object} job.data
 * @param {string} job.data.to       - Recipient email address
 * @param {string} job.data.subject  - Email subject line
 * @param {string} job.data.html     - Email HTML body
 * @param {string} [job.data.text]   - Plain text fallback
 * @param {string} [job.data.from]   - Override sender (defaults to env.EMAIL_FROM)
 */
async function processJob(job) {
  const { to, subject, html, text, from } = job.data;

  console.log(`[Email Worker] Sending email to ${to}: "${subject}"`);

  const transport = getTransporter();

  await transport.sendMail({
    from: from || env.EMAIL_FROM,
    to,
    subject,
    html,
    text: text || undefined,
  });

  console.log(`[Email Worker] Email sent to ${to}.`);
}

/* ─────────────── Worker Lifecycle ─────────────── */

/**
 * Start the email dispatch worker.
 * Should be called once during app startup, after Redis is initialized.
 */
export function startEmailWorker() {
  if (!isRedisAvailable()) {
    console.warn('[Email Worker] Redis not available — worker not started.');
    return;
  }

  if (emailWorker) {
    console.warn('[Email Worker] Already running.');
    return;
  }

  emailWorker = new Worker(QUEUE_NAMES.EMAIL, processJob, {
    connection: getRedisConnectionOpts(),
    concurrency: 5, // Process up to 5 emails simultaneously
  });

  emailWorker.on('completed', (job) => {
    console.log(`[Email Worker] Job ${job.id} completed — email sent to ${job.data.to}`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`[Email Worker] Job ${job.id} FAILED for ${job.data.to}: ${err.message}`);
  });

  emailWorker.on('error', (err) => {
    console.error(`[Email Worker] Worker error: ${err.message}`);
  });

  console.log('[Email Worker] Started and listening for jobs.');
}

/**
 * Gracefully stop the email worker.
 */
export async function stopEmailWorker() {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    console.log('[Email Worker] Stopped.');
  }
}

export default { startEmailWorker, stopEmailWorker };

#!/usr/bin/env node
/**
 * BukSU CMS-V2: Export OCR Human-in-the-Loop Feedback Dataset
 *
 * Aggregates verified instructor corrections from the MetadataExtractionFeedback
 * collection into instruction-tuning chat JSONL pairs for PaddleOCR-VL-0.9B QLoRA.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_v2';
const OUTPUT_FILE = path.resolve(__dirname, '../scratch/ocr_instruction_dataset.jsonl');

const metadataFeedbackSchema = new mongoose.Schema(
  {
    fieldName: String,
    extractedValue: String,
    correctedValue: String,
    confidence: Number,
    sourceFileName: String,
    sourceHash: String,
    feedbackNotes: String,
    context: String,
    submittedBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true },
);

const Feedback = mongoose.model('MetadataExtractionFeedback', metadataFeedbackSchema);

async function exportDataset() {
  console.log('[Dataset Exporter] Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  try {
    const feedbackList = await Feedback.find().lean();
    console.log(`[Dataset Exporter] Found ${feedbackList.length} feedback records.`);

    // Group feedback by sourceHash or sourceFileName
    const grouped = {};
    for (const item of feedbackList) {
      const key = item.sourceHash || item.sourceFileName || 'sample_' + item._id;
      if (!grouped[key]) {
        grouped[key] = {
          sourceFileName: item.sourceFileName,
          sourceHash: item.sourceHash,
          fields: {},
        };
      }
      grouped[key].fields[item.fieldName] = item.correctedValue;
    }

    const trainingSamples = [];

    for (const [key, doc] of Object.entries(grouped)) {
      // Build ground truth target JSON conforming to BukSU Canonical Schema
      const targetJson = {
        title: doc.fields.title || 'Untitled Capstone Project',
        abstract: doc.fields.abstract || 'No abstract provided.',
        authors: doc.fields.authors
          ? doc.fields.authors
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean)
          : ['BukSU Proponents'],
        publication_year: doc.fields.publication_year || '2025',
        doi: doc.fields.doi || null,
        publication_venue: doc.fields.publication_venue || 'BukSU Capstone Repository',
        keywords: doc.fields.keywords
          ? doc.fields.keywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
          : [],
      };

      const sample = {
        id: `buksu_ocr_${key.slice(0, 12)}`,
        image: doc.sourceFileName ? `images/${doc.sourceFileName}.png` : 'images/default_page1.png',
        conversations: [
          {
            from: 'human',
            value:
              '<image>\nExtract the structured academic metadata from this capstone research paper as valid JSON.',
          },
          {
            from: 'gpt',
            value: JSON.stringify(targetJson, null, 2),
          },
        ],
        metadata: {
          sourceFileName: doc.sourceFileName,
          sourceHash: doc.sourceHash,
        },
      };

      trainingSamples.push(sample);
    }

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    const jsonlContent = trainingSamples.map((s) => JSON.stringify(s)).join('\n') + '\n';
    fs.writeFileSync(OUTPUT_FILE, jsonlContent, 'utf8');

    console.log(
      `[Dataset Exporter] Successfully exported ${trainingSamples.length} instruction samples to: ${OUTPUT_FILE}`,
    );
  } finally {
    await mongoose.disconnect();
    console.log('[Dataset Exporter] Database disconnected.');
  }
}

exportDataset().catch((err) => {
  console.error('[Dataset Exporter] Fatal error:', err);
  process.exit(1);
});

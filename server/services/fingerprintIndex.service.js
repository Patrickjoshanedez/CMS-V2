import mongoose from 'mongoose';
import DocumentFingerprint from '../modules/plagiarism/documentFingerprint.model.js';
import { computeWinnowFingerprints } from './plagiarism.service.js';

const MAX_STORED_POSITIONS = Number(process.env.PLAGIARISM_MAX_STORED_FINGERPRINT_POSITIONS || 24);
const DEFAULT_CANDIDATE_LIMIT = Number(process.env.PLAGIARISM_FINGERPRINT_CANDIDATE_LIMIT || 80);

const toObjectId = (value) => {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
};

const buildHashBuckets = (fingerprints) => {
  const byHash = new Map();
  for (const fingerprint of fingerprints) {
    if (!fingerprint?.hash) continue;
    const key = String(fingerprint.hash);
    const existing = byHash.get(key) || [];
    if (Number.isFinite(fingerprint.start)) {
      existing.push(Math.max(0, Math.floor(fingerprint.start)));
    }
    byHash.set(key, existing);
  }

  return byHash;
};

export async function upsertSubmissionFingerprints({
  submissionId,
  projectId,
  chapter = null,
  type = null,
  text,
}) {
  const submissionObjectId = toObjectId(submissionId);
  const projectObjectId = toObjectId(projectId);

  if (!submissionObjectId || !projectObjectId || typeof text !== 'string') {
    return {
      fingerprintCount: 0,
      uniqueHashCount: 0,
    };
  }

  const fingerprints = computeWinnowFingerprints(text);
  const byHash = buildHashBuckets(fingerprints);

  await DocumentFingerprint.deleteMany({ submissionId: submissionObjectId });

  if (byHash.size === 0) {
    return {
      fingerprintCount: 0,
      uniqueHashCount: 0,
    };
  }

  const now = new Date();
  const operations = Array.from(byHash.entries()).map(([hash, positions]) => ({
    updateOne: {
      filter: { submissionId: submissionObjectId, hash },
      update: {
        $set: {
          projectId: projectObjectId,
          chapter,
          type,
          hash,
          positions: positions.slice(0, MAX_STORED_POSITIONS),
          updatedAt: now,
        },
      },
      upsert: true,
    },
  }));

  await DocumentFingerprint.bulkWrite(operations, { ordered: false });

  return {
    fingerprintCount: fingerprints.length,
    uniqueHashCount: byHash.size,
  };
}

export async function removeSubmissionFingerprints(submissionId) {
  const submissionObjectId = toObjectId(submissionId);
  if (!submissionObjectId) return;
  await DocumentFingerprint.deleteMany({ submissionId: submissionObjectId });
}

export async function findFingerprintCandidates({
  submissionId,
  projectId,
  text,
  limit = DEFAULT_CANDIDATE_LIMIT,
}) {
  const submittedFingerprints = computeWinnowFingerprints(text || '');
  const uniqueHashes = [...new Set(submittedFingerprints.map((item) => String(item.hash)))];

  if (uniqueHashes.length === 0) {
    return {
      submittedFingerprints,
      uniqueHashes,
      candidates: [],
    };
  }

  const submissionObjectId = toObjectId(submissionId);
  const projectObjectId = toObjectId(projectId);

  const matchStage = {
    hash: { $in: uniqueHashes },
  };

  if (submissionObjectId) {
    matchStage.submissionId = { $ne: submissionObjectId };
  }

  if (projectObjectId) {
    matchStage.projectId = { $ne: projectObjectId };
  }

  const candidates = await DocumentFingerprint.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$submissionId',
        sharedFingerprintCount: { $sum: 1 },
        matchingHashes: { $addToSet: '$hash' },
      },
    },
    { $sort: { sharedFingerprintCount: -1 } },
    { $limit: Math.max(1, Number(limit) || DEFAULT_CANDIDATE_LIMIT) },
  ]);

  return {
    submittedFingerprints,
    uniqueHashes,
    candidates: candidates.map((row) => ({
      submissionId: row._id?.toString(),
      sharedFingerprintCount: row.sharedFingerprintCount || 0,
      matchingHashes: Array.isArray(row.matchingHashes) ? row.matchingHashes : [],
    })),
  };
}

export async function getFingerprintLookup(submissionIds, hashFilter = null) {
  if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
    return new Map();
  }

  const objectIds = submissionIds.map((id) => toObjectId(id)).filter((id) => id !== null);

  if (objectIds.length === 0) {
    return new Map();
  }

  const query = { submissionId: { $in: objectIds } };
  if (Array.isArray(hashFilter) && hashFilter.length > 0) {
    query.hash = { $in: hashFilter.map((value) => String(value)) };
  }

  const rows = await DocumentFingerprint.find(query).select('submissionId hash positions').lean();

  const lookup = new Map();

  for (const row of rows) {
    const key = row.submissionId.toString();
    const entry = lookup.get(key) || {
      hashes: new Set(),
      hashToPositions: new Map(),
    };

    const hash = String(row.hash);
    entry.hashes.add(hash);
    entry.hashToPositions.set(
      hash,
      Array.isArray(row.positions)
        ? row.positions
            .filter((position) => Number.isFinite(position))
            .map((position) => Math.max(0, Math.floor(position)))
        : [],
    );

    lookup.set(key, entry);
  }

  return lookup;
}

export default {
  upsertSubmissionFingerprints,
  removeSubmissionFingerprints,
  findFingerprintCandidates,
  getFingerprintLookup,
};

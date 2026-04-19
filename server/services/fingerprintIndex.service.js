import mongoose from 'mongoose';
import Fingerprint from '../models/fingerprint.model.js';
import { generateFingerprints } from './plagiarism.service.js';

const DEFAULT_CANDIDATE_LIMIT = Number(process.env.PLAGIARISM_FINGERPRINT_CANDIDATE_LIMIT || 80);

const toObjectId = (value) => {
  if (!value) return null;

  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
};

const toNormalizedChapter = (chapter = null, type = null) => {
  if (chapter !== null && chapter !== undefined && String(chapter).trim()) {
    return String(chapter).trim();
  }

  if (type !== null && type !== undefined && String(type).trim()) {
    return String(type).trim();
  }

  return null;
};

const toFingerprintRows = (fingerprints = []) =>
  (Array.isArray(fingerprints) ? fingerprints : [])
    .filter((item) => item?.hash)
    .map((item) => ({
      hash: String(item.hash),
      startIndex: Number(item.startIndex ?? item.start),
      endIndex: Number(item.endIndex ?? item.end),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.startIndex) &&
        Number.isFinite(item.endIndex) &&
        item.endIndex > item.startIndex,
    );

export async function upsertSubmissionFingerprints({
  submissionId,
  chapter = null,
  type = null,
  text,
  fingerprints = null,
}) {
  const submissionObjectId = toObjectId(submissionId);
  if (!submissionObjectId) {
    return {
      fingerprintCount: 0,
      uniqueHashCount: 0,
    };
  }

  const resolvedFingerprints = Array.isArray(fingerprints)
    ? fingerprints
    : generateFingerprints(String(text || ''));

  const hashes = toFingerprintRows(resolvedFingerprints);

  await Fingerprint.findOneAndUpdate(
    { submissionId: submissionObjectId },
    {
      $set: {
        submissionId: submissionObjectId,
        chapter: toNormalizedChapter(chapter, type),
        hashes,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  return {
    fingerprintCount: hashes.length,
    uniqueHashCount: new Set(hashes.map((item) => item.hash)).size,
  };
}

export async function removeSubmissionFingerprints(submissionId) {
  const submissionObjectId = toObjectId(submissionId);
  if (!submissionObjectId) return;

  await Fingerprint.deleteOne({ submissionId: submissionObjectId });
}

export async function findFingerprintCandidates({
  submissionId,
  text,
  limit = DEFAULT_CANDIDATE_LIMIT,
}) {
  const submittedFingerprints = generateFingerprints(text || '');
  const uniqueHashes = [...new Set(submittedFingerprints.map((item) => String(item.hash)))];

  if (uniqueHashes.length === 0) {
    return {
      submittedFingerprints,
      uniqueHashes,
      candidates: [],
    };
  }

  const submissionObjectId = toObjectId(submissionId);
  const matchStage = {
    'hashes.hash': { $in: uniqueHashes },
  };

  if (submissionObjectId) {
    matchStage.submissionId = { $ne: submissionObjectId };
  }

  const candidates = await Fingerprint.aggregate([
    { $match: matchStage },
    {
      $project: {
        submissionId: 1,
        matchingHashes: {
          $setIntersection: [uniqueHashes, '$hashes.hash'],
        },
      },
    },
    {
      $project: {
        submissionId: 1,
        matchingHashes: 1,
        sharedFingerprintCount: { $size: '$matchingHashes' },
      },
    },
    { $match: { sharedFingerprintCount: { $gt: 0 } } },
    { $sort: { sharedFingerprintCount: -1 } },
    { $limit: Math.max(1, Number(limit) || DEFAULT_CANDIDATE_LIMIT) },
  ]);

  return {
    submittedFingerprints,
    uniqueHashes,
    candidates: candidates.map((row) => ({
      submissionId: row.submissionId?.toString(),
      sharedFingerprintCount: Number(row.sharedFingerprintCount || 0),
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

  const rows = await Fingerprint.find({ submissionId: { $in: objectIds } })
    .select('submissionId hashes')
    .lean();

  const allowedHashes =
    Array.isArray(hashFilter) && hashFilter.length > 0
      ? new Set(hashFilter.map((value) => String(value)))
      : null;

  const lookup = new Map();

  for (const row of rows) {
    const submissionId = row?.submissionId?.toString();
    if (!submissionId) continue;

    const hashEntries = Array.isArray(row?.hashes) ? row.hashes : [];
    const filteredHashes = hashEntries
      .map((item) => String(item?.hash || ''))
      .filter((hash) => hash)
      .filter((hash) => !allowedHashes || allowedHashes.has(hash));

    const hashToPositions = new Map();
    for (const item of hashEntries) {
      const hash = String(item?.hash || '');
      if (!hash) continue;
      if (allowedHashes && !allowedHashes.has(hash)) continue;

      const startIndex = Number(item?.startIndex);
      if (!Number.isFinite(startIndex)) continue;

      const existing = hashToPositions.get(hash) || [];
      existing.push(startIndex);
      hashToPositions.set(hash, existing);
    }

    lookup.set(submissionId, {
      hashes: new Set(filteredHashes),
      hashToPositions,
    });
  }

  return lookup;
}

export default {
  upsertSubmissionFingerprints,
  removeSubmissionFingerprints,
  findFingerprintCandidates,
  getFingerprintLookup,
};

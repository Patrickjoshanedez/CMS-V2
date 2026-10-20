import SubmissionVersionCounter from './submissionVersion.model.js';
import AppError from '../../utils/AppError.js';

/** Reserve chapter versions across processes, including projects with legacy history.
 * Failed reservations are not reused; a failed upload can leave a version gap.
 */
export async function reserveChapterVersion(projectId, chapter, latestSubmission = null) {
  const filter = { _id: `chapter:${String(projectId)}:${Number(chapter)}` };
  const floor = {
    $max: {
      version: latestSubmission?.version ?? 0,
      revisionRound: latestSubmission ? latestSubmission.revisionRound || 0 : -1,
    },
  };
  try {
    await SubmissionVersionCounter.updateOne(filter, floor, {
      upsert: true,
      setDefaultsOnInsert: false,
    });
  } catch (error) {
    // A simultaneous first reservation can win the unique _id insertion.
    if (error.code !== 11000) throw error;
    await SubmissionVersionCounter.updateOne(filter, floor, { upsert: false });
  }
  const reservation = await SubmissionVersionCounter.findOneAndUpdate(
    filter,
    { $inc: { version: 1, revisionRound: 1 } },
    { new: true },
  ).lean();
  if (!reservation) {
    throw new AppError(
      'Unable to reserve a chapter version. Please retry.',
      503,
      'CHAPTER_VERSION_RESERVATION_FAILED',
    );
  }
  return { version: reservation.version, revisionRound: reservation.revisionRound };
}

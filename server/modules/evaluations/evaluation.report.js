import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Evaluation from './evaluation.model.js';
import Project from '../projects/project.model.js';
import Submission from '../submissions/submission.model.js';
import AppError from '../../utils/AppError.js';

/**
 * Generates a structured, official Defense Evaluation & Plagiarism Report PDF (FRINS6).
 * Combines project details, panel evaluation scores, criteria breakdown, and plagiarism indices.
 *
 * @param {string} evaluationId
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function generateEvaluationReportPdf(evaluationId) {
  const evaluation = await Evaluation.findById(evaluationId)
    .populate('panelistId', 'firstName lastName email')
    .populate('projectId');

  if (!evaluation) {
    throw new AppError('Evaluation not found.', 404, 'EVALUATION_NOT_FOUND');
  }

  const project = await Project.findById(evaluation.projectId._id || evaluation.projectId).populate(
    'teamId',
  );

  const latestSubmission = await Submission.findOne({
    projectId: project._id,
  }).sort({ version: -1, createdAt: -1 });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Standard Letter size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  // Header Banner
  page.drawRectangle({
    x: 40,
    y: y - 35,
    width: width - 80,
    height: 45,
    color: rgb(0.08, 0.18, 0.36),
  });

  page.drawText('CAPSTONE MANAGEMENT SYSTEM (CMS-V2)', {
    x: 50,
    y: y - 15,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('OFFICIAL DEFENSE EVALUATION & SIMILARITY REPORT', {
    x: 50,
    y: y - 30,
    size: 10,
    font,
    color: rgb(0.85, 0.9, 1),
  });

  y -= 60;

  // Project Info Table
  page.drawText('PROJECT DETAILS', {
    x: 40,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });
  y -= 15;

  const details = [
    `Title: ${project.title || 'Untitled'}`,
    `Team: ${project.teamId?.name || 'N/A'} (Academic Year: ${project.academicYear || 'N/A'})`,
    `Field of Discipline: ${Array.isArray(project.capstoneType) ? project.capstoneType.join(', ') : project.capstoneType || 'IT'}`,
    `Defense Stage: ${(evaluation.defenseType || 'proposal').toUpperCase()} DEFENSE`,
    `Evaluator / Panelist: ${evaluation.panelistId?.firstName || ''} ${evaluation.panelistId?.lastName || ''} (${evaluation.panelistId?.email || 'Faculty'})`,
    `Decision: ${(evaluation.decision || 'PENDING').toUpperCase()}`,
  ];

  details.forEach((text) => {
    page.drawText(text, { x: 45, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
  });

  y -= 10;

  // Criteria Scoring Table Header
  page.drawRectangle({
    x: 40,
    y: y - 18,
    width: width - 80,
    height: 22,
    color: rgb(0.92, 0.94, 0.98),
  });

  page.drawText('CRITERION', {
    x: 45,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });
  page.drawText('MAX', { x: 380, y: y - 12, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
  page.drawText('SCORE', { x: 430, y: y - 12, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
  page.drawText('REMARKS', {
    x: 480,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });

  y -= 25;

  // Criteria Rows
  (evaluation.criteria || []).forEach((c, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      page.drawRectangle({
        x: 40,
        y: y - 14,
        width: width - 80,
        height: 18,
        color: rgb(0.98, 0.98, 0.99),
      });
    }

    const truncatedName = c.name.length > 55 ? `${c.name.substring(0, 52)}...` : c.name;
    page.drawText(truncatedName, { x: 45, y: y - 10, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(String(c.maxScore ?? '-'), {
      x: 385,
      y: y - 10,
      size: 8.5,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(String(c.score ?? '-'), {
      x: 435,
      y: y - 10,
      size: 8.5,
      font: fontBold,
      color: rgb(0.1, 0.3, 0.6),
    });
    page.drawText(
      c.comment ? (c.comment.length > 20 ? `${c.comment.substring(0, 18)}..` : c.comment) : '-',
      {
        x: 480,
        y: y - 10,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      },
    );

    y -= 18;
  });

  // Total Score Banner
  y -= 8;
  page.drawRectangle({
    x: 40,
    y: y - 20,
    width: width - 80,
    height: 24,
    color: rgb(0.9, 0.94, 0.98),
  });

  page.drawText('TOTAL COMPOSITE SCORE:', {
    x: 45,
    y: y - 14,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.5),
  });
  page.drawText(`${evaluation.totalScore ?? 'N/A'} / ${evaluation.maxTotalScore ?? 'N/A'} pts`, {
    x: 430,
    y: y - 14,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.4, 0.2),
  });

  y -= 35;

  // Plagiarism & Originality Audit Section
  page.drawText('PLAGIARISM & SIMILARITY AUDIT', {
    x: 40,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });
  y -= 16;

  const plagScore =
    latestSubmission?.plagiarismResult?.overallScore ?? latestSubmission?.originalityScore ?? 100;
  const simPct = (100 - plagScore).toFixed(1);

  page.drawText(
    `Latest Manuscript: ${latestSubmission?.fileName || 'No submission recorded'} (Version ${latestSubmission?.version || 1})`,
    {
      x: 45,
      y,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    },
  );
  y -= 14;

  page.drawText(
    `Originality Score: ${plagScore}% | Similarity Overlap: ${simPct}% (Checked: ${latestSubmission?.plagiarismResult?.processedAt ? new Date(latestSubmission.plagiarismResult.processedAt).toLocaleDateString() : 'N/A'})`,
    {
      x: 45,
      y,
      size: 9,
      font: fontBold,
      color: Number(simPct) > 25 ? rgb(0.7, 0.1, 0.1) : rgb(0.1, 0.5, 0.2),
    },
  );
  y -= 25;

  // Evaluator Comments
  page.drawText('EVALUATOR COMMENTS & RECOMMENDATIONS:', {
    x: 40,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });
  y -= 14;
  page.drawText(evaluation.overallComment || 'No additional comments provided.', {
    x: 45,
    y,
    size: 8.5,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Footer & Signatures Block
  y = 75;
  page.drawLine({
    start: { x: 40, y: y + 10 },
    end: { x: width - 40, y: y + 10 },
    thickness: 0.8,
    color: rgb(0.7, 0.7, 0.7),
  });

  page.drawText('Generated by CMS-V2 Automated Evaluation Compiler', {
    x: 40,
    y: y - 5,
    size: 7.5,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`Report Date: ${new Date().toLocaleDateString()}`, {
    x: width - 160,
    y: y - 5,
    size: 7.5,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}

export default { generateEvaluationReportPdf };

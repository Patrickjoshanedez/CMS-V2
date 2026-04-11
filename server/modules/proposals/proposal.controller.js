import { HTTP_STATUS } from '@cms/shared';
import catchAsync from '../../utils/catchAsync.js';
import proposalService from './proposal.service.js';

function sanitizeFilename(value) {
  return (value || 'Proposal')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

export const generateDeck = catchAsync(async (req, res) => {
  const pdfBuffer = await proposalService.generateDeckPdf(req.body);
  const filename = `${sanitizeFilename(req.body.title)}_PitchDeck.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(HTTP_STATUS.OK).send(pdfBuffer);
});
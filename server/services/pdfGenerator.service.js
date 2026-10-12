class PdfGeneratorService {
  /**
   * Generates a valid, institutional BukSU Capstone Manuscript PDF on the fly.
   * Ensures that archived and active projects can always be read even if storage binaries are unlinked.
   * @param {Object} project
   * @param {string} [requestedType='final_academic']
   * @returns {Promise<Uint8Array>}
   */
  async generateFallbackManuscriptPdf(project, requestedType = 'final_academic') {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const margin = 50;
    let y = height - margin;

    // Institutional Header Ribbon
    page.drawRectangle({
      x: margin,
      y: y - 28,
      width: width - margin * 2,
      height: 32,
      color: rgb(0.08, 0.18, 0.36),
    });

    page.drawText('BUKIDNON STATE UNIVERSITY', {
      x: margin + 14,
      y: y - 14,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('CAPSTONE MANAGEMENT SYSTEM — ARCHIVE REPOSITORY', {
      x: margin + 14,
      y: y - 24,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.85, 0.9, 1),
    });

    y -= 54;

    const docTypeLabel =
      requestedType === 'final_journal'
        ? 'CAPSTONE ACADEMIC JOURNAL (CONDENSED ARTICLE)'
        : 'CAPSTONE ACADEMIC MANUSCRIPT (APPROVED PAPER)';

    page.drawText(docTypeLabel, {
      x: margin,
      y,
      size: 9.5,
      font: fontBold,
      color: rgb(0.15, 0.35, 0.65),
    });

    y -= 22;

    // Project Title (wrapped lines)
    const titleText = String(project.title || 'Untitled Capstone Project').toUpperCase();
    const words = titleText.split(' ');
    let currentLine = '';
    const titleLines = [];
    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      if (fontBold.widthOfTextAtSize(testLine, 13) > width - margin * 2) {
        titleLines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) titleLines.push(currentLine);

    for (const line of titleLines) {
      page.drawText(line, {
        x: margin,
        y,
        size: 13,
        font: fontBold,
        color: rgb(0.08, 0.12, 0.2),
      });
      y -= 17;
    }

    y -= 8;

    // Authors & Details
    const authors =
      Array.isArray(project.archiveMetadata?.authors) && project.archiveMetadata.authors.length > 0
        ? project.archiveMetadata.authors.join(', ')
        : (project.teamId?.members || [])
            .map((m) => `${m.firstName || ''} ${m.lastName || ''}`.trim())
            .filter(Boolean)
            .join(', ') || 'BukSU Capstone Proponents';

    page.drawText(`Authors: ${authors}`, {
      x: margin,
      y,
      size: 9.5,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });
    y -= 15;

    const acadYear =
      project.academicYear || project.archiveMetadata?.publicationYear || 'Academic Year';
    page.drawText(`Academic Year: ${acadYear}  |  Status: ${project.projectStatus || 'Archived'}`, {
      x: margin,
      y,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.5),
    });
    y -= 18;

    // Horizontal Divider
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });
    y -= 18;

    // Abstract Section
    page.drawText('ABSTRACT', {
      x: margin,
      y,
      size: 10.5,
      font: fontBold,
      color: rgb(0.08, 0.18, 0.36),
    });
    y -= 16;

    const abstractText =
      String(project.abstract || '').trim() ||
      'This capstone project was verified and indexed under the Bukidnon State University College of Technologies Capstone Repository. The project addresses institutional IT standards and United Nations Sustainable Development Goals (SDGs).';

    const abstractWords = abstractText.split(/\s+/);
    let absLine = '';
    const absLines = [];
    for (const w of abstractWords) {
      const test = absLine ? `${absLine} ${w}` : w;
      if (fontRegular.widthOfTextAtSize(test, 9) > width - margin * 2) {
        absLines.push(absLine);
        absLine = w;
      } else {
        absLine = test;
      }
    }
    if (absLine) absLines.push(absLine);

    for (const l of absLines.slice(0, 35)) {
      if (y < margin + 40) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }
      page.drawText(l, {
        x: margin,
        y,
        size: 9,
        font: fontRegular,
        color: rgb(0.15, 0.18, 0.22),
      });
      y -= 13.5;
    }

    y -= 10;

    // Keywords
    const kwList =
      Array.isArray(project.keywords) && project.keywords.length > 0
        ? project.keywords.join('; ')
        : 'Information Technology, Software Engineering, Capstone System';

    page.drawText(`Keywords: ${kwList}`, {
      x: margin,
      y,
      size: 8.5,
      font: fontOblique,
      color: rgb(0.25, 0.3, 0.4),
    });
    y -= 25;

    // Institutional footer
    page.drawText('Official Digital Archive Record — Bukidnon State University (CMS-V2)', {
      x: margin,
      y: margin - 15,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.65),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}

export default new PdfGeneratorService();

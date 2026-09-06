import PptxGenJS from 'pptxgenjs';

/**
 * Sanitize string to create safe filename
 */
function sanitizeFilename(value) {
  return (value || 'Proposal')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

/**
 * Format team label preventing "Team Team Gamma" redundancy
 */
function formatTeamLabel(teamName) {
  if (!teamName) return 'Team Workspace';
  const trimmed = teamName.trim();
  return trimmed.toLowerCase().startsWith('team') ? trimmed : `Team ${trimmed}`;
}

/**
 * Format proponents list from team members or current user
 */
function formatProponents(teamMembers = [], user = null) {
  if (Array.isArray(teamMembers) && teamMembers.length > 0) {
    const names = teamMembers
      .map((m) => {
        const first = m.firstName || m.user?.firstName || '';
        const last = m.lastName || m.user?.lastName || '';
        return `${first} ${last}`.trim();
      })
      .filter(Boolean);
    if (names.length > 0) {
      return names.join(', ');
    }
  }

  if (user) {
    return `${user.firstName || 'Proponent'} ${user.lastName || 'Student'}`.trim();
  }

  return 'Proponent Student';
}

/**
 * Export a Proposal Pitch Deck as a professional 16:9 PowerPoint (.pptx) file.
 *
 * Designed to BukSU institutional standards:
 * - 16:9 Widescreen aspect ratio (LAYOUT_16x9)
 * - BukSU Navy (#0A3254) and Academic Gold (#E5A823) branding
 * - Clean, legible typography with proper visual hierarchy
 * - 8 comprehensive slides: Title, Problem, Solution, Innovation, Users, Impact, Alignment, Q&A
 *
 * @param {Object} options
 * @param {string} options.title - Proposal Title
 * @param {Object} [options.deckData] - Pitch deck text fields
 * @param {Object} [options.team] - Proponent team object
 * @param {Object} [options.user] - Active logged in user
 * @param {string} [options.academicYear] - Academic year (e.g. "2025–2026")
 * @param {string[]} [options.capstoneType] - IT Field of Discipline tags
 * @param {string[]} [options.sdgTags] - Target UN SDG tags
 * @param {Array} [options.teamMembers] - Team member list
 * @returns {Promise<string>} - Downloaded filename
 */
export async function exportProposalDeckPptx({
  title,
  deckData = {},
  team = null,
  user = null,
  academicYear = '2024–2025',
  capstoneType = [],
  sdgTags = [],
  teamMembers = [],
}) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'BukSU Capstone Management System';
  pptx.company = 'Bukidnon State University';
  pptx.title = title || 'Capstone Project Pitch Deck';

  const teamName = formatTeamLabel(team?.name);
  const proponents = formatProponents(teamMembers.length > 0 ? teamMembers : team?.members, user);
  const ay = team?.academicYear || academicYear || '2024–2025';

  const BUKSU_NAVY = '0A3254';
  const BUKSU_GOLD = 'E5A823';
  const SLATE_BODY = '334155';
  const MUTED_TEXT = '64748B';

  const addStandardFooter = (slide, slideNumStr) => {
    slide.addText(
      `Bukidnon State University · College of Technologies · IT Department  |  Slide ${slideNumStr}`,
      {
        x: 0.8,
        y: 6.9,
        w: 8.5,
        h: 0.35,
        fontSize: 9,
        color: MUTED_TEXT,
        fontFace: 'Arial',
      },
    );
    slide.addText(`AY ${ay}`, {
      x: 9.5,
      y: 6.9,
      w: 3.0,
      h: 0.35,
      fontSize: 9,
      color: MUTED_TEXT,
      fontFace: 'Arial',
      align: 'right',
    });
  };

  // ==========================================
  // SLIDE 1: Title Pitch & Proponents (Cover)
  // ==========================================
  const slide1 = pptx.addSlide();
  slide1.background = { color: BUKSU_NAVY };

  slide1.addText('BUKIDNON STATE UNIVERSITY · COLLEGE OF TECHNOLOGIES', {
    x: 0.8,
    y: 0.7,
    w: 11.7,
    h: 0.35,
    fontSize: 11,
    color: BUKSU_GOLD,
    bold: true,
    fontFace: 'Arial',
    charSpacing: 2,
  });

  slide1.addText('Information Technology Department · Capstone Proposal Defense', {
    x: 0.8,
    y: 1.05,
    w: 11.7,
    h: 0.35,
    fontSize: 10,
    color: '94A3B8',
    fontFace: 'Arial',
  });

  slide1.addText(title || 'Capstone Project Proposal Pitch', {
    x: 0.8,
    y: 2.0,
    w: 11.7,
    h: 2.2,
    fontSize: 26,
    color: 'FFFFFF',
    bold: true,
    fontFace: 'Arial',
    valign: 'top',
  });

  if (deckData.proposedSolution) {
    slide1.addText(
      deckData.proposedSolution.slice(0, 240) +
        (deckData.proposedSolution.length > 240 ? '...' : ''),
      {
        x: 0.8,
        y: 4.4,
        w: 11.7,
        h: 1.2,
        fontSize: 12,
        color: 'CBD5E1',
        fontFace: 'Arial',
        valign: 'top',
        lineSpacing: 18,
      },
    );
  }

  slide1.addShape(pptx.ShapeType.line, {
    x: 0.8,
    y: 5.9,
    w: 11.7,
    h: 0,
    line: { color: '1E4976', width: 1 },
  });

  slide1.addText(`Proponents: ${proponents}  ·  ${teamName}`, {
    x: 0.8,
    y: 6.1,
    w: 8.5,
    h: 0.4,
    fontSize: 11,
    color: 'E2E8F0',
    fontFace: 'Arial',
  });

  slide1.addText(`Academic Year ${ay}`, {
    x: 9.5,
    y: 6.1,
    w: 3.0,
    h: 0.4,
    fontSize: 11,
    color: BUKSU_GOLD,
    fontFace: 'Arial',
    bold: true,
    align: 'right',
  });

  // Helper for standard content slides
  const createContentSlide = (slideNumStr, tag, heading, textContent) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Header tag
    slide.addText(`SLIDE ${slideNumStr}  /  ${tag.toUpperCase()}`, {
      x: 0.8,
      y: 0.6,
      w: 8.5,
      h: 0.3,
      fontSize: 10,
      color: BUKSU_NAVY,
      bold: true,
      fontFace: 'Arial',
    });

    slide.addText('BukSU Proposal Defense', {
      x: 9.5,
      y: 0.6,
      w: 3.0,
      h: 0.3,
      fontSize: 9,
      color: MUTED_TEXT,
      fontFace: 'Arial',
      align: 'right',
    });

    // Heading
    slide.addText(heading, {
      x: 0.8,
      y: 0.95,
      w: 11.7,
      h: 0.6,
      fontSize: 22,
      color: BUKSU_NAVY,
      bold: true,
      fontFace: 'Arial',
    });

    // Accent line
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8,
      y: 1.6,
      w: 11.7,
      h: 0,
      line: { color: BUKSU_GOLD, width: 2 },
    });

    // Content container
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 1.85,
      w: 11.7,
      h: 4.7,
      fill: { color: 'F8FAFC' },
      line: { color: 'E2E8F0', width: 1 },
    });

    // Content body
    slide.addText(textContent || 'No details provided for this section.', {
      x: 1.1,
      y: 2.1,
      w: 11.1,
      h: 4.2,
      fontSize: 13,
      color: SLATE_BODY,
      fontFace: 'Arial',
      valign: 'top',
      lineSpacing: 22,
    });

    addStandardFooter(slide, slideNumStr);
    return slide;
  };

  // ==========================================
  // SLIDE 2: Problem Statement & Literature Gap
  // ==========================================
  createContentSlide(
    '02',
    'Problem Statement & Literature Gap',
    'Problem Statement & Literature Gap',
    deckData.problemStatement,
  );

  // ==========================================
  // SLIDE 3: Proposed Solution & Technical Framework
  // ==========================================
  createContentSlide(
    '03',
    'Proposed Solution & Architecture',
    'Proposed Solution & Technical Framework',
    deckData.proposedSolution,
  );

  // ==========================================
  // SLIDE 4: Unique Technical Innovation
  // ==========================================
  createContentSlide(
    '04',
    'Unique Technical Innovation',
    'Unique Technical Innovation & Differentiators',
    deckData.uniqueContribution,
  );

  // ==========================================
  // SLIDE 5: Target Users & Beneficiaries
  // ==========================================
  createContentSlide(
    '05',
    'Target Users & Scope',
    'Target Users & Beneficiary Stakeholders',
    deckData.targetUsers,
  );

  // ==========================================
  // SLIDE 6: Expected Value & Impact
  // ==========================================
  createContentSlide(
    '06',
    'Expected Value & Operational ROI',
    'Expected Value & Operational Impact',
    deckData.expectedImpact,
  );

  // ==========================================
  // SLIDE 7: Discipline & SDG Alignment
  // ==========================================
  const slide7 = pptx.addSlide();
  slide7.background = { color: 'FFFFFF' };

  slide7.addText('SLIDE 07  /  INSTITUTIONAL ALIGNMENT', {
    x: 0.8,
    y: 0.6,
    w: 8.5,
    h: 0.3,
    fontSize: 10,
    color: BUKSU_NAVY,
    bold: true,
    fontFace: 'Arial',
  });

  slide7.addText('BukSU Proposal Defense', {
    x: 9.5,
    y: 0.6,
    w: 3.0,
    h: 0.3,
    fontSize: 9,
    color: MUTED_TEXT,
    fontFace: 'Arial',
    align: 'right',
  });

  slide7.addText('Field of Discipline & UN SDG Alignment', {
    x: 0.8,
    y: 0.95,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    color: BUKSU_NAVY,
    bold: true,
    fontFace: 'Arial',
  });

  slide7.addShape(pptx.ShapeType.line, {
    x: 0.8,
    y: 1.6,
    w: 11.7,
    h: 0,
    line: { color: BUKSU_GOLD, width: 2 },
  });

  // Card 1: Disciplines
  slide7.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.85,
    w: 5.65,
    h: 4.7,
    fill: { color: 'F8FAFC' },
    line: { color: 'E2E8F0', width: 1 },
  });

  slide7.addText('IT FIELDS OF DISCIPLINE', {
    x: 1.1,
    y: 2.1,
    w: 5.0,
    h: 0.35,
    fontSize: 11,
    bold: true,
    color: BUKSU_NAVY,
    fontFace: 'Arial',
  });

  const disciplinesList =
    Array.isArray(capstoneType) && capstoneType.length > 0
      ? capstoneType
      : ['Software Engineering & Web Applications'];

  slide7.addText(disciplinesList.map((d) => `•  ${d}`).join('\n\n'), {
    x: 1.1,
    y: 2.6,
    w: 5.0,
    h: 3.6,
    fontSize: 12,
    color: SLATE_BODY,
    fontFace: 'Arial',
    valign: 'top',
    lineSpacing: 18,
  });

  // Card 2: SDGs
  slide7.addShape(pptx.ShapeType.rect, {
    x: 6.85,
    y: 1.85,
    w: 5.65,
    h: 4.7,
    fill: { color: 'F8FAFC' },
    line: { color: 'E2E8F0', width: 1 },
  });

  slide7.addText('TARGET UN SUSTAINABLE DEVELOPMENT GOALS', {
    x: 7.15,
    y: 2.1,
    w: 5.0,
    h: 0.35,
    fontSize: 11,
    bold: true,
    color: '059669', // Emerald/Green for SDGs
    fontFace: 'Arial',
  });

  const sdgsList =
    Array.isArray(sdgTags) && sdgTags.length > 0 ? sdgTags : ['SDG 4: Quality Education'];

  slide7.addText(sdgsList.map((s) => `•  ${s}`).join('\n\n'), {
    x: 7.15,
    y: 2.6,
    w: 5.0,
    h: 3.6,
    fontSize: 12,
    color: SLATE_BODY,
    fontFace: 'Arial',
    valign: 'top',
    lineSpacing: 18,
  });

  addStandardFooter(slide7, '07');

  // ==========================================
  // SLIDE 8: Q&A / Defense Recommendations
  // ==========================================
  const slide8 = pptx.addSlide();
  slide8.background = { color: BUKSU_NAVY };

  slide8.addText('BUKIDNON STATE UNIVERSITY · CAPSTONE STUDIO', {
    x: 0.8,
    y: 1.8,
    w: 11.7,
    h: 0.4,
    fontSize: 12,
    color: BUKSU_GOLD,
    bold: true,
    fontFace: 'Arial',
    align: 'center',
    charSpacing: 2,
  });

  slide8.addText('Thank You', {
    x: 0.8,
    y: 2.5,
    w: 11.7,
    h: 1.0,
    fontSize: 36,
    color: 'FFFFFF',
    bold: true,
    fontFace: 'Arial',
    align: 'center',
  });

  slide8.addText('Open for Panel Questions, Clarifications, and Recommendations', {
    x: 0.8,
    y: 3.6,
    w: 11.7,
    h: 0.6,
    fontSize: 14,
    color: 'CBD5E1',
    fontFace: 'Arial',
    align: 'center',
  });

  slide8.addText(`Committee Defense Evaluation  ·  AY ${ay}`, {
    x: 0.8,
    y: 5.5,
    w: 11.7,
    h: 0.4,
    fontSize: 11,
    color: '94A3B8',
    fontFace: 'Arial',
    align: 'center',
  });

  const filename = `${sanitizeFilename(title)}_PitchDeck.pptx`;
  await pptx.writeFile({ fileName: filename });
  return filename;
}

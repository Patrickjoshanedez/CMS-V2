import PptxGenJS from 'pptxgenjs';
import { BUKSU_COT_LOGO_BASE64, BUKSU_IT_LOGO_BASE64 } from '@/assets/logoBase64';

/**
 * Domain-specific BukSU Capstone Slide Fallbacks
 * Used when a proposal draft has empty fields or only blank bullet markers.
 */
const SLIDE_FALLBACKS = {
  statement: [
    'Current manual and paper-based tracking processes lack real-time visibility and institutional auditability.',
    'Absence of automated validation creates compliance bottlenecks, document loss, and defense scheduling delays.',
    'Lack of centralized tracking creates operational friction between student proponents, advisers, and defense panels.',
  ],
  solution: [
    'An end-to-end web platform integrating automated workflows, real-time tracking, and role-based permissions.',
    'Features integrated originality scanning and multi-signatory digital approvals.',
    'Enforces institutional compliance across all capstone stages from proposal to final archiving.',
  ],
  innovation: [
    'Dual-engine similarity detection combining lexical Rabin-Karp winnowing and semantic vector embeddings.',
    'Automated rubric-driven milestone clearance with real-time Action Done Matrix (ADM) verification.',
    'Strict defense committee governance and automated archival certificate generation.',
  ],
  users: [
    'BukSU BSIT Senior Capstone Students and Proponents.',
    'Faculty Capstone Advisers, Defense Panel Chairs, and Panel Members.',
    'Capstone Coordinators, Department Secretaries, and College Leadership.',
  ],
  impact: [
    'Reduces defense review turnaround times and operational coordination overhead by over 60%.',
    'Eliminates physical routing delays and provides complete tamper-evident audit trails.',
    'Ensures 100% adherence to BukSU College of Technologies capstone policies and standards.',
  ],
  qa: [
    'Open for Defense Committee questions, methodological clarifications, and panel feedback.',
    'Committee remarks will be systematically recorded in the Action Done Matrix (ADM) for revision compliance.',
  ],
};

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
 * Format string into clean bullet points for presentation slides.
 * If text already contains bullets or multiple lines, splits by line and cleans prefixes.
 * If text is a paragraph, splits into concise sentences.
 * If empty or only blank markers, returns institutional domain fallbacks.
 */
function formatToBulletPoints(text, slideType = 'statement', maxBullets = 5) {
  if (!text || typeof text !== 'string') {
    return (
      SLIDE_FALLBACKS[slideType] || ['Capstone research project details under committee review.']
    );
  }

  const rawLines = text.split(/\r?\n/);
  const cleanedLines = rawLines
    .map((line) =>
      line
        .replace(/^[-•*]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .trim(),
    )
    .filter((line) => line.length > 0 && line !== '•' && line !== '-' && line !== '*');

  if (cleanedLines.length > 1) {
    return cleanedLines.slice(0, maxBullets);
  }

  if (cleanedLines.length === 1) {
    const single = cleanedLines[0];
    const sentences = single
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (sentences.length > 1) {
      return sentences.slice(0, maxBullets);
    }
    if (sentences.length === 1 && single.length > 8) {
      return [single];
    }
  }

  return (
    SLIDE_FALLBACKS[slideType] || ['Capstone research project details under committee review.']
  );
}

/**
 * Dynamic typography scaling for presentation slides in A4 landscape format (11.69" x 8.27")
 * Ensures text is large, legible from a distance, well-spaced, and proportionate.
 */
function getScaledTypography(totalChars, bulletCount = 1) {
  if (bulletCount <= 2 && totalChars < 350) {
    return {
      fontSize: 24,
      lineSpacing: 34,
      spaceAfter: 28,
    };
  }
  if (bulletCount <= 3 && totalChars < 500) {
    return {
      fontSize: 22,
      lineSpacing: 31,
      spaceAfter: 20,
    };
  }
  if (bulletCount <= 4 && totalChars < 650) {
    return {
      fontSize: 19,
      lineSpacing: 27,
      spaceAfter: 16,
    };
  }
  if (bulletCount <= 5 && totalChars < 850) {
    return {
      fontSize: 17,
      lineSpacing: 24,
      spaceAfter: 12,
    };
  }
  return {
    fontSize: 15,
    lineSpacing: 22,
    spaceAfter: 10,
  };
}

function _getScaledFontSize(totalChars, bulletCount = 1) {
  return getScaledTypography(totalChars, bulletCount).fontSize;
}

/**
 * Export a Proposal Pitch Deck as a professional PowerPoint (.pptx) file in A4 format.
 *
 * Designed to BukSU institutional standards:
 * - A4 Landscape layout (11.69" x 8.27" / 297mm x 210mm)
 * - Deep BukSU Navy (#0B3064) cover with Warm Amber (#FFA726) title
 * - Pure White (#FFFFFF) content slides with bold italic headers & clean bullets
 * - Full-bleed Vibrant Orange (#FF7300) bottom banner with institutional hierarchy & logos
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
 * @param {string} [options.layout] - Layout override ('A4' default or '16x9')
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
  layout = 'A4',
}) {
  const pptx = new PptxGenJS();

  // A4 Landscape layout: 11.69" x 8.27" (297mm x 210mm)
  if (layout === '16x9') {
    pptx.layout = 'LAYOUT_16x9';
  } else {
    pptx.defineLayout({ name: 'A4', width: 11.69, height: 8.27 });
    pptx.layout = 'A4';
  }

  pptx.author = 'BukSU Capstone Management System';
  pptx.company = 'Bukidnon State University';
  pptx.title = title || 'Capstone Project Pitch Deck';

  const teamName = formatTeamLabel(team?.name);
  const proponents = formatProponents(teamMembers.length > 0 ? teamMembers : team?.members, user);
  const ay = team?.academicYear || academicYear || '2024–2025';

  const BUKSU_NAVY = '0B3064';
  const BUKSU_AMBER = 'FFA726';
  const BUKSU_ORANGE = 'FF7300';
  const SLATE_BODY = '1E293B';

  const isA4 = layout !== '16x9';
  const slideWidth = isA4 ? 11.69 : 13.333;
  const slideHeight = isA4 ? 8.27 : 7.5;
  const footerHeight = 1.45;
  const footerY = slideHeight - footerHeight;

  // Institutional footer ribbon matching BukSU COT/IT Department template
  const addInstitutionalFooter = (slide, slideNumberStr = '01', category = '') => {
    // 1. Vibrant orange footer ribbon full-bleed across bottom
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: footerY,
      w: slideWidth,
      h: footerHeight,
      fill: { color: BUKSU_ORANGE },
      line: { color: BUKSU_ORANGE, width: 0 },
    });

    // 2. Left side: Discreet Slide Indicator, Category & Proponents info
    slide.addText(
      [
        {
          text: `SLIDE ${slideNumberStr}`,
          options: { bold: true, fontSize: 9, color: '000000', fontFace: 'Arial' },
        },
        {
          text: `${category ? ` · ${category}` : ''}\n${teamName} (${proponents})`,
          options: { bold: false, fontSize: 8, color: '111827', fontFace: 'Arial' },
        },
      ],
      {
        x: 0.6,
        y: footerY + 0.1,
        w: isA4 ? 4.2 : 4.8,
        h: 1.25,
        align: 'left',
        valign: 'middle',
        fontFace: 'Arial',
        lineSpacing: 14,
      },
    );

    // 3. Right-aligned Institutional Hierarchy text
    slide.addText(
      [
        {
          text: 'BUKIDNON STATE UNIVERSITY\n',
          options: { bold: true, fontSize: 10, color: '000000', fontFace: 'Arial' },
        },
        {
          text: 'COLLEGE OF TECHNOLOGIES\n',
          options: { bold: true, fontSize: 10, color: '000000', fontFace: 'Arial' },
        },
        {
          text: 'Information Technology Department',
          options: { bold: false, fontSize: 9, color: '000000', fontFace: 'Arial' },
        },
      ],
      {
        x: isA4 ? 4.9 : 5.8,
        y: footerY + 0.1,
        w: isA4 ? 4.3 : 4.6,
        h: 1.25,
        align: 'right',
        valign: 'middle',
        fontFace: 'Arial',
        lineSpacing: 14,
      },
    );

    // 4. Two Institutional Logos side-by-side on the far right
    const logoY = footerY + 0.18;
    const logoSize = 1.05;
    const cotLogoX = isA4 ? 9.35 : 10.65;
    const itLogoX = isA4 ? 10.45 : 11.85;

    slide.addImage({
      data: BUKSU_COT_LOGO_BASE64,
      x: cotLogoX,
      y: logoY,
      w: logoSize,
      h: logoSize,
    });

    slide.addImage({
      data: BUKSU_IT_LOGO_BASE64,
      x: itLogoX,
      y: logoY,
      w: logoSize,
      h: logoSize,
    });
  };

  // ==========================================
  // SLIDE 1: Title Pitch & Proponents (Cover)
  // ==========================================
  const slide1 = pptx.addSlide();
  slide1.background = { color: BUKSU_NAVY };

  // Calculate dynamic font size for title
  const titleText = title || 'Capstone Project Proposal Pitch';
  const titleFontSize = titleText.length > 120 ? 28 : titleText.length > 70 ? 34 : 40;

  slide1.addText(titleText, {
    x: 0.8,
    y: 0.8,
    w: slideWidth - 1.6,
    h: footerY - 1.0,
    fontSize: titleFontSize,
    color: BUKSU_AMBER,
    bold: true,
    fontFace: 'Arial',
    align: 'center',
    valign: 'middle',
    lineSpacing: titleFontSize + 8,
  });

  addInstitutionalFooter(slide1, '01', 'Title Pitch & Proponents');

  // Helper for standard content slides
  const createContentSlide = (
    heading,
    textContent,
    slideNumberStr,
    category,
    slideType = 'statement',
  ) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Heading: Top-left, bold + italic matching university standard
    slide.addText(heading, {
      x: 0.8,
      y: 0.6,
      w: slideWidth - 1.6,
      h: 0.9,
      fontSize: 34,
      color: '0F172A',
      bold: true,
      italic: true,
      fontFace: 'Arial',
    });

    // Content: Bulleted list format with presentation-scale typography
    const bullets = formatToBulletPoints(textContent, slideType);
    const totalChars = bullets.join(' ').length;
    const {
      fontSize: bodyFontSize,
      lineSpacing,
      spaceAfter,
    } = getScaledTypography(totalChars, bullets.length);

    const bulletObjects = bullets.map((item) => ({
      text: item,
      options: {
        bullet: true,
        fontSize: bodyFontSize,
        color: SLATE_BODY,
        fontFace: 'Arial',
        spaceAfter,
        lineSpacing,
      },
    }));

    slide.addText(bulletObjects, {
      x: 0.9,
      y: 1.7,
      w: slideWidth - 1.8,
      h: footerY - 1.9,
      valign: 'top',
    });

    addInstitutionalFooter(slide, slideNumberStr, category);
    return slide;
  };

  // ==========================================
  // SLIDE 2: Problem Statement
  // ==========================================
  createContentSlide(
    'Problem Statement',
    deckData.problemStatement,
    '02',
    'Problem Statement & Literature Gap',
    'statement',
  );

  // ==========================================
  // SLIDE 3: Proposed Solution
  // ==========================================
  createContentSlide(
    'Proposed Solution',
    deckData.proposedSolution,
    '03',
    'Proposed Solution & Technical Framework',
    'solution',
  );

  // ==========================================
  // SLIDE 4: Unique Technical Innovation
  // ==========================================
  createContentSlide(
    'Unique Technical Contribution',
    deckData.uniqueContribution,
    '04',
    'Unique Technical Innovation',
    'innovation',
  );

  // ==========================================
  // SLIDE 5: Target Users & Beneficiaries
  // ==========================================
  createContentSlide(
    'Target Users & Beneficiaries',
    deckData.targetUsers,
    '05',
    'Target Users & Stakeholders',
    'users',
  );

  // ==========================================
  // SLIDE 6: Expected Value & Impact
  // ==========================================
  createContentSlide(
    'Expected Institutional Impact',
    deckData.expectedImpact,
    '06',
    'Expected Value & Operational Impact',
    'impact',
  );

  // ==========================================
  // SLIDE 7: Discipline & SDG Alignment
  // ==========================================
  const slide7 = pptx.addSlide();
  slide7.background = { color: 'FFFFFF' };

  slide7.addText('Field of Discipline & UN SDG Alignment', {
    x: 0.8,
    y: 0.6,
    w: slideWidth - 1.6,
    h: 0.9,
    fontSize: 34,
    color: '0F172A',
    bold: true,
    italic: true,
    fontFace: 'Arial',
  });

  const colWidth = (slideWidth - 2.2) / 2;

  // Column 1: Disciplines
  slide7.addText('IT FIELDS OF DISCIPLINE', {
    x: 0.9,
    y: 1.7,
    w: colWidth,
    h: 0.45,
    fontSize: 16,
    bold: true,
    color: BUKSU_NAVY,
    fontFace: 'Arial',
  });

  const disciplinesList =
    Array.isArray(capstoneType) && capstoneType.length > 0
      ? capstoneType
      : ['Software Engineering & Web Applications'];

  slide7.addText(
    disciplinesList.map((d) => ({
      text: d,
      options: {
        bullet: true,
        fontSize: 18,
        color: SLATE_BODY,
        fontFace: 'Arial',
        spaceAfter: 14,
        lineSpacing: 26,
      },
    })),
    {
      x: 0.9,
      y: 2.25,
      w: colWidth,
      h: footerY - 2.45,
      valign: 'top',
    },
  );

  // Column 2: SDGs
  const col2X = 0.9 + colWidth + 0.4;
  slide7.addText('TARGET UN SUSTAINABLE DEVELOPMENT GOALS', {
    x: col2X,
    y: 1.7,
    w: colWidth,
    h: 0.45,
    fontSize: 16,
    bold: true,
    color: '047857',
    fontFace: 'Arial',
  });

  const sdgsList =
    Array.isArray(sdgTags) && sdgTags.length > 0 ? sdgTags : ['SDG 4: Quality Education'];

  slide7.addText(
    sdgsList.map((s) => ({
      text: s,
      options: {
        bullet: true,
        fontSize: 18,
        color: SLATE_BODY,
        fontFace: 'Arial',
        spaceAfter: 14,
        lineSpacing: 26,
      },
    })),
    {
      x: col2X,
      y: 2.25,
      w: colWidth,
      h: footerY - 2.45,
      valign: 'top',
    },
  );

  addInstitutionalFooter(slide7, '07', 'Discipline & UN SDG Alignment');

  // ==========================================
  // SLIDE 8: Committee Discussion & Q&A
  // ==========================================
  const slide8 = pptx.addSlide();
  slide8.background = { color: 'FFFFFF' };

  slide8.addText('Committee Discussion & Recommendations', {
    x: 0.8,
    y: 0.6,
    w: slideWidth - 1.6,
    h: 0.9,
    fontSize: 34,
    color: '0F172A',
    bold: true,
    italic: true,
    fontFace: 'Arial',
  });

  const qaItems = [
    'Thank you to the Panel of Examiners. Open for defense recommendations, rubric inquiries, and committee revisions.',
    'Panelist feedback and required modifications will be logged in the Action Done Matrix (ADM).',
    `Proponents: ${proponents}  ·  ${teamName}  ·  AY ${ay}`,
  ];

  slide8.addText(
    qaItems.map((item) => ({
      text: item,
      options: {
        bullet: true,
        fontSize: 20,
        color: SLATE_BODY,
        fontFace: 'Arial',
        spaceAfter: 20,
        lineSpacing: 30,
      },
    })),
    {
      x: 0.9,
      y: 1.8,
      w: slideWidth - 1.8,
      h: footerY - 2.0,
      valign: 'top',
    },
  );

  addInstitutionalFooter(slide8, '08', 'Committee Discussion');

  const filename = `${sanitizeFilename(title)}_PitchDeck_A4.pptx`;
  await pptx.writeFile({ fileName: filename });
  return filename;
}

import PptxGenJS from 'pptxgenjs';
import { BUKSU_COT_LOGO_BASE64, BUKSU_IT_LOGO_BASE64 } from '@/assets/logoBase64';

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
 * If text already contains bullets or multiple lines, splits by line.
 * If text is a paragraph, splits into concise sentences.
 */
function formatToBulletPoints(text, maxBullets = 5) {
  if (!text || typeof text !== 'string') {
    return ['No details provided for this section.'];
  }

  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  if (rawLines.length > 1) {
    return rawLines.slice(0, maxBullets);
  }

  // Single paragraph - split by sentence
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length > 0) {
    return sentences.slice(0, maxBullets);
  }

  return [text.trim()];
}

/**
 * Dynamic font sizing based on character count and bullet count to prevent overflow
 */
function getScaledFontSize(totalChars, bulletCount = 1, baseSize = 16) {
  if (totalChars > 600 || bulletCount >= 6) return Math.max(10, baseSize - 6);
  if (totalChars > 450 || bulletCount >= 5) return Math.max(11, baseSize - 5);
  if (totalChars > 300 || bulletCount >= 4) return Math.max(12, baseSize - 3);
  if (totalChars > 180) return Math.max(14, baseSize - 2);
  return baseSize;
}

/**
 * Export a Proposal Pitch Deck as a professional 16:9 PowerPoint (.pptx) file.
 *
 * Designed to BukSU institutional standards:
 * - 16:9 Widescreen aspect ratio (LAYOUT_16x9)
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

  const BUKSU_NAVY = '0B3064';
  const BUKSU_AMBER = 'FFA726';
  const BUKSU_ORANGE = 'FF7300';
  const SLATE_BODY = '334155';

  // Institutional footer ribbon matching BukSU COT/IT Department template
  const addInstitutionalFooter = (slide) => {
    // 1. Vibrant orange footer ribbon full-bleed across bottom (y: 5.95 to 7.5)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 5.95,
      w: 13.333,
      h: 1.55,
      fill: { color: BUKSU_ORANGE },
      line: { color: BUKSU_ORANGE, width: 0 },
    });

    // 2. Right-aligned Institutional Hierarchy text
    slide.addText(
      [
        {
          text: 'BUKIDNON STATE UNIVERSITY\n',
          options: { bold: true, fontSize: 11, color: '000000', fontFace: 'Arial' },
        },
        {
          text: 'COLLEGE OF TECHNOLOGIES\n',
          options: { bold: true, fontSize: 11, color: '000000', fontFace: 'Arial' },
        },
        {
          text: 'Information Technology Department',
          options: { bold: false, fontSize: 10, color: '000000', fontFace: 'Arial' },
        },
      ],
      {
        x: 4.5,
        y: 6.1,
        w: 5.9,
        h: 1.25,
        align: 'right',
        valign: 'middle',
        fontFace: 'Arial',
        lineSpacing: 16,
      },
    );

    // 3. Two Institutional Logos side-by-side on the far right
    slide.addImage({
      data: BUKSU_COT_LOGO_BASE64,
      x: 10.55,
      y: 6.12,
      w: 1.2,
      h: 1.2,
    });

    slide.addImage({
      data: BUKSU_IT_LOGO_BASE64,
      x: 11.85,
      y: 6.12,
      w: 1.2,
      h: 1.2,
    });
  };

  // ==========================================
  // SLIDE 1: Title Pitch & Proponents (Cover)
  // ==========================================
  const slide1 = pptx.addSlide();
  slide1.background = { color: BUKSU_NAVY };

  // Calculate dynamic font size for title
  const titleText = title || 'Capstone Project Proposal Pitch';
  const titleFontSize = titleText.length > 110 ? 26 : titleText.length > 70 ? 30 : 36;

  slide1.addText(titleText, {
    x: 0.8,
    y: 0.8,
    w: 11.733,
    h: 4.5,
    fontSize: titleFontSize,
    color: BUKSU_AMBER,
    bold: true,
    fontFace: 'Arial',
    align: 'center',
    valign: 'middle',
    lineSpacing: titleFontSize + 8,
  });

  addInstitutionalFooter(slide1);

  // Helper for standard content slides matching Image 3
  const createContentSlide = (heading, textContent) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Heading: Top-left, bold + italic matching Image 3
    slide.addText(heading, {
      x: 0.8,
      y: 0.65,
      w: 11.733,
      h: 0.8,
      fontSize: 28,
      color: '000000',
      bold: true,
      italic: true,
      fontFace: 'Arial',
    });

    // Content: Bulleted list format
    const bullets = formatToBulletPoints(textContent);
    const totalChars = bullets.join(' ').length;
    const bodyFontSize = getScaledFontSize(totalChars, bullets.length, 16);
    const lineSpacing = bodyFontSize + 10;

    const bulletObjects = bullets.map((item) => ({
      text: item,
      options: {
        bullet: true,
        fontSize: bodyFontSize,
        color: SLATE_BODY,
        fontFace: 'Arial',
      },
    }));

    slide.addText(bulletObjects, {
      x: 0.9,
      y: 1.6,
      w: 11.5,
      h: 4.0,
      valign: 'top',
      lineSpacing,
    });

    addInstitutionalFooter(slide);
    return slide;
  };

  // ==========================================
  // SLIDE 2: Problem Statement (Image 3)
  // ==========================================
  createContentSlide('Problem Statement', deckData.problemStatement);

  // ==========================================
  // SLIDE 3: Proposed Solution
  // ==========================================
  createContentSlide('Proposed Solution', deckData.proposedSolution);

  // ==========================================
  // SLIDE 4: Unique Technical Innovation
  // ==========================================
  createContentSlide('Unique Technical Contribution', deckData.uniqueContribution);

  // ==========================================
  // SLIDE 5: Target Users & Beneficiaries
  // ==========================================
  createContentSlide('Target Users & Beneficiaries', deckData.targetUsers);

  // ==========================================
  // SLIDE 6: Expected Value & Impact
  // ==========================================
  createContentSlide('Expected Institutional Impact', deckData.expectedImpact);

  // ==========================================
  // SLIDE 7: Discipline & SDG Alignment
  // ==========================================
  const slide7 = pptx.addSlide();
  slide7.background = { color: 'FFFFFF' };

  slide7.addText('Field of Discipline & UN SDG Alignment', {
    x: 0.8,
    y: 0.65,
    w: 11.733,
    h: 0.8,
    fontSize: 28,
    color: '000000',
    bold: true,
    italic: true,
    fontFace: 'Arial',
  });

  // Column 1: Disciplines
  slide7.addText('IT FIELDS OF DISCIPLINE', {
    x: 0.9,
    y: 1.6,
    w: 5.5,
    h: 0.4,
    fontSize: 13,
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
      options: { bullet: true, fontSize: 13, color: SLATE_BODY, fontFace: 'Arial' },
    })),
    {
      x: 0.9,
      y: 2.1,
      w: 5.5,
      h: 3.5,
      valign: 'top',
      lineSpacing: 22,
    },
  );

  // Column 2: SDGs
  slide7.addText('TARGET UN SUSTAINABLE DEVELOPMENT GOALS', {
    x: 6.8,
    y: 1.6,
    w: 5.5,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: '059669',
    fontFace: 'Arial',
  });

  const sdgsList =
    Array.isArray(sdgTags) && sdgTags.length > 0 ? sdgTags : ['SDG 4: Quality Education'];

  slide7.addText(
    sdgsList.map((s) => ({
      text: s,
      options: { bullet: true, fontSize: 13, color: SLATE_BODY, fontFace: 'Arial' },
    })),
    {
      x: 6.8,
      y: 2.1,
      w: 5.5,
      h: 3.5,
      valign: 'top',
      lineSpacing: 22,
    },
  );

  addInstitutionalFooter(slide7);

  // ==========================================
  // SLIDE 8: Committee Discussion & Q&A
  // ==========================================
  const slide8 = pptx.addSlide();
  slide8.background = { color: 'FFFFFF' };

  slide8.addText('Committee Discussion & Recommendations', {
    x: 0.8,
    y: 0.65,
    w: 11.733,
    h: 0.8,
    fontSize: 28,
    color: '000000',
    bold: true,
    italic: true,
    fontFace: 'Arial',
  });

  const qaItems = [
    'Open for Defense Committee questions, clarifications, and recommendations.',
    'Panelist feedback and required modifications will be logged in the Action Done Matrix (ADM).',
    `Proponents: ${proponents}  ·  ${teamName}  ·  AY ${ay}`,
  ];

  slide8.addText(
    qaItems.map((item) => ({
      text: item,
      options: { bullet: true, fontSize: 15, color: SLATE_BODY, fontFace: 'Arial' },
    })),
    {
      x: 0.9,
      y: 1.8,
      w: 11.5,
      h: 3.8,
      valign: 'top',
      lineSpacing: 26,
    },
  );

  addInstitutionalFooter(slide8);

  const filename = `${sanitizeFilename(title)}_PitchDeck.pptx`;
  await pptx.writeFile({ fileName: filename });
  return filename;
}

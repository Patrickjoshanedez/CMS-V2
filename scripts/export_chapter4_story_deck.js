const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'scratch', 'screenshots');
const OUT = path.join(ROOT, 'docs', 'CMS_V2_Chapter_4_Story_Deck.pptx');
const TOTAL = 16;

const NAVY = '073474';
const DARK = '1A253A';
const ORANGE = 'FF7701';
const GOLD = 'FFB647';
const GRAY = '595959';
const TEXT = '1E293B';
const MUTED = '475569';
const ALT = 'F1F5F9';
const BORDER = 'CBD5E1';
const GREEN = '047857';
const RED = 'B91C1C';
const AMBER_BG = 'FFF4E5';
const WHITE = 'FFFFFF';
const FONT = 'Poppins';

const shot = (rel) => path.join(SHOTS, rel);
const COT = path.join(ROOT, 'assets', 'cot-logo.png');
const BUKSU = path.join(ROOT, 'assets', 'buksu-shield-logo.png');

// Optional computed inputs: survey stats (alpha) and this-session test runs.
const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const SURVEY = readJson(path.join(SHOTS, 'ch4_story', 'survey_stats.json'));
const LIVE = readJson(path.join(SHOTS, 'ch4_story', 'live_results.json'));

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function capDate(file) {
  return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

const pptx = new pptxgen();
pptx.defineLayout({ name: 'CANVA_16x9', width: 20.0, height: 11.25 });
pptx.layout = 'CANVA_16x9';
pptx.title = 'Project Workspace — Chapter 4 Story Deck';
pptx.author = 'Añedez, Antipuesto, Bautista, Canoy';

const t = (slide, text, o = {}) =>
  slide.addText(text, { fontFace: FONT, color: TEXT, fontSize: 20, margin: 0, ...o });

function footer(slide, n) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 9.51,
    w: 20.0,
    h: 1.74,
    fill: { color: ORANGE },
    line: { color: GRAY, width: 2 },
  });
  t(slide, `SLIDE ${String(n).padStart(2, '0')} / ${TOTAL}  ·  Project Workspace · CMS-V2`, {
    x: 0.9,
    y: 9.9,
    w: 9.5,
    h: 0.9,
    fontSize: 22,
    bold: true,
    color: '000000',
    valign: 'middle',
  });
  slide.addText(
    [
      { text: 'BUKIDNON STATE UNIVERSITY\n', options: { fontSize: 22, bold: true } },
      { text: 'COLLEGE OF TECHNOLOGIES\n', options: { fontSize: 21, bold: true } },
      { text: 'Information Technology Department', options: { fontSize: 20 } },
    ],
    {
      x: 10.4,
      y: 9.75,
      w: 6.0,
      h: 1.3,
      align: 'right',
      valign: 'middle',
      fontFace: FONT,
      color: '000000',
      margin: 0,
      lineSpacingMultiple: 1.1,
    },
  );
  slide.addImage({ path: COT, x: 16.64, y: 9.62, w: 1.45, h: 1.45 });
  slide.addImage({ path: BUKSU, x: 18.24, y: 9.66, w: 1.44, h: 1.44 });
}

function contentSlide(n, kicker, title, notes) {
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  t(s, kicker, { x: 0.9, y: 0.45, w: 18.2, h: 0.4, fontSize: 20, bold: true, color: ORANGE });
  t(s, title, {
    x: 0.9,
    y: 0.9,
    w: 18.2,
    h: 0.95,
    fontSize: 38,
    bold: true,
    color: '000000',
    valign: 'middle',
  });
  footer(s, n);
  if (notes) s.addNotes(notes);
  return s;
}

function source(s, text) {
  t(s, text, { x: 0.9, y: 9.05, w: 18.2, h: 0.35, fontSize: 15, italic: true, color: MUTED });
}

// Contain-fit a screenshot inside a bordered frame, with a caption beneath.
function figure(s, rel, x, y, w, h, caption) {
  const file = shot(rel);
  const { w: iw, h: ih } = pngSize(file);
  const capH = 0.75;
  const boxH = h - capH;
  const scale = Math.min(w / iw, boxH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: boxH,
    fill: { color: 'F8FAFC' },
    line: { color: BORDER, width: 1.5 },
  });
  s.addImage({ path: file, x: x + (w - dw) / 2, y: y + (boxH - dh) / 2, w: dw, h: dh });
  t(s, `${caption} (captured ${capDate(file)})`, {
    x,
    y: y + boxH + 0.08,
    w,
    h: capH - 0.08,
    fontSize: 15,
    italic: true,
    color: MUTED,
    valign: 'top',
  });
}

function card(s, x, y, w, h, title, body, o = {}) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: o.fill || 'F8FAFC' },
    line: { color: o.line || BORDER, width: 1.5 },
  });
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w: 0.12,
    h,
    fill: { color: o.accent || ORANGE },
    line: { color: o.accent || ORANGE, width: 0 },
  });
  t(s, title, {
    x: x + 0.35,
    y: y + 0.15,
    w: w - 0.55,
    h: 0.55,
    fontSize: o.titleSize || 22,
    bold: true,
    color: DARK,
    valign: 'middle',
  });
  t(s, body, {
    x: x + 0.35,
    y: y + 0.75,
    w: w - 0.55,
    h: h - 0.9,
    fontSize: o.bodySize || 19,
    color: TEXT,
    valign: 'top',
    lineSpacingMultiple: 1.15,
  });
}

function kpi(s, x, y, w, h, value, label, o = {}) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: o.fill || NAVY },
    line: { color: o.fill || NAVY, width: 0 },
  });
  t(s, value, {
    x,
    y: y + 0.1,
    w,
    h: h * 0.55,
    fontSize: o.valueSize || 36,
    bold: true,
    color: o.valueColor || GOLD,
    align: 'center',
    valign: 'middle',
  });
  t(s, label, {
    x: x + 0.15,
    y: y + h * 0.58,
    w: w - 0.3,
    h: h * 0.38,
    fontSize: o.labelSize || 16,
    color: WHITE,
    align: 'center',
    valign: 'top',
  });
}

function banner(s, x, y, w, h, text, o = {}) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: o.fill || NAVY },
    line: { color: o.line || o.fill || NAVY, width: 1.5 },
  });
  t(s, text, {
    x: x + 0.3,
    y,
    w: w - 0.6,
    h,
    fontSize: o.size || 22,
    bold: o.bold !== false,
    color: o.color || WHITE,
    valign: 'middle',
    align: o.align || 'left',
  });
}

const hdr = (txt, o = {}) => ({
  text: txt,
  options: { bold: true, fill: { color: DARK }, color: WHITE, fontSize: 18, fontFace: FONT, ...o },
});
const cell = (txt, i, o = {}) => ({
  text: txt,
  options: {
    fontSize: 18,
    fontFace: FONT,
    color: TEXT,
    fill: { color: i % 2 ? ALT : WHITE },
    ...o,
  },
});

// ---------------------------------------------------------------- 01 Title
{
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  t(s, 'Project Workspace: Capstone management and Plagiarism checker', {
    x: 1.0,
    y: 1.2,
    w: 18.0,
    h: 2.5,
    fontSize: 48,
    bold: true,
    color: ORANGE,
    align: 'center',
    valign: 'middle',
  });
  t(
    s,
    'Chapter 4 · Results and Discussion — the story of a capstone, from first idea to sealed archive',
    {
      x: 2.0,
      y: 3.8,
      w: 16.0,
      h: 1.1,
      fontSize: 26,
      color: WHITE,
      align: 'center',
      valign: 'middle',
    },
  );
  s.addText(
    [
      {
        text: 'Añedez, Patrick Josh  ·  Antipuesto, Throylan\n',
        options: { fontSize: 28, bold: true },
      },
      { text: 'Bautista, Steven Joe  ·  Canoy, Chijay\n\n', options: { fontSize: 28, bold: true } },
      { text: '1ˢᵗ Semester – AY 2026 - 2027\n\n', options: { fontSize: 28 } },
      { text: 'Capstone Adviser: Glaiza Mae Libe', options: { fontSize: 28, bold: true } },
    ],
    {
      x: 1.0,
      y: 5.2,
      w: 18.0,
      h: 3.8,
      align: 'center',
      valign: 'top',
      fontFace: FONT,
      color: GOLD,
      margin: 0,
      lineSpacingMultiple: 1.15,
    },
  );
  footer(s, 1);
  s.addNotes(
    'Opening. This deck follows one capstone team through the system, then through the evidence. Six questions: what we built, its components, how it works, how we tested it, what we evaluated, what we found.',
  );
}

// ---------------------------------------------------------------- 02 Contents
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  t(s, 'Contents', {
    x: 0.9,
    y: 0.6,
    w: 18.2,
    h: 1.1,
    fontSize: 48,
    bold: true,
    color: '000000',
    valign: 'middle',
  });
  const acts = [
    ['1', 'What did we develop?', 'The paper problem and the 4-phase platform', 'Slides 3–4'],
    [
      '2',
      'What are its components?',
      'Role portals, Gantt + ADM gate, viewer + originality',
      'Slides 5–7',
    ],
    ['3', 'How does it work?', 'Architecture and data flow', 'Slide 8'],
    [
      '4',
      'How did we test it?',
      'Test dimensions, plagiarism benchmark, security and load',
      'Slides 9–11',
    ],
    [
      '5',
      'What did we evaluate?',
      'Instrument reliability and ISO/IEC 25010 evaluation',
      'Slides 12–13',
    ],
    ['6', 'What did we find?', 'Objectives, findings, limitations, conclusion', 'Slides 14–16'],
  ];
  acts.forEach((a, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.9 + col * 9.2;
    const y = 2.1 + row * 2.45;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: 9.0,
      h: 2.2,
      fill: { color: 'F8FAFC' },
      line: { color: BORDER, width: 1.5 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: 1.4,
      h: 2.2,
      fill: { color: NAVY },
      line: { color: NAVY, width: 0 },
    });
    t(s, a[0], {
      x,
      y,
      w: 1.4,
      h: 2.2,
      fontSize: 48,
      bold: true,
      color: GOLD,
      align: 'center',
      valign: 'middle',
    });
    t(s, a[1], {
      x: x + 1.7,
      y: y + 0.2,
      w: 7.1,
      h: 0.6,
      fontSize: 26,
      bold: true,
      color: DARK,
      valign: 'middle',
    });
    t(s, a[2], {
      x: x + 1.7,
      y: y + 0.85,
      w: 7.1,
      h: 0.85,
      fontSize: 19,
      color: TEXT,
      valign: 'top',
    });
    t(s, a[3], { x: x + 1.7, y: y + 1.7, w: 7.1, h: 0.4, fontSize: 17, bold: true, color: ORANGE });
  });
  footer(s, 2);
  s.addNotes(
    'Roadmap. Each act answers one of the six guiding questions and ends with evidence on screen.',
  );
}

// ---------------------------------------------------------------- 03 Paper problem
{
  const s = contentSlide(
    3,
    'ACT 1 · WHAT DID WE DEVELOP?',
    'It began on paper: slow, untracked, hard to prove',
    'Objective 1 findings: paper-based manuscript routing introduced substantial administrative delays and lacked centralized revision tracking. The Action Done Matrix is the official form where panel suggestions and student actions are recorded; the screenshot shows it now digitized. No percentage claims are made about historical delay because none were measured.',
  );
  const pains = [
    [
      'Paper routing',
      'Manuscripts and approvals moved by hand, adding substantial administrative delay.',
    ],
    [
      'No revision trail',
      'There was no centralized way to see what changed between manuscript versions.',
    ],
    [
      'Compliance unverifiable',
      'Panel remarks lived on paper, so addressed revisions could not be proven before sign-off.',
    ],
  ];
  pains.forEach((p, i) => card(s, 0.9, 2.05 + i * 2.1, 7.6, 1.9, p[0], p[1], { bodySize: 19 }));
  figure(
    s,
    'adm_print/03_adm_desktop_light_page1.png',
    8.9,
    2.0,
    10.2,
    5.95,
    'Fig. 3.1 — The Action Done Matrix form, now digitized in the Instructor Review portal',
  );
  banner(
    s,
    0.9,
    8.2,
    18.2,
    0.75,
    'The question: can one system carry a capstone from first idea to sealed archive?',
    { size: 24 },
  );
  source(s, 'Source: Chapter 4, §4.4.1 (Objective 1); ADM digitized form capture.');
}

// ---------------------------------------------------------------- 04 Four phases
{
  const s = contentSlide(
    4,
    'ACT 1 · WHAT DID WE DEVELOP?',
    'One platform walks a team through all four phases',
    'Table 4.1 condensed. Phase 0 forms the team and appoints the committee; Phase 1 handles title proposals with similarity pre-scan; Phase 2 manuscript review with the <25% plagiarism gate; Phase 3 prototype and Gantt milestones; Phase 4 final defense, multi-tier signatures, and sealed archival. Every stage is operational.',
  );
  const phases = [
    [
      'PHASE 0',
      'Team Formation',
      [
        '2–4 members, 5 specialized roles',
        'Instructor locks the roster',
        '1 Adviser · 1 Secretary · 3 Panelists',
      ],
      'Operational & Enforced',
    ],
    [
      'PHASE 1',
      'Title Proposal',
      ['1–10 titles, SDG 1–17 tags', 'Live archive similarity pre-scan', 'Defense rubric scoring'],
      'Operational (BGE-M3 core)',
    ],
    [
      'PHASE 2',
      'Manuscript Review',
      ['Chapters 1–3 upload', 'Hybrid plagiarism, < 25% gate', 'Midterm scoring · ADM v1'],
      'Operational (< 25% gate)',
    ],
    [
      'PHASE 3',
      'Prototype',
      ['Interactive Gantt, 4 milestones', 'Late-justification gate', 'Chapters 4–5 · ADM v2'],
      'Operational & Enforced',
    ],
    [
      'PHASE 4',
      'Final & Archive',
      ['Secretary endorsement gate', 'Tier 1–3 digital signatures', 'S3 auto-archive · sealed PDF'],
      'Operational & Sealed',
    ],
  ];
  phases.forEach((p, i) => {
    const x = 0.9 + i * 3.68;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y: 2.05,
      w: 3.5,
      h: 5.4,
      fill: { color: 'F8FAFC' },
      line: { color: BORDER, width: 1.5 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x,
      y: 2.05,
      w: 3.5,
      h: 1.35,
      fill: { color: NAVY },
      line: { color: NAVY, width: 0 },
    });
    t(s, p[0], { x: x + 0.25, y: 2.12, w: 3.0, h: 0.4, fontSize: 16, bold: true, color: GOLD });
    t(s, p[1], {
      x: x + 0.25,
      y: 2.5,
      w: 3.0,
      h: 0.8,
      fontSize: 23,
      bold: true,
      color: WHITE,
      valign: 'middle',
    });
    t(
      s,
      p[2].map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      {
        x: x + 0.25,
        y: 3.6,
        w: 3.05,
        h: 2.7,
        fontSize: 18,
        valign: 'top',
        paraSpaceAfter: 8,
      },
    );
    s.addShape(pptx.ShapeType.rect, {
      x: x + 0.2,
      y: 6.6,
      w: 3.1,
      h: 0.62,
      fill: { color: ORANGE },
      line: { color: ORANGE, width: 0 },
    });
    t(s, p[3], {
      x: x + 0.2,
      y: 6.6,
      w: 3.1,
      h: 0.62,
      fontSize: 15,
      bold: true,
      color: '000000',
      align: 'center',
      valign: 'middle',
    });
  });
  banner(
    s,
    0.9,
    7.8,
    18.2,
    0.95,
    'Our team story starts here: a group of four forms a roster, drafts titles, and moves left to right.',
    { size: 22 },
  );
  source(
    s,
    'Source: Table 4.1 — Operational Realization and Deployment Status of Project Workspace Modules.',
  );
}

// ---------------------------------------------------------------- 05 Role portals
{
  const s = contentSlide(
    5,
    'ACT 2 · WHAT ARE ITS COMPONENTS?',
    'Every role gets its own door',
    'Four role-based portals. Students draft proposals tagged to SDGs and disciplines; the instructor builds weighted rubrics and locks rosters; faculty panelists score and log remarks; the Secretary verifies compliance. Course instructors are rejected from committees by team.service assignCommittee (HTTP 403), shown later in the security test.',
  );
  figure(
    s,
    'proposal_approval_studio/proposal_approval_studio_desktop_light.png',
    0.9,
    1.95,
    8.9,
    4.55,
    'Fig. 5.1 — Student: Proposal Studio (SDG and discipline tags, pending defense approval)',
  );
  figure(
    s,
    '03_instructor_rubrics.png',
    10.2,
    1.95,
    8.9,
    4.55,
    'Fig. 5.2 — Instructor: Evaluation Rubric Builder (criteria total 100 points)',
  );
  const roles = [
    ['Student', 'Forms the team, drafts titles, tracks milestones'],
    ['Faculty', 'Scores rubrics, logs remarks, signs off'],
    ['Secretary', 'Logs the ADM, verifies compliance, endorses'],
    ['Instructor', 'Locks rosters, appoints committee; barred from sitting on it'],
  ];
  roles.forEach((r, i) =>
    card(s, 0.9 + i * 4.62, 6.75, 4.4, 2.2, r[0], r[1], { bodySize: 18, titleSize: 22 }),
  );
}

// ---------------------------------------------------------------- 06 Gantt + ADM
{
  const s = contentSlide(
    6,
    'ACT 2 · WHAT ARE ITS COMPONENTS?',
    'Where teams plan sprints and committees hold the line',
    'Left: the Interactive Academic Gantt chart, showing 98.47% overall accomplishment for the captured project, a 12-week sprint matrix and Excel export. Right: the student My Capstone stage tracker with the ADM v1 tab. The Secretary compliance gate (project.admSignatures.secretary.endorsed = true) must be set before Tier 1 to Tier 3 signatures unlock.',
  );
  figure(
    s,
    'academic_gantt_v2/02_desktop_light_academic_excel_gantt.png',
    0.9,
    1.95,
    9.0,
    4.95,
    'Fig. 6.1 — Interactive Academic Gantt (98.47% overall accomplishment)',
  );
  figure(
    s,
    'capstone1_and_capstone2/05_capstone1_adm_expanded_desktop_light.png',
    10.1,
    1.95,
    9.0,
    4.95,
    'Fig. 6.2 — Stage tracker and Action Done Matrix tab',
  );
  kpi(s, 0.9, 7.1, 5.8, 1.75, '98.47%', 'overall sprint accomplishment in the captured project');
  kpi(
    s,
    7.1,
    7.1,
    5.8,
    1.75,
    '4 milestones',
    'requirements · architecture · integration · verification',
  );
  kpi(
    s,
    13.3,
    7.1,
    5.8,
    1.75,
    'Endorse → Sign',
    'Secretary flag must be true before Tiers 1–3 unlock',
  );
}

// ---------------------------------------------------------------- 07 Viewer + originality
{
  const s = contentSlide(
    7,
    'ACT 2 · WHAT ARE ITS COMPONENTS?',
    'Reading, comparing, and checking originality in one place',
    'The SophisticatedDocumentViewer renders OOXML client-side with docx-preview and compares versions word by word: +97 words, -0 words, 11 comments in the capture. The originality drawer shows a composite 92.5% originality with exact (winnowing) overlap 39% and semantic (embedding cosine) overlap 62%, plus matched repository sources and risk tiers.',
  );
  figure(
    s,
    'revision_diff_audit/03_revision_diff_overview_desktop_light.png',
    0.9,
    1.95,
    9.0,
    5.0,
    'Fig. 7.1 — Revision Diff (+/-) Studio, Word Diff, v1 → v2',
  );
  figure(
    s,
    'archive_match_overview_audit/01_desktop_light_originality_drawer.png',
    10.1,
    1.95,
    9.0,
    5.0,
    'Fig. 7.2 — Originality & Match Overview drawer',
  );
  kpi(s, 0.9, 7.15, 5.8, 1.7, '+97 / −0', 'words added / deleted · 11 comments');
  kpi(s, 7.1, 7.15, 5.8, 1.7, '92.5%', 'composite originality (7.5% overlap)');
  kpi(s, 13.3, 7.15, 5.8, 1.7, '39% · 62%', 'exact (winnowing) · semantic (embedding)');
}

// ---------------------------------------------------------------- 08 Architecture
{
  const s = contentSlide(
    8,
    'ACT 3 · HOW DOES IT WORK?',
    'From a click to a sealed archive: the data flow',
    'Five layers. The React client talks to the Express 5 API, which authenticates with JWT and enforces role rules. Heavy work (manuscript ingestion) is queued in BullMQ on Redis, with Socket.IO streaming progress. Text comes from the OCR microservice with an in-process pdf-parse fallback. The FastAPI engine scores winnowing and BGE-M3 semantic similarity. Instructor Tier 3 sign-off archives to MinIO and updates ChromaDB.',
  );
  const comps = [
    ['Client', 'React 18 · Vite · Zustand · React Query'],
    ['API', 'Express 5 · Mongoose 9 · JWT · role guards'],
    ['Queue', 'Redis · BullMQ · Socket.IO progress'],
    ['Engines', 'FastAPI · BGE-M3 · ChromaDB · OCR (pdf-parse fallback)'],
    ['Storage', 'MongoDB · MinIO S3 · sealed PDF'],
  ];
  comps.forEach((c, i) => {
    const x = 0.9 + i * 3.7;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y: 2.05,
      w: 3.4,
      h: 2.3,
      fill: { color: i === 3 ? NAVY : 'F8FAFC' },
      line: { color: i === 3 ? NAVY : BORDER, width: 1.5 },
    });
    t(s, c[0], {
      x: x + 0.2,
      y: 2.15,
      w: 3.0,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: i === 3 ? GOLD : DARK,
      valign: 'middle',
    });
    t(s, c[1], {
      x: x + 0.2,
      y: 2.8,
      w: 3.0,
      h: 1.45,
      fontSize: 18,
      color: i === 3 ? WHITE : TEXT,
      valign: 'top',
    });
    if (i < 4)
      s.addShape(pptx.ShapeType.line, {
        x: x + 3.4,
        y: 3.2,
        w: 0.3,
        h: 0,
        line: { color: ORANGE, width: 3, endArrowType: 'triangle' },
      });
  });
  const steps = [
    'Upload manuscript',
    'Queue job (BullMQ)',
    'Extract text (OCR / pdf-parse)',
    'Score: winnowing + BGE-M3',
    'Gate < 25% · archive at Tier 3',
  ];
  t(s, 'DATA FLOW', { x: 0.9, y: 4.65, w: 6, h: 0.4, fontSize: 18, bold: true, color: ORANGE });
  steps.forEach((st, i) => {
    const x = 0.9 + i * 3.7;
    s.addShape(pptx.ShapeType.ellipse, {
      x,
      y: 5.15,
      w: 0.75,
      h: 0.75,
      fill: { color: ORANGE },
      line: { color: ORANGE, width: 0 },
    });
    t(s, String(i + 1), {
      x,
      y: 5.15,
      w: 0.75,
      h: 0.75,
      fontSize: 24,
      bold: true,
      color: '000000',
      align: 'center',
      valign: 'middle',
    });
    t(s, st, {
      x: x + 0.9,
      y: 5.05,
      w: 2.5,
      h: 0.95,
      fontSize: 18,
      bold: true,
      color: DARK,
      valign: 'middle',
    });
  });
  kpi(
    s,
    0.9,
    6.5,
    8.9,
    2.3,
    'S = 0.65·S_win + 0.35·S_sem',
    'hybrid similarity; weights from ablation on a 500-document validation split',
    { valueSize: 30, labelSize: 18 },
  );
  kpi(s, 10.1, 6.5, 4.4, 2.3, 't = 149 chars', 'winnowing k = 50, w = 100, t = w + k − 1', {
    valueSize: 30,
    labelSize: 17,
  });
  kpi(s, 14.7, 6.5, 4.4, 2.3, '1,024-d', 'BGE-M3 · HNSW M=16, efC=64 · cosine', {
    valueSize: 30,
    labelSize: 17,
  });
  source(
    s,
    'Source: Chapter 4, §4.2.3 (algorithm parameters), §4.1 (deployed components); architecture detail in Chapter 3.',
  );
}

// ---------------------------------------------------------------- 09 Test methodology
{
  const s = contentSlide(
    9,
    'ACT 4 · HOW DID WE TEST IT?',
    'Six ways we tried to break it',
    "Six verification dimensions. Route parity was re-run live for this deck: check:endpoints returned server 222, unmatched 0. The live client Vitest re-run passed 690 of 690 tests, so the manuscript's 384-case total is stale and should be updated. TC-01 to TC-08 are the end-to-end role scenarios from Table 4.2.",
  );
  const dims = [
    [
      '1 · Unit, integration, API parity',
      'Jest · Supertest · Vitest; every server route mapped to a client call',
    ],
    [
      '2 · End-to-end, by role',
      'TC-01…TC-08 across student, instructor, faculty, secretary, adviser',
    ],
    ['3 · Plagiarism benchmark', '2,450 manuscripts: 1,950 plagiarized + 500 genuine'],
    [
      '4 · Security & RBAC audit',
      'Committee exclusion, mutual exclusion, endorsement gate, JWT tampering',
    ],
    ['5 · Instrument reliability', "Cronbach's alpha on the 29-item questionnaire"],
    ['6 · Performance & load', 'k6 load harness, WebSocket rooms, CPU embedding latency'],
  ];
  dims.forEach((d, i) =>
    card(s, 0.9 + (i % 2) * 6.3, 2.05 + Math.floor(i / 2) * 2.3, 6.1, 2.1, d[0], d[1], {
      bodySize: 18,
      titleSize: 20,
    }),
  );
  kpi(s, 13.7, 2.05, 5.4, 1.95, '222 / 222', 'server routes matched · UNMATCHED = 0 (live)');
  kpi(s, 13.7, 4.15, 5.4, 1.95, '8 / 8', 'end-to-end scenarios TC-01…08 passed (Table 4.2)');
  kpi(
    s,
    13.7,
    6.25,
    5.4,
    1.95,
    LIVE ? `${LIVE.clientPassed} / ${LIVE.clientTotal}` : '384 cases',
    LIVE ? 'client Vitest tests passed (live re-run)' : 'automated tests (manuscript-reported)',
    { fill: GRAY },
  );
  const live = LIVE
    ? `Re-run ${LIVE.date}: ${LIVE.summary}`
    : 'Live re-run of the client Vitest and server suites is recorded in scratch/screenshots/ch4_story/.';
  source(s, live);
}

// ---------------------------------------------------------------- 10 Plagiarism benchmark
{
  const s = contentSlide(
    10,
    'ACT 4 · HOW DID WE TEST IT?',
    'Can it tell copied from original? 2,450 manuscripts',
    'Binary benchmark. Positives are the 1,950 plagiarized samples (600 verbatim, 500 paraphrased, 400 reordered, 450 cross-discipline); negatives are the 500 genuine manuscripts. TP 1,877, FN 73, TN 489, FP 11. Recall 96.26, specificity 97.80, precision 99.42, accuracy 96.57, F1 97.81. Weakest categories are paraphrase and cross-discipline text (about 94 to 95 percent recall).',
  );
  s.addChart(
    pptx.charts.BAR,
    [
      {
        name: 'Recall / Specificity (%)',
        labels: [
          'Verbatim',
          'Paraphrase',
          'Reordered',
          'Cross-discipline',
          'Genuine (specificity)',
        ],
        values: [99.67, 94.4, 95.25, 94.67, 97.8],
      },
    ],
    {
      x: 0.9,
      y: 2.0,
      w: 9.6,
      h: 5.3,
      barDir: 'col',
      chartColors: [NAVY, NAVY, NAVY, NAVY, ORANGE],
      showValue: true,
      dataLabelFontSize: 16,
      dataLabelFormatCode: '0.00',
      dataLabelColor: '000000',
      catAxisLabelFontSize: 15,
      catAxisLabelFontFace: FONT,
      valAxisLabelFontSize: 15,
      valAxisMinVal: 80,
      valAxisMaxVal: 100,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      showLegend: false,
      showTitle: true,
      title: 'Detection rate by content category (%)',
      titleFontSize: 18,
      titleFontFace: FONT,
      titleColor: DARK,
    },
  );
  t(s, 'CONFUSION MATRIX (N = 2,450)', {
    x: 11.0,
    y: 2.0,
    w: 8,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: ORANGE,
  });
  s.addTable(
    [
      [
        hdr(''),
        hdr('Predicted copied', { align: 'center' }),
        hdr('Predicted original', { align: 'center' }),
      ],
      [
        cell('Actually plagiarized', 0, { bold: true }),
        cell('TP 1,877', 0, { align: 'center', bold: true, color: GREEN }),
        cell('FN 73', 0, { align: 'center' }),
      ],
      [
        cell('Actually genuine', 1, { bold: true }),
        cell('FP 11', 1, { align: 'center' }),
        cell('TN 489', 1, { align: 'center', bold: true, color: GREEN }),
      ],
    ],
    {
      x: 11.0,
      y: 2.5,
      w: 8.1,
      colW: [2.9, 2.6, 2.6],
      rowH: [0.7, 0.9, 0.9],
      border: { pt: 1, color: BORDER },
      valign: 'middle',
    },
  );
  t(
    s,
    'Corpus: 600 verbatim · 500 paraphrased · 400 reordered · 450 cross-discipline · 500 genuine manuscripts verified against primary sources.',
    {
      x: 11.0,
      y: 5.2,
      w: 8.1,
      h: 1.2,
      fontSize: 18,
      valign: 'top',
    },
  );
  t(s, 'Hardest cases: paraphrase 94.40% and cross-discipline 94.67% recall.', {
    x: 11.0,
    y: 6.5,
    w: 8.1,
    h: 0.8,
    fontSize: 18,
    bold: true,
    color: DARK,
    valign: 'top',
  });
  [
    ['96.57%', 'Accuracy'],
    ['96.26%', 'Recall'],
    ['97.80%', 'Specificity'],
    ['99.42%', 'Precision'],
    ['97.81%', 'F1-score'],
  ].forEach((k, i) =>
    kpi(s, 0.9 + i * 3.7, 7.55, 3.4, 1.4, k[0], k[1], { valueSize: 32, labelSize: 17 }),
  );
  source(
    s,
    'Source: Table 4.3 (arithmetic re-checked: 1,877/1,950 · 489/500 · 1,877/1,888 · 2,366/2,450).',
  );
}

// ---------------------------------------------------------------- 11 Security + load
{
  const s = contentSlide(
    11,
    'ACT 4 · HOW DID WE TEST IT?',
    'Could it be attacked, and where does it bend?',
    'Left: four security vectors from section 4.2.4, each blocked with the expected HTTP status. Right: measured limits from the repository load harness dated 2026-09-26: WebSocket defense rooms accepted 25 of 25 connections; the authentication burst broke at 156 virtual users because bcrypt saturates the default libuv threadpool; a CPU-only BGE-M3 document check took 29.5 s. The amber note matters: Table 4.5 pre-scan latencies (184, 240, 392 ms) and the 50-VU run have no raw k6 artifact in the repo, so they must be re-run before the defense.',
  );
  t(s, 'SECURITY / RBAC — ATTACK ATTEMPTS', {
    x: 0.9,
    y: 1.95,
    w: 9,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: ORANGE,
  });
  s.addTable(
    [
      [hdr('Attack vector'), hdr('Result', { align: 'center' })],
      [
        cell('Instructor assigned to a defense committee', 0),
        cell('403 Forbidden', 0, { bold: true, color: GREEN, align: 'center' }),
      ],
      [
        cell('Same faculty as Adviser and Panelist', 1),
        cell('400 Bad Request', 1, { bold: true, color: GREEN, align: 'center' }),
      ],
      [
        cell('Tier 1/2 signature before Secretary endorsement', 0),
        cell('403 Forbidden', 0, { bold: true, color: GREEN, align: 'center' }),
      ],
      [
        cell('JWT tampering / expired session reuse', 1),
        cell('401 Unauthorized', 1, { bold: true, color: GREEN, align: 'center' }),
      ],
    ],
    {
      x: 0.9,
      y: 2.4,
      w: 9.0,
      colW: [6.0, 3.0],
      rowH: [0.6, 0.95, 0.95, 0.95, 0.95],
      border: { pt: 1, color: BORDER },
      valign: 'middle',
    },
  );
  t(s, 'MEASURED LIMITS — LOAD HARNESS (2026-09-26)', {
    x: 10.2,
    y: 1.95,
    w: 9,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: ORANGE,
  });
  s.addTable(
    [
      [hdr('Scenario'), hdr('Measured', { align: 'center' })],
      [
        cell('WebSocket defense rooms', 0),
        cell('25/25 connected · p95 handshake 1,382 ms', 0, { align: 'center' }),
      ],
      [
        cell('Auth burst (500 VU ramp)', 1),
        cell('Breaking point 156 VUs · 31.98% auth success', 1, {
          align: 'center',
          color: RED,
          bold: true,
        }),
      ],
      [
        cell('Document check, CPU only', 0),
        cell('29.5 s / document (no GPU)', 0, { align: 'center', color: RED, bold: true }),
      ],
    ],
    {
      x: 10.2,
      y: 2.4,
      w: 8.9,
      colW: [3.7, 5.2],
      rowH: [0.6, 1.1, 1.1, 1.1],
      border: { pt: 1, color: BORDER },
      valign: 'middle',
    },
  );
  banner(
    s,
    10.2,
    6.5,
    8.9,
    1.55,
    'Why it bends: bcrypt saturates the default 4-thread libuv pool; BGE-M3 runs single-worker on CPU.',
    { fill: AMBER_BG, line: ORANGE, color: DARK, size: 18, bold: false },
  );
  banner(
    s,
    0.9,
    7.15,
    9.0,
    1.7,
    'Open item: Table 4.5 (pre-scan 184 / 240 / 392 ms; 50 VU, 148 req/s) has no raw k6 artifact in the repo. Re-run and attach before defense.',
    { fill: AMBER_BG, line: ORANGE, color: DARK, size: 18, bold: false },
  );
  source(
    s,
    'Sources: §4.2.4; scratch/load_simulation_harness/ (k6_scenario1_report, scenario3_results, websocket_defense_report).',
  );
}

// ---------------------------------------------------------------- 12 Reliability
{
  const s = contentSlide(
    12,
    'ACT 5 · WHAT DID WE EVALUATE?',
    'Can we trust the questionnaire? Reliability first',
    "Respondent base corrected per the advisers' note: students 45 of 71 (63.38%), the instructor 1 of 1 (100%), faculty 0, excluded. Valid N = 46, which meets the at-least-30 rule for Cronbach's alpha. The manuscript's earlier N = 15 cohort is superseded. Alpha values are computed only from the raw item-level responses via scripts/compute_survey_stats.py; until the 46 by 29 export is supplied, the cells stay pending rather than reusing the old 0.938.",
  );
  t(s, 'RESPONDENT BASE', {
    x: 0.9,
    y: 1.95,
    w: 8,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: ORANGE,
  });
  s.addTable(
    [
      [
        hdr('Group'),
        hdr('Responded', { align: 'center' }),
        hdr('Rate', { align: 'center' }),
        hdr('Counted', { align: 'center' }),
      ],
      [
        cell('Students', 0, { bold: true }),
        cell('45 / 71', 0, { align: 'center' }),
        cell('63.38%', 0, { align: 'center' }),
        cell('Yes', 0, { align: 'center', color: GREEN, bold: true }),
      ],
      [
        cell('Instructor', 1, { bold: true }),
        cell('1 / 1', 1, { align: 'center' }),
        cell('100%', 1, { align: 'center' }),
        cell('Yes', 1, { align: 'center', color: GREEN, bold: true }),
      ],
      [
        cell('Faculty', 0, { bold: true }),
        cell('0', 0, { align: 'center' }),
        cell('—', 0, { align: 'center' }),
        cell('Excluded', 0, { align: 'center', color: RED, bold: true }),
      ],
      [
        cell('Valid N', 1, { bold: true }),
        cell('46', 1, { align: 'center', bold: true }),
        cell('', 1),
        cell('≥ 30 ✓', 1, { align: 'center', bold: true, color: GREEN }),
      ],
    ],
    {
      x: 0.9,
      y: 2.4,
      w: 8.4,
      colW: [2.4, 2.2, 1.7, 2.1],
      rowH: [0.65, 0.85, 0.85, 0.85, 0.85],
      border: { pt: 1, color: BORDER },
      valign: 'middle',
    },
  );
  t(s, "CRONBACH'S ALPHA (N = 46)", {
    x: 9.9,
    y: 1.95,
    w: 9,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: ORANGE,
  });
  const subs = [
    ['Functional Suitability & Workflow', 8],
    ['AI Plagiarism Detection & Semantic Accuracy', 6],
    ['Usability & Learnability (SUS)', 10],
    ['Security & Role Isolation (RBAC)', 5],
  ];
  const rows = [
    [
      hdr('Subscale'),
      hdr('k', { align: 'center' }),
      hdr('α', { align: 'center' }),
      hdr('Reading', { align: 'center' }),
    ],
  ];
  subs.forEach((sub, i) => {
    const r = SURVEY && SURVEY.subscales[i];
    rows.push([
      cell(sub[0], i),
      cell(String(sub[1]), i, { align: 'center' }),
      cell(r ? r.alpha.toFixed(3) : 'pending', i, {
        align: 'center',
        bold: true,
        color: r ? DARK : RED,
      }),
      cell(r ? r.interpretation : '—', i, { align: 'center' }),
    ]);
  });
  const ov = SURVEY && SURVEY.overall;
  rows.push([
    cell('Overall instrument', 0, { bold: true }),
    cell('29', 0, { align: 'center', bold: true }),
    cell(ov ? ov.alpha.toFixed(3) : 'pending', 0, {
      align: 'center',
      bold: true,
      color: ov ? DARK : RED,
    }),
    cell(ov ? ov.interpretation : '—', 0, { align: 'center' }),
  ]);
  s.addTable(rows, {
    x: 9.9,
    y: 2.4,
    w: 9.2,
    colW: [4.4, 0.8, 1.7, 2.3],
    rowH: [0.65, 0.75, 0.75, 0.75, 0.75, 0.75],
    border: { pt: 1, color: BORDER },
    valign: 'middle',
  });
  banner(
    s,
    0.9,
    7.15,
    18.2,
    1.0,
    'α = k/(k−1) · (1 − Σσᵢ² / σₜ²)   ·   ≥ 0.9 excellent · ≥ 0.8 good · ≥ 0.7 acceptable',
    { size: 22, align: 'center' },
  );
  banner(
    s,
    0.9,
    8.25,
    18.2,
    0.7,
    SURVEY
      ? 'Computed from the raw item-level responses of 46 respondents.'
      : 'Alpha is computed from the raw 46 × 29 export only; pending until supplied. The earlier 0.938 is not reused.',
    { fill: AMBER_BG, line: ORANGE, color: DARK, size: 18, bold: false },
  );
}

// ---------------------------------------------------------------- 13 ISO 25010
{
  const s = contentSlide(
    13,
    'ACT 5 · WHAT DID WE EVALUATE?',
    'What users thought: ISO/IEC 25010, eight characteristics',
    'These composite means are the manuscript Table 4.6 preliminary pilot values (earlier N = 15 cohort). They are shown for reference only and must be recomputed on the N = 46 sample (45 students, 1 instructor) once the raw responses are supplied. The Kruskal-Wallis comparison is dropped because there is no faculty group and the instructor group has a single respondent.',
  );
  s.addChart(
    pptx.charts.BAR,
    [
      {
        name: 'Composite mean (1–5)',
        labels: [
          'Portability',
          'Maintainability',
          'Security',
          'Reliability',
          'Usability',
          'Compatibility',
          'Performance',
          'Functional',
        ],
        values: [4.78, 4.79, 4.85, 4.79, 4.86, 4.81, 4.77, 4.83],
      },
    ],
    {
      x: 0.9,
      y: 2.0,
      w: 11.4,
      h: 5.6,
      barDir: 'bar',
      chartColors: ['9CA3AF'],
      showValue: true,
      dataLabelFontSize: 16,
      dataLabelFormatCode: '0.00',
      catAxisLabelFontSize: 16,
      catAxisLabelFontFace: FONT,
      valAxisLabelFontSize: 15,
      valAxisMinVal: 1,
      valAxisMaxVal: 5,
      valGridLine: { color: 'E2E8F0', size: 0.5 },
      showLegend: false,
      showTitle: true,
      title: 'Reference only — earlier pilot (N = 15), to be replaced',
      titleFontSize: 18,
      titleFontFace: FONT,
      titleColor: RED,
    },
  );
  card(
    s,
    12.6,
    2.0,
    6.5,
    2.55,
    'Scale',
    '5 Strongly agree · 4 Agree · 3 Neutral · 2 Disagree · 1 Strongly disagree. Higher means indicate stronger agreement.',
    { bodySize: 18 },
  );
  card(
    s,
    12.6,
    4.75,
    6.5,
    2.85,
    'Valid sample',
    'N = 46 = 45 students (of 71) + 1 instructor. Faculty: 0 responses. No group-comparison test: the instructor group has n = 1.',
    { bodySize: 18, accent: RED },
  );
  banner(
    s,
    0.9,
    7.85,
    18.2,
    1.05,
    'Status: means and SDs for N = 46 are pending the raw response export. Grey bars are the superseded pilot values, not final results.',
    { fill: AMBER_BG, line: ORANGE, color: DARK, size: 20, bold: false },
  );
}

// ---------------------------------------------------------------- 14 Objectives
{
  const s = contentSlide(
    14,
    'ACT 6 · WHAT DID WE FIND?',
    'Did we meet the five objectives?',
    'Objectives 1 to 3 are met by the deployed system and its screenshots. Objective 4 is supported by route parity, the end-to-end cases and the benchmark; the questionnaire reliability is pending recomputation. Objective 5 is only preliminarily supported until the N = 46 statistics are produced from raw data.',
  );
  const rows = [
    [
      hdr('#', { align: 'center' }),
      hdr('Objective'),
      hdr('Evidence'),
      hdr('Status', { align: 'center' }),
    ],
  ];
  [
    [
      '1',
      'Analyze the existing capstone framework',
      'Paper routing and missing revision tracking modeled into 4-phase workflows (Table 4.1)',
      'Met',
      GREEN,
    ],
    [
      '2',
      'Design workflow and architecture model',
      'Instructor exclusion and Secretary gate enforced (HTTP 403 / 400)',
      'Met',
      GREEN,
    ],
    [
      '3',
      'Develop the web platform + plagiarism checker',
      'Role portals, hybrid engine, OOXML viewer, Gantt (Figs. 5–7)',
      'Met',
      GREEN,
    ],
    [
      '4',
      'Test functionality and reliability',
      '222/222 routes · TC 8/8 · 96.57% accuracy · alpha pending recompute',
      'Met, alpha pending',
      ORANGE,
    ],
    [
      '5',
      'Evaluate usability and satisfaction',
      'Preliminary pilot only; N = 46 statistics pending raw data',
      'Preliminary',
      ORANGE,
    ],
  ].forEach((r, i) =>
    rows.push([
      cell(r[0], i, { align: 'center', bold: true }),
      cell(r[1], i, { bold: true }),
      cell(r[2], i),
      cell(r[3], i, { align: 'center', bold: true, color: r[4] }),
    ]),
  );
  s.addTable(rows, {
    x: 0.9,
    y: 2.0,
    w: 18.2,
    colW: [0.9, 5.2, 8.6, 3.5],
    rowH: [0.65, 1.15, 1.15, 1.15, 1.15, 1.15],
    border: { pt: 1, color: BORDER },
    valign: 'middle',
  });
  source(s, 'Source: Chapter 4, §4.4.1, updated to the corrected respondent base (N = 46).');
}

// ---------------------------------------------------------------- 15 Findings & limitations
{
  const s = contentSlide(
    15,
    'ACT 6 · WHAT DID WE FIND?',
    'What it proves, and what it cannot yet',
    'Left: observational pilot findings, grounded in measured trial data only. Right: limitations, now backed by the load harness: CPU-only embeddings take about 29.5 s per document, authentication saturates the libuv threadpool, OCR degrades on skewed scans, winnowing suits prose rather than LaTeX or source code. The survey itself has a narrow base: one instructor and no faculty.',
  );
  card(
    s,
    0.9,
    2.0,
    8.9,
    6.8,
    'What the pilot showed',
    [
      '8 of 30 trial titles flagged above 65% semantic overlap, letting teams refine scope before the hearing.',
      '88% of Gantt sub-tasks logged on schedule; late items passed the Late Justification Gate.',
      'Every trial defense produced a signed ADM audit trail, with no paper approval sheets.',
      'Manuscripts and the plagiarism engine stay on university infrastructure, aligned with RA 10173.',
    ].map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
    { bodySize: 24, accent: GREEN },
  );
  card(
    s,
    10.2,
    2.0,
    8.9,
    6.8,
    'Where it bends',
    [
      'Hardware: CPU-only BGE-M3 took 29.5 s per document; 4 GB RAM minimum for the engine.',
      'Auth load: the burst test broke at 156 virtual users (bcrypt on a 4-thread pool).',
      'OCR: skewed or artifact-heavy scans fall back to pdf-parse with lower accuracy.',
      'Winnowing is tuned for prose, not LaTeX equations or source code.',
      'Survey scope: 1 instructor, 0 faculty; no inferential group comparison.',
    ].map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
    { bodySize: 24, accent: RED },
  );
  source(
    s,
    'Sources: §4.4.2–4.4.4; scratch/load_simulation_harness/scenario1 and scenario3 results.',
  );
}

// ---------------------------------------------------------------- 16 Conclusion
{
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  t(s, 'Conclusion and next steps', {
    x: 0.9,
    y: 0.7,
    w: 18.2,
    h: 1.1,
    fontSize: 48,
    bold: true,
    color: ORANGE,
    valign: 'middle',
  });
  const left = [
    'All five capstone stages are deployed and operational, with role portals for every actor.',
    'The hybrid engine scored 96.57% accuracy and 97.81% F1 on 2,450 manuscripts.',
    'All 222 API routes are matched (0 unmatched); the 8 end-to-end scenarios passed.',
    'Security gates held: 403 / 400 / 403 / 401 on all four attack vectors.',
  ];
  const right = [
    'Recompute alpha and ISO 25010 means from the raw N = 46 responses.',
    'Re-run and archive the k6 pre-scan and 50-VU benchmarks.',
    'Add GPU or worker scaling and move bcrypt off the shared threadpool.',
    'Full departmental rollout, plus a multi-year cost study.',
  ];
  t(s, 'WHAT WE FOUND', { x: 0.9, y: 2.1, w: 8.5, h: 0.5, fontSize: 22, bold: true, color: GOLD });
  t(
    s,
    left.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
    {
      x: 0.9,
      y: 2.7,
      w: 8.6,
      h: 5.2,
      fontSize: 22,
      color: WHITE,
      valign: 'top',
      paraSpaceAfter: 12,
    },
  );
  t(s, 'WHAT COMES NEXT', {
    x: 10.2,
    y: 2.1,
    w: 8.5,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: GOLD,
  });
  t(
    s,
    right.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
    {
      x: 10.2,
      y: 2.7,
      w: 8.9,
      h: 5.2,
      fontSize: 22,
      color: WHITE,
      valign: 'top',
      paraSpaceAfter: 12,
    },
  );
  t(s, 'Thank you. Questions?', {
    x: 0.9,
    y: 8.1,
    w: 18.2,
    h: 1.0,
    fontSize: 36,
    bold: true,
    color: ORANGE,
    align: 'center',
    valign: 'middle',
  });
  footer(s, 16);
  s.addNotes(
    'Close with the two halves: what the evidence supports today, and the specific follow-ups that would make the evaluation and performance claims fully reproducible.',
  );
}

pptx.writeFile({ fileName: OUT }).then((f) => console.log('WROTE', f));

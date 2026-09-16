import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cotLogoPath = path.resolve(__dirname, '../../assets/buksu-cot-logo.png');
const itLogoPath = path.resolve(__dirname, '../../assets/buksu-it-logo.png');

const cotLogoBase64 = fs.existsSync(cotLogoPath)
  ? `data:image/png;base64,${fs.readFileSync(cotLogoPath).toString('base64')}`
  : '';
const itLogoBase64 = fs.existsSync(itLogoPath)
  ? `data:image/png;base64,${fs.readFileSync(itLogoPath).toString('base64')}`
  : '';

// Slide dimensions: 16:9 aspect ratio
// Width: 13.333in = 338.5mm, Height: 7.5in = 190.5mm
const SLIDE_WIDTH_MM = 338.5;
const SLIDE_HEIGHT_MM = 190.5;
const MAX_CONTENT_LINE_LENGTH = 90;
const MAX_LINES_PER_CONTENT_SLIDE = 6;

function escapeHtml(text = '') {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatSlideBody(text = '') {
  return escapeHtml(text).replace(/\n/g, '<br />');
}

function wrapLine(line = '', maxChars = MAX_CONTENT_LINE_LENGTH) {
  const normalizedLine = line.replace(/^[-•]\s*/, '').trim();
  if (!normalizedLine) {
    return [];
  }

  const words = normalizedLine.split(/\s+/);
  const wrapped = [];
  let current = '';

  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }

    wrapped.push(current);
    current = word;
  });

  if (current) {
    wrapped.push(current);
  }

  return wrapped;
}

function chunkBySize(items = [], size = MAX_LINES_PER_CONTENT_SLIDE) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildBodyChunks(text = '') {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const wrappedLines = rawLines.flatMap((line) => wrapLine(line, MAX_CONTENT_LINE_LENGTH));

  if (wrappedLines.length === 0) {
    return [['No details provided.']];
  }

  return chunkBySize(wrappedLines, MAX_LINES_PER_CONTENT_SLIDE);
}

function buildDeckHtml({ title, deckData }) {
  const slides = [
    {
      heading: 'Problem Statement',
      body: deckData.problemStatement,
    },
    {
      heading: 'Proposed Solution',
      body: deckData.proposedSolution,
    },
    {
      heading: 'Unique Technical Contribution',
      body: deckData.uniqueContribution,
    },
    {
      heading: 'Target Users & Beneficiaries',
      body: deckData.targetUsers,
    },
    {
      heading: 'Expected Institutional Impact',
      body: deckData.expectedImpact,
    },
  ];

  const titleSafe = escapeHtml(title);
  const footerHtml = `
    <footer>
      <div class="text-right">
        <div class="inst-bold">BUKIDNON STATE UNIVERSITY</div>
        <div class="inst-bold">COLLEGE OF TECHNOLOGIES</div>
        <div class="inst-reg">Information Technology Department</div>
      </div>
      <div class="logo-container">
        ${cotLogoBase64 ? `<img class="logo-img" src="${cotLogoBase64}" alt="BukSU COT Seal" />` : ''}
        ${itLogoBase64 ? `<img class="logo-img" src="${itLogoBase64}" alt="BukSU IT Shield" />` : ''}
      </div>
    </footer>
  `;

  const coverSlideHtml = `
    <section class="slide cover-slide" style="background-color: #0B3064;">
      <main>
        <h1 class="cover-title">${titleSafe}</h1>
      </main>
      ${footerHtml}
    </section>
  `;

  const contentSlidesHtml = slides
    .flatMap((slide) => {
      const bodyChunks = buildBodyChunks(slide.body);

      return bodyChunks.map((chunk, chunkIndex) => {
        const heading = chunkIndex === 0 ? slide.heading : `${slide.heading} (continued)`;

        return `
      <section class="slide content-slide">
        <main>
          <h1>${escapeHtml(heading)}</h1>
          <ul>
            ${chunk.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
          </ul>
        </main>
        ${footerHtml}
      </section>
    `;
      });
    })
    .join('');

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      @page {
        size: ${SLIDE_WIDTH_MM}mm ${SLIDE_HEIGHT_MM}mm;
        margin: 0;
      }
      html,
      body {
        width: ${SLIDE_WIDTH_MM}mm;
        height: ${SLIDE_HEIGHT_MM}mm;
        background-color: white;
        font-family: 'Arial', sans-serif;
      }
      .slide {
        width: ${SLIDE_WIDTH_MM}mm;
        height: ${SLIDE_HEIGHT_MM}mm;
        page-break-after: always;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
      }
      .slide:last-child {
        page-break-after: auto;
      }
      footer {
        position: absolute;
        bottom: 0;
        width: 100%;
        height: 28.5mm;
        background-color: #FF7300;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 0 24mm;
        z-index: 20;
      }
      div.text-right {
        text-align: right;
        color: #000000;
        line-height: 1.25;
      }
      .inst-bold {
        font-weight: 800;
        font-size: 4.8mm;
      }
      .inst-reg {
        font-weight: normal;
        font-size: 4.0mm;
      }
      div.logo-container {
        display: flex;
        gap: 3.5mm;
        margin-left: 6mm;
        align-items: center;
      }
      .logo-img {
        width: 18mm;
        height: 18mm;
        object-fit: contain;
        flex-shrink: 0;
      }
      main {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 16mm 24mm 32mm 24mm;
        position: relative;
        z-index: 10;
        width: 100%;
      }
      /* Cover slide specific (Image 2) */
      .cover-slide main {
        justify-content: center;
        align-items: center;
        text-align: center;
      }
      .cover-title {
        font-size: 15mm;
        font-weight: 900;
        color: #FFA726;
        line-height: 1.25;
        max-width: 90%;
        letter-spacing: -0.01em;
      }
      /* Content slides specific (Image 3) */
      .content-slide {
        background-color: white;
        color: #1E293B;
      }
      .content-slide main {
        justify-content: flex-start;
      }
      .content-slide h1 {
        font-size: 13mm;
        color: #000000;
        margin-bottom: 8mm;
        font-style: italic;
        font-weight: 900;
        letter-spacing: -0.02em;
      }
      .content-slide ul {
        font-size: 5.6mm;
        line-height: 1.75;
        color: #262626;
        list-style: disc;
        padding-left: 8mm;
      }
      .content-slide li {
        margin-bottom: 4mm;
        font-weight: 500;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .content-slide li::marker {
        color: #64748B;
      }
    </style>
  </head>
  <body>
    ${coverSlideHtml}
    ${contentSlidesHtml}
  </body>
</html>
  `;
}

class ProposalService {
  async generateDeckPdf(payload) {
    const html = buildDeckHtml(payload);
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      channel: process.env.PUPPETEER_EXECUTABLE_PATH ? undefined : 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      // Set viewport to match slide dimensions for consistent rendering
      await page.setViewport({
        width: Math.round((SLIDE_WIDTH_MM * 96) / 25.4), // Convert mm to pixels at 96 DPI
        height: Math.round((SLIDE_HEIGHT_MM * 96) / 25.4),
      });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        width: `${SLIDE_WIDTH_MM}mm`,
        height: `${SLIDE_HEIGHT_MM}mm`,
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF generation produced empty buffer');
      }

      // Puppeteer may return Uint8Array in some runtimes; normalize to Buffer for HTTP binary response.
      return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}

const proposalService = new ProposalService();

export default proposalService;

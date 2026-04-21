import puppeteer from 'puppeteer-core';

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
      heading: 'Unique Contribution / Innovation',
      body: deckData.uniqueContribution,
    },
    {
      heading: 'Target Users / Beneficiaries',
      body: deckData.targetUsers,
    },
    {
      heading: 'Expected Impact / Value',
      body: deckData.expectedImpact,
    },
  ];

  const titleSafe = escapeHtml(title);
  const footerHtml = `
    <footer>
      <div class="text-right">
        <div>BUKIDNON STATE UNIVERSITY</div>
        <div>COLLEGE OF TECHNOLOGIES</div>
        <div>Information Technology Department</div>
      </div>
      <div class="logo-container">
        <div class="logo logo-white"><span>BUKSU</span></div>
        <div class="logo logo-orange"><span>COT/IT</span></div>
      </div>
    </footer>
  `;

  const coverSlideHtml = `
    <section class="slide cover-slide" style="background-color: #0A3254;">
      <main>
        <h1>Capstone Project<br/>Pitch Proposal</h1>
        <div class="text-white">
          <p>Group Members / Authors / Team</p>
        </div>
        <div class="timestamp">
          1st Semester – AY 2025 – 2026
        </div>
      </main>
      ${footerHtml}
    </section>
  `;

  const titleSlideHtml = `
    <section class="slide title-slide" style="background-color: #0A3254;">
      <main>
        <h1>${titleSafe}</h1>
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
        background-color: #F58220;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 0 36mm;
        z-index: 20;
      }
      main {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 18mm 36mm;
        position: relative;
        z-index: 10;
        width: 100%;
      }
      h1 {
        font-weight: 900;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }
      div.text-right {
        text-align: right;
        color: black;
        font-weight: bold;
        font-size: 6.35mm;
      }
      div.logo-container {
        display: flex;
        gap: 4.76mm;
        margin-left: 9.52mm;
      }
      div.logo {
        width: 19.05mm;
        height: 19.05mm;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.27mm solid black;
        font-weight: bold;
        font-size: 3.81mm;
        flex-shrink: 0;
      }
      div.logo-white {
        background-color: white;
        border-radius: 50%;
      }
      div.logo-orange {
        background-color: #F58220;
      }
      /* Title slide specific */
      .title-slide main {
        justify-content: center;
        align-items: center;
        text-align: center;
      }
      .title-slide h1 {
        font-size: 19.05mm;
        color: #F58220;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        max-width: 85%;
        text-transform: uppercase;
        margin-bottom: 19.05mm;
      }
      .title-slide .text-white {
        color: white;
        font-size: 8.47mm;
        font-weight: 500;
      }
      .title-slide .timestamp {
        margin-top: 38.1mm;
        color: #FFD6A3;
        font-size: 4.76mm;
      }
      /* Cover slide specific */
      .cover-slide main {
        justify-content: center;
        padding-left: 75.4mm;
      }
      .cover-slide h1 {
        font-size: 19.05mm;
        color: #F58220;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        margin-bottom: 19.05mm;
      }
      .cover-slide .text-white {
        color: white;
        font-size: 8.47mm;
        font-weight: 500;
      }
      /* Content slides specific */
      .content-slide {
        background-color: white;
        color: black;
      }
      .content-slide main {
        padding-bottom: 21.2mm;
      }
      .content-slide h1 {
        font-size: 17.78mm;
        color: black;
        margin-bottom: 11.43mm;
        font-style: italic;
      }
      .content-slide ul {
        font-size: 7.62mm;
        line-height: 1.75;
        color: #4B5563;
        list-style: disc;
        padding-left: 7.62mm;
        margin-right: 11.43mm;
      }
      .content-slide li {
        margin-bottom: 3.81mm;
        font-weight: 500;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .content-slide li::marker {
        color: #999;
      }
      footer .text-right {
        font-size: 5.08mm;
      }
      footer .text-right div:nth-child(3) {
        font-size: 4.23mm;
        font-weight: normal;
      }
    </style>
  </head>
  <body>
    ${titleSlideHtml}
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
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      // Set viewport to match slide dimensions for consistent rendering
      await page.setViewport({
        width: Math.round((SLIDE_WIDTH_MM * 96) / 25.4), // Convert mm to pixels at 96 DPI
        height: Math.round((SLIDE_HEIGHT_MM * 96) / 25.4),
      });
      await page.setContent(html, { waitUntil: 'load' });
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

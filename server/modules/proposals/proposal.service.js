import puppeteer from 'puppeteer-core';

const SLIDE_WIDTH_IN = '13.333in';
const SLIDE_HEIGHT_IN = '7.5in';

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
    <footer class="mt-auto h-[15%] min-h-[100px] bg-[#F58220] flex items-center justify-end px-12 absolute bottom-0 w-full z-20">
      <div class="text-right text-black font-bold text-xl leading-tight">
        <div>BUKIDNON STATE UNIVERSITY</div>
        <div>COLLEGE OF TECHNOLOGIES</div>
        <div class="font-normal text-lg">Information Technology Department</div>
      </div>
      <div class="w-20 h-20 bg-white rounded-full ml-4 flex flex-col items-center justify-center text-[10px] font-bold text-black border-2 border-black overflow-hidden bg-cover bg-center">
        <span class="text-center px-1">BUKSU</span>
      </div>
      <div class="w-20 h-20 bg-[#F58220] ml-2 flex flex-col items-center justify-center text-xs font-bold text-black border-2 border-black">
        <span class="text-center">COT/IT</span>
      </div>
    </footer>
  `;

  const coverSlideHtml = `
    <section class="slide relative flex min-h-full flex-col overflow-hidden bg-[#0A3254] font-sans">
      <main class="flex flex-1 flex-col justify-center px-32 py-12 relative z-10 w-full mx-auto text-left">
        <h1 class="text-[4rem] font-bold tracking-tight text-[#F58220] drop-shadow-sm leading-tight mb-8">Capstone Project<br/>Pitch Proposal</h1>
        <div class="text-2xl text-white font-medium leading-relaxed">
          <p>Group Members / Authors / Team</p>
        </div>
        <div class="mt-16 text-xl text-orange-200">
          1st Semester – AY 2025 – 2026
        </div>
      </main>
      ${footerHtml}
    </section>
  `;

  const titleSlideHtml = `
    <section class="slide relative flex min-h-full flex-col overflow-hidden bg-[#0A3254] font-sans text-center">
      <main class="flex flex-1 flex-col justify-center items-center px-32 pt-12 pb-32 relative z-10 w-full mx-auto">
        <h1 class="text-5xl font-bold tracking-tight text-[#F58220] drop-shadow-sm leading-tight uppercase max-w-[90%]">
          ${titleSafe}
        </h1>
      </main>
      ${footerHtml}
    </section>
  `;

  const contentSlidesHtml = slides
    .map(
      (slide) => `
      <section class="slide relative flex min-h-full flex-col overflow-hidden bg-white text-black font-sans">
        <main class="flex flex-1 flex-col justify-start px-32 py-16 relative z-10 w-full mx-auto pb-40">
          <h1 class="mb-10 text-[3.5rem] font-extrabold italic tracking-tight text-black">${slide.heading}</h1>
          <ul class="text-[1.7rem] leading-[1.8] text-gray-800 list-disc pl-10 pr-12 marker:text-gray-500 font-medium">
            ${formatSlideBody(slide.body).split('<br />').map(line => {
              const trimmed = line.replace(/^- /, '').replace(/^• /, '').trim();
              return trimmed ? `<li>${trimmed}</li>` : '';
            }).join('')}
          </ul>
        </main>
        ${footerHtml}
      </section>
    `,
    )
    .join('');

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @page {
        size: ${SLIDE_WIDTH_IN} ${SLIDE_HEIGHT_IN};
        margin: 0;
      }
      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background-color: white;
        font-family: 'Arial', sans-serif;
      }
      .slide {
        width: 100vw;
        height: 100vh;
        page-break-after: always;
        box-sizing: border-box;
      }
      .slide:last-child {
        page-break-after: auto;
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
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('screen');

      return await page.pdf({
        width: SLIDE_WIDTH_IN,
        height: SLIDE_HEIGHT_IN,
        printBackground: true,
        preferCSSPageSize: true,
      });
    } finally {
      await browser.close();
    }
  }
}

const proposalService = new ProposalService();

export default proposalService;
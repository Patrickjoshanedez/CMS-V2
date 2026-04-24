// Extract first 2000 chars of raw text from each PDF to establish ground truth
import fs from 'fs';
import path from 'path';

const pdfs = [
  'C:\\Users\\patri\\OneDrive\\Desktop\\Holy folder\\CMS-V2\\sampleacademicpdf\\336597.336667.pdf',
  'C:\\Users\\patri\\OneDrive\\Desktop\\Holy folder\\CMS-V2\\sampleacademicpdf\\1066677.1066753.pdf',
  'C:\\Users\\patri\\OneDrive\\Desktop\\Holy folder\\CMS-V2\\sampleacademicpdf\\Deblina Mazumder Setu - A comprehensive strategy for identifying plagiarism in academic submissions [2025].pdf',
  'C:\\Users\\patri\\OneDrive\\Desktop\\Holy folder\\CMS-V2\\sampleacademicpdf\\Jenna Kanerva - Semantic search as extractive paraphrase span detection [2021].pdf',
  'C:\\Users\\patri\\OneDrive\\Desktop\\Holy folder\\CMS-V2\\sampleacademicpdf\\Rob van der Goot - ROB Using Semantic Meaning to Recognize Paraphrases [2015].pdf',
  'C:\\Users\\patri\\OneDrive\\Desktop\\Holy folder\\CMS-V2\\sampleacademicpdf\\S. Schleimer - Winnowing local algorithms for document fingerprinting [2003].pdf',
  'C:\\Users\\patri\\OneDrive\\Desktop\\Holy folder\\CMS-V2\\sampleacademicpdf\\Sherly Maria - Preprocessing Pipelines for EEG [2022].pdf'
];

async function parsePdf(pdfBuffer) {
  const pdfModule = await import('pdf-parse');
  if (typeof pdfModule.default === 'function') {
    return pdfModule.default(pdfBuffer);
  }
  if (typeof pdfModule.PDFParse === 'function') {
    const parser = new pdfModule.PDFParse({ data: pdfBuffer });
    try {
      const parsed = await parser.getText();
      return {
        text: parsed?.text || '',
        numpages: parsed?.numpages,
        info: parsed?.info,
      };
    } finally {
      await parser.destroy();
    }
  }
  throw new Error('Unsupported pdf-parse module shape');
}

async function main() {
  for (const pdfPath of pdfs) {
    const buf = fs.readFileSync(pdfPath);
    try {
      const data = await parsePdf(buf);
      console.log(`\n========== ${path.basename(pdfPath)} ==========`);
      console.log(`PDF Info Title: ${data.info?.Title || '(none)'}`);
      console.log(`PDF Info Author: ${data.info?.Author || '(none)'}`);
      console.log(`PDF Info CreationDate: ${data.info?.CreationDate || '(none)'}`);
      console.log(`--- First 2000 chars ---`);
      console.log(data.text.substring(0, 2000));
      console.log(`--- END ---`);
    } catch (e) {
      console.error(`Error parsing ${path.basename(pdfPath)}: ${e.message}`);
    }
  }
}

main().catch(console.error);

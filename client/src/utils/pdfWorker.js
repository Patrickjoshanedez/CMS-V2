import * as pdfjsLib from 'pdfjs-dist';

// Register the worker once before any PDF rendering begins
const workerUrl = '/pdf.worker.min.mjs';

if (typeof window !== 'undefined') {
  window.pdfjsLib = pdfjsLib;
  globalThis.pdfjsLib = pdfjsLib;
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    window.pdfjsWorkerSrc = workerUrl;
  }
}

export default workerUrl;

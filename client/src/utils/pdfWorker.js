import { GlobalWorkerOptions } from 'pdfjs-dist';
// Vite ?url import resolves the worker to a locally bundled, hashed URL
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Register the worker once before any PDF rendering begins
if (typeof window !== 'undefined' && GlobalWorkerOptions) {
  GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  window.pdfjsWorkerSrc = '/pdf.worker.min.mjs';
}

export default '/pdf.worker.min.mjs';

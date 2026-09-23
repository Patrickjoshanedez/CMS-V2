import { GlobalWorkerOptions } from 'pdfjs-dist';

// Register the worker once before any PDF rendering begins
const workerUrl = '/pdf.worker.min.mjs';

if (typeof window !== 'undefined' && GlobalWorkerOptions) {
  GlobalWorkerOptions.workerSrc = workerUrl;
  window.pdfjsWorkerSrc = workerUrl;
}

export default workerUrl;

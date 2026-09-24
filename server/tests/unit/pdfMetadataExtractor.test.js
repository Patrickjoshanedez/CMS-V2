import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const parsePdfMock = vi.fn();

vi.mock('../../services/ocrExtraction.service.js', () => ({
  ocrExtractionService: {
    parseDocument: vi.fn().mockResolvedValue({
      fullText: '',
      tables: [],
      formulas: [],
      metadata: { title: null, abstract: null, authors: [], year: null, page_count: 0 },
      ocrStatus: 'degraded',
    }),
  },
  default: {
    parseDocument: vi.fn().mockResolvedValue({
      fullText: '',
      tables: [],
      formulas: [],
      metadata: { title: null, abstract: null, authors: [], year: null, page_count: 0 },
      ocrStatus: 'degraded',
    }),
  },
}));

vi.mock('pdf-parse', () => ({
  default: parsePdfMock,
  PDFParse: class {
    constructor() {}
    async getText() {
      return parsePdfMock();
    }
    async destroy() {}
  },
}));

describe('pdfMetadataExtractor', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    parsePdfMock.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('extracts title, abstract, publicationYear, authors, and keywords from text', async () => {
    parsePdfMock.mockResolvedValue({
      text: [
        'Architecture and Implementation Patterns for Automated Academic PDF Metadata Extraction',
        'Jane Doe, John Smith and Maria Cruz',
        'ABSTRACT',
        'This study proposes a robust metadata extraction pipeline for academic documents.',
        'It combines parsing, validation, and resilient fallback mechanisms.',
        'Keywords: metadata extraction, academic pdf, document parsing, validation',
        'Introduction',
      ].join('\n'),
      numpages: 3,
      info: {
        CreationDate: 'D:20250410120000Z',
      },
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 mock'));

    expect(result.title).toContain('Architecture and Implementation Patterns');
    expect(result.abstract).toContain('robust metadata extraction pipeline');
    expect(result.publicationYear).toBe(2025);
    expect(result.authors).toEqual(['Jane Doe', 'John Smith', 'Maria Cruz']);
    expect(result.keywords).toEqual([
      'metadata extraction',
      'academic pdf',
      'document parsing',
      'validation',
    ]);
    expect(result.extractionProvider).toBe('heuristic');
    expect(result.confidence.title).toBeGreaterThan(0);
    expect(result.confidence.abstract).toBeGreaterThan(0);
    expect(result.confidence.publicationYear).toBeGreaterThan(0);
    expect(result.confidence.authors).toBeGreaterThan(0);
    expect(result.confidence.keywords).toBeGreaterThan(0);
  });

  it('returns safe defaults when text is empty', async () => {
    parsePdfMock.mockResolvedValue({
      text: '',
      numpages: 1,
      info: {},
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 empty'));

    expect(result.title).toBe('');
    expect(result.abstract).toBe('');
    expect(result.publicationYear).toBeNull();
    expect(result.authors).toEqual([]);
    expect(result.keywords).toEqual([]);
    expect(result.extractionProvider).toBe('heuristic');
  });

  it('accurately extracts metadata from real-world journal papers with editorial sidebars (MDPI, IEEE)', async () => {
    const mdpiPageText = `Academic Editor: Pedro Melo-Pinto
Received: 8 May 2025
Revised: 22 June 2025
Accepted: 27 June 2025
Published: 21 July 2025
Citation: Sun, Z.; Guo, P.; Li, Z.; Chen,
X.; Liu, X. Elevation-Aware Domain
Adaptation for Sematic Segmentation
of Aerial Images. Remote Sens. 2025, 17,
2529. https://doi.org/
rs17142529
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Article
Elevation-Aware Domain Adaptation for Sematic Segmentation
of Aerial Images
Zihao Sun 1, Peng Guo 2, Zehui Li 1, Xiuwan Chen 1 and Xinbo Liu 3,*
1 Institute of Remote Sensing and Geographic Information System, Peking University, Beijing 100871, China;
2 Land Satellite Remote Sensing Application Center, Ministry of Natural Resources of P.R. China, Beijing 100048, China;
3 China Yangtze Power Co., Ltd., Yichang 443000, China
* Correspondence: liu_xinbo@ctg.com.cn
Abstract
Recent advancements in Earth observation technologies have accelerated remote sensing
(RS) data acquisition, yet cross-domain semantic segmentation remains challenged by
domain shifts. Traditional unsupervised domain adaptation (UDA) methods often rely
on computationally intensive and unstable generative adversarial networks (GANs). This
study introduces elevation-aware domain adaptation (EADA), a multi-task framework that
integrates elevation estimation (via digital surface models) with semantic segmentation
to address distribution discrepancies. EADA employs a shared encoder and task-specific
decoders, enhanced by a spatial attention-based feature fusion module.
Keywords: unsupervised domain adaptation; semantic segmentation; remote sensing
image; self-supervision; multi-task learning
1. Introduction
In recent years, with the advancement of Earth observation technologies, diversification of imaging methods, and enhanced capabilities for acquiring remote sensing data,
the constraints on Earth observation have been gradually reduced.
Remote Sens. 2025, 17, 2529 https://doi.org/10.3390/rs17142529`;

    parsePdfMock.mockResolvedValue({
      text: mdpiPageText,
      numpages: 18,
      info: {},
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 mdpi-real-paper'));

    console.log('EXTRACTED RESULT:', JSON.stringify(result, null, 2));

    expect(result.title).toContain(
      'Elevation-Aware Domain Adaptation for Sematic Segmentation of Aerial Images',
    );
    expect(result.abstract).toContain('Recent advancements in Earth observation technologies');
    expect(result.publicationYear).toBe(2025);
    expect(result.doi).toBe('10.3390/rs17142529');
    expect(result.authors.length).toBeGreaterThanOrEqual(3);
    expect(result.authors).toContain('Zihao Sun');
    expect(result.authors).toContain('Peng Guo');
    expect(result.keywords).toContain('unsupervised domain adaptation');
    expect(result.keywords).toContain('semantic segmentation');
    expect(result.publicationVenue).toMatch(/Remote Sens/i);
  });

  it('accurately extracts metadata purely from heuristics when DOI enrichment is disabled', async () => {
    process.env.PDF_METADATA_ENABLE_DOI_ENRICHMENT = 'false';

    const mdpiPageText = `Academic Editor: Pedro Melo-Pinto
Received: 8 May 2025
Revised: 22 June 2025
Accepted: 27 June 2025
Published: 21 July 2025
Citation: Sun, Z.; Guo, P.; Li, Z.; Chen,
X.; Liu, X. Elevation-Aware Domain
Adaptation for Sematic Segmentation
of Aerial Images. Remote Sens. 2025, 17,
2529. https://doi.org/
rs17142529
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Article
Elevation-Aware Domain Adaptation for Sematic Segmentation
of Aerial Images
Zihao Sun 1, Peng Guo 2, Zehui Li 1, Xiuwan Chen 1 and Xinbo Liu 3,*
1 Institute of Remote Sensing and Geographic Information System, Peking University, Beijing 100871, China;
2 Land Satellite Remote Sensing Application Center, Ministry of Natural Resources of P.R. China, Beijing 100048, China;
3 China Yangtze Power Co., Ltd., Yichang 443000, China
* Correspondence: liu_xinbo@ctg.com.cn
Abstract
Recent advancements in Earth observation technologies have accelerated remote sensing
(RS) data acquisition, yet cross-domain semantic segmentation remains challenged by
domain shifts. Traditional unsupervised domain adaptation (UDA) methods often rely
on computationally intensive and unstable generative adversarial networks (GANs). This
study introduces elevation-aware domain adaptation (EADA), a multi-task framework that
integrates elevation estimation (via digital surface models) with semantic segmentation
to address distribution discrepancies. EADA employs a shared encoder and task-specific
decoders, enhanced by a spatial attention-based feature fusion module.
Keywords: unsupervised domain adaptation; semantic segmentation; remote sensing
image; self-supervision; multi-task learning
1. Introduction
In recent years, with the advancement of Earth observation technologies, diversification of imaging methods, and enhanced capabilities for acquiring remote sensing data,
the constraints on Earth observation have been gradually reduced.
Remote Sens. 2025, 17, 2529 https://doi.org/10.3390/rs17142529`;

    parsePdfMock.mockResolvedValue({
      text: mdpiPageText,
      numpages: 18,
      info: {},
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 mdpi-pure-heuristics'));

    console.log('HEURISTIC-ONLY RESULT:', JSON.stringify(result, null, 2));

    expect(result.title).toContain('Elevation-Aware Domain Adaptation');
    expect(result.abstract).toContain('Recent advancements in Earth observation technologies');
    expect(result.publicationYear).toBe(2025);
    expect(result.doi).toBe('10.3390/rs17142529');
    expect(result.authors.length).toBeGreaterThanOrEqual(1);
    expect(result.keywords).toContain('unsupervised domain adaptation');
  });

  it('accurately extracts conference proceedings venues and short acronyms (ICML, CVPR, NeurIPS, ACL)', async () => {
    process.env.PDF_METADATA_ENABLE_DOI_ENRICHMENT = 'false';

    const conferencePaperText = `Proceedings of the 41st International Conference on Machine Learning, Vienna, Austria, PMLR 235, 2024.
Title: Scalable Representation Learning via Dual Vector Field Optimization
Author: Alex Morgan and Samantha Vance
Abstract: We introduce a scalable approach to representation learning in high-dimensional spaces using dual vector fields. Our empirical analysis shows substantial speedups over standard baselines.
Keywords: representation learning, vector fields, optimization
1. Introduction
Modern machine learning models require scalable training algorithms.`;

    parsePdfMock.mockResolvedValue({
      text: conferencePaperText,
      numpages: 12,
      info: {},
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 icml-paper'));

    expect(result.publicationVenue).toBe(
      'Proceedings of the 41st International Conference on Machine Learning',
    );
    expect(result.confidence.publicationVenue).toBeGreaterThan(0.7);
  });

  it('accurately extracts preprint repository venues (arXiv, bioRxiv)', async () => {
    process.env.PDF_METADATA_ENABLE_DOI_ENRICHMENT = 'false';

    const arxivPaperText = `arXiv:2401.09876v2 [cs.LG] 18 Jan 2024
Diffusion Models for Graph Spectral Clustering
Elena Rostova, Dmitri Volkov
Abstract: Graph clustering remains a fundamental challenge in unsupervised structured learning. In this work, we propose a diffusion model over graph Laplacians.
Keywords: diffusion models, spectral clustering, graph learning
1. Introduction`;

    parsePdfMock.mockResolvedValue({
      text: arxivPaperText,
      numpages: 10,
      info: {},
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 arxiv-paper'));

    expect(result.publicationVenue).toBe('arXiv');
    expect(result.confidence.publicationVenue).toBeGreaterThan(0.7);
  });

  it('strictly disambiguates publication venues from bare publishers and physical locations', async () => {
    process.env.PDF_METADATA_ENABLE_DOI_ENRICHMENT = 'false';

    const ieeePaperText = `Honolulu, Hawaii, USA, June 18-22, 2024
IEEE
IEEE Transactions on Pattern Analysis and Machine Intelligence
Deep Multimodal Fusion for Autonomous Navigation
Sarah Connor, John Connor
Abstract: Autonomous systems rely on multi-sensor redundancy for safety-critical navigation in unstructured outdoor environments.
Keywords: autonomous navigation, multimodal fusion, deep learning
Published by IEEE Computer Society. Copyright © 2024 IEEE.`;

    parsePdfMock.mockResolvedValue({
      text: ieeePaperText,
      numpages: 14,
      info: {},
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 ieee-pami-paper'));

    // Must match the actual journal name, NEVER the bare publisher "IEEE", and NEVER the location "Honolulu, Hawaii, USA"
    expect(result.publicationVenue).toBe(
      'IEEE Transactions on Pattern Analysis and Machine Intelligence',
    );
    expect(result.publicationVenue).not.toBe('IEEE');
    expect(result.publicationVenue).not.toContain('Honolulu');
  });

  it('accurately resolves conference proceedings venues from CrossRef CSL event and collection metadata', async () => {
    process.env.PDF_METADATA_ENABLE_DOI_ENRICHMENT = 'true';

    // Mock global.fetch for DOI lookup
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (String(url).includes('10.1145%2F3613904')) {
        return {
          ok: true,
          json: async () => ({
            title: 'SenseCraft: Rapid Prototyping of Tactile Interfaces',
            author: [{ given: 'Alice', family: 'Vanderbilt' }],
            issued: { 'date-parts': [[2024]] },
            // container-title is missing or publisher-only in some conference records
            'container-title': null,
            event: {
              name: 'ACM CHI Conference on Human Factors in Computing Systems',
            },
            'collection-title': ['CHI Conference Proceedings'],
          }),
        };
      }
      return originalFetch(url);
    });

    try {
      parsePdfMock.mockResolvedValue({
        text: `SenseCraft: Rapid Prototyping of Tactile Interfaces
Alice Vanderbilt
doi: 10.1145/3613904
Abstract: We present SenseCraft, an open-source development kit for rapid fabrication of multimodal tactile surfaces.
Keywords: tactile interfaces, fabrication, prototyping`,
        numpages: 8,
        info: {},
      });

      const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
      const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 chi-paper'));

      expect(result.doi).toBe('10.1145/3613904');
      expect(result.publicationVenue).toBe(
        'ACM CHI Conference on Human Factors in Computing Systems',
      );
      expect(result.fieldSources.publicationVenue).toBe('doi');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

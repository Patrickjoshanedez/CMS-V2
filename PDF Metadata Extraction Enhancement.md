# **Architecture and Implementation Patterns for Automated Academic PDF Metadata Extraction**

The transition from a deterministic, heuristic-based document parsing script to an intelligent, highly resilient metadata extraction pipeline represents a critical architectural evolution for modern academic repositories. The current implementation within the workspace relies on a synchronous backend endpoint (document.routes.js) that passes an uploaded file buffer to a deterministic parser (pdfMetadataExtractor.js). This parser utilizes pdf-parse to read embedded text strings, subsequently applying regular expressions and line-based heuristics to identify the title and abstract. Because the methodology relies on locating "Abstract" markers and stopping at predefined section headers (e.g., Introduction, Keywords, Background), it inherently fails to reliably capture highly variable entities such as the authors, their institutional affiliations, and the exact publication year.

Consequently, in the existing user interface—specifically within ExistingCapstoneUploadPage.jsx and ArchiveLegacyUploadPage.jsx—the system only auto-extracts the title and abstract when a PDF is selected. The instructor is burdened with the manual entry of the remaining metadata, fundamentally violating the objective of a "hassle-free" upload experience. To eliminate this friction, the system must be re-architected to fetch the complete metadata profile: title, abstract, publication year, comprehensive author lists, and supplementary data such as Digital Object Identifiers (DOIs). Achieving this requires replacing the brittle regex heuristics with a multi-tiered architecture that integrates specialized machine learning document parsers, authoritative scholarly API validation layers, Large Language Model (LLM) fallbacks, asynchronous message brokers, and an optimized side-by-side React frontend.

## **Assessing the Limitations of Heuristic PDF Parsing**

The foundational flaw in the current pdfMetadataExtractor.js implementation is the treatment of a Portable Document Format (PDF) file as a linear, one-dimensional text string. PDFs are inherently visual documents; their underlying data structure dictates absolute coordinates for character placement rather than semantic HTML-like tags. When tools like pdf-parse flatten this two-dimensional spatial data into a single string, critical contextual clues—such as font hierarchies, column layouts, margins, and spatial grouping—are permanently destroyed.

Regular expressions excel at identifying highly structured, predictable patterns, such as email addresses or standardized dates. However, academic formatting exhibits extreme heterogeneity. Across thousands of distinct publishers, preprint servers, and institutional repositories, the placement and typography of authors and publication years vary wildly. An author list might appear directly below the title, grouped in a single line, or distributed across multiple columns with superscripts linking to institutional affiliations located in the footer. A publication year might be embedded within a copyright string, a citation suggestion block, or a journal volume header. A deterministic parser attempting to navigate this variability must continuously implement new rules for every edge case, leading to an unsustainable, fragile codebase. The current logic actively avoids this complexity by explicitly skipping year-like and author-like lines while hunting for the title, acknowledging the futility of heuristic extraction for these specific fields. To capture this data reliably, the backend must adopt technologies that analyze both the textual content and the geometric layout of the document simultaneously.

## **The Backend Paradigm Shift: Asynchronous Message Brokers**

Before introducing advanced machine learning models or external API calls into the extraction pipeline, the underlying backend infrastructure must be modified. The current architecture executes the pdfMetadataExtractor.js logic synchronously during the upload flow, immediately prior to creating the submission record in submission.service.js. While this synchronous execution is feasible for instantaneous regex operations, it is disastrous for the proposed architecture. Machine learning inference, PDF geometric analysis, and network requests to external scholarly APIs introduce significant, variable latency. Executing these tasks synchronously within the HTTP request-response cycle will block the Node.js single-threaded event loop, leading to server timeouts, degraded application scalability, and a severely compromised user experience during bulk uploads.

To achieve a seamless, non-blocking upload flow, the backend must transition to an asynchronous, event-driven architecture utilizing a message broker. In the Node.js ecosystem, BullMQ—backed by an in-memory data structure store such as Redis or Valkey—provides the industry standard for managing distributed background jobs and complex worker queues.1

The implementation of this asynchronous architecture fundamentally alters the upload lifecycle. When the instructor selects a PDF in ExistingCapstoneUploadPage.jsx, the frontend transmits the file to the backend via a standard POST request. Upon receiving the file, document.routes.js immediately offloads the raw buffer to a temporary object storage volume or local file system. Rather than initiating the extraction process directly, the endpoint instantiates a new job within the BullMQ "metadata-extraction" queue, passing the file storage reference and a unique Job ID. The HTTP endpoint then immediately returns a 202 Accepted status to the frontend alongside the Job ID, closing the connection and freeing the server to handle concurrent requests.3

Concurrently, a separate, dedicated Node.js worker process continuously polls the Redis queue.1 When the extraction job is detected, this worker node pulls the task and executes the CPU-intensive and network-bound operations.2 This separation of concerns ensures that the core API remains highly responsive. Furthermore, BullMQ natively provides critical fault-tolerance mechanisms, including granular concurrency control, rate limiting for external API interactions, and automated retry logic with exponential backoff.1 If an external API experiences a momentary outage, the worker can safely pause and retry the job without impacting the end-user's session.

Because the HTTP request closes before the extraction completes, the backend requires a real-time communication channel to push the finalized metadata payload back to the instructor's browser. Establishing a WebSocket connection or utilizing Server-Sent Events (SSE) allows the server to proactively emit the extraction results directly to the React application. Upon receiving this payload, the frontend dynamically populates the metadata fields, providing the instructor with instantaneous, automated form completion.

## **The Primary Extraction Engine: Deploying GROBID**

With the asynchronous infrastructure established, the core extraction logic must be upgraded from the deterministic pdf-parse script to a sophisticated machine learning framework. For the highly specific task of extracting structural metadata from academic publications, GROBID (GeneRation Of BIbliographic Data) represents the definitive state-of-the-art solution.4

GROBID is an advanced machine learning library engineered specifically to extract, parse, and restructure raw academic PDFs into highly structured XML/TEI (Text Encoding Initiative) encoded documents.5 Unlike generalized text extraction tools, GROBID operates by analyzing the joint text and visual/layout information of the PDF.6 It utilizes an underlying utility called pdfalto to extract not only the text but also the precise geometric bounding boxes, font sizes, and structural positioning of every token on the page.7 This layout awareness allows GROBID to differentiate between a mathematical superscript and an author affiliation marker based on spatial orientation.

The system processes these features using advanced sequence labeling algorithms. Historically relying on feature-engineered Conditional Random Fields (CRF), modern iterations of GROBID support Deep Learning architectures, including recurrent neural networks and layout-aware transformers, allowing developers to balance computational scalability with extraction accuracy.6 By treating the document as a continuous sequence of tokens and applying probabilistic models, GROBID can accurately identify metadata fields regardless of the publisher's template or the document's formatting idiosyncrasies.

Extensive benchmarking validates GROBID's superiority over alternative parsing frameworks such as CERMINE, Science Parse, and PdfAct.9 When evaluated against comprehensive datasets like DocBank, GROBID consistently achieves the highest precision and recall metrics across core metadata categories.

| Extraction Tool | Title F1-Score | Abstract F1-Score | Author F1-Score | Reference F1-Score | Architectural Approach |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **GROBID** | 0.91 | 0.82 | 0.52 \- 0.90+ | 0.79 \- 0.87 | Machine Learning (CRF & Deep Learning) |
| **CERMINE** | 0.81 | 0.72 | 0.44 | 0.74 | Support Vector Machines (SVM) / CRF |
| **Science Parse** | Poor | 0.81 | Poor | 0.49 | Rule-based & Machine Learning Hybrid |
| **PdfAct** | Modest | Modest | Modest | 0.15 | Rule-based heuristics |

The performance data clearly demonstrates that GROBID resolves the fundamental limitations of the current workspace implementation.8 It excels at extracting titles and abstracts, but more importantly, it introduces the capability to extract author lists and parsing dates into ISO-normalized formats (day, month, year).6 Furthermore, GROBID successfully extracts over 55 to 68 fine-grained structural labels, including DOIs, PubMed IDs (PMIDs), detailed institutional affiliations, journal volumes, and even funding information.6

Integrating GROBID into the Node.js backend requires deploying it as a containerized microservice via Docker.11 The GROBID container exposes a robust RESTful Web Service API.6 The BullMQ worker simply submits the PDF buffer to the GROBID /api/processHeaderDocument endpoint. Because GROBID is thread-safe and manages an internal pool of parser instances, it handles parallel processing exceptionally well; benchmarks demonstrate throughputs of up to 10.6 PDFs per second utilizing multi-threading capabilities.7

By entirely replacing pdfMetadataExtractor.js with a network call to a local GROBID container, the system instantly gains the ability to extract the title, abstract, authors, and year with high degrees of accuracy. However, machine learning extraction is probabilistic, not absolute. Author extraction, while vastly improved over regex, remains a challenging domain due to the complexity of institutional mapping.9 Therefore, the data extracted by GROBID must serve as the foundation for a secondary validation layer.

## **The Validation Layer: Authoritative Scholarly APIs**

Even a perfectly accurate layout parser can only extract the data that is physically printed on the PDF. Often, academic preprints or legacy scanned documents contain incomplete author lists, abbreviate institutional affiliations, or lack a formal publication year entirely. To guarantee that the instructor receives an exhaustive and globally verified metadata profile, the backend must cross-reference the data extracted by GROBID against authoritative scholarly databases. This process transforms local extraction into global verification.

### **Crossref REST API Integration**

The primary mechanism for this validation is the Crossref REST API. Crossref maintains an openly accessible, public infrastructure containing structured metadata for over 170 million scholarly records, including journal articles, datasets, preprints, and conference proceedings.4 This metadata is deposited directly by the publishers, ensuring it acts as the definitive source of truth.15

If the initial GROBID extraction successfully identifies a Digital Object Identifier (DOI) within the PDF text, the BullMQ worker can directly query the Crossref /works/{doi} endpoint.16 This request returns a comprehensive JSON payload containing the highly structured author list, full ORCID identifiers, funding data, licensing terms, complete publication dates, and journal container titles.14 The worker then merges this pristine dataset with the GROBID extraction, prioritizing the Crossref data to overwrite any potential parsing errors.

However, the true power of the Crossref API lies in its ability to match records when a DOI is not explicitly printed in the document. The system achieves this by utilizing the query.bibliographic parameter.17 Historically, developers utilized a query.title parameter, but this has been deprecated in favor of the more robust query.bibliographic search.17 This endpoint accepts unstructured or semi-structured citation strings and searches across a subset of bibliographic fields—including titles, authors, ISSNs, and publication years—returning a list of the closest matches.17

By concatenating the title and first author extracted by GROBID and passing it to the query.bibliographic endpoint, the backend can mathematically locate the corresponding official record.18 It is critical to note that the Crossref API will always return results ranked by a relevance score, even if the input data is highly inaccurate.20 The API does not inherently filter out poor matches; it simply ranks them.20 Therefore, the implementation within the BullMQ worker must enforce a strict relevancy score threshold. If the top result exceeds this threshold, the system extracts the full author list and publication year from the matched record. If the score falls below the threshold, the match is discarded to prevent false-positive metadata contamination.

When querying the Crossref REST API, the backend should be configured to utilize the "Polite Pool." While the API is public and requires no authentication, requests that include an email address in the mailto parameter or the user-agent header are routed to a dedicated, higher-performance server pool, preventing unexpected rate-limiting during high-volume upload events.15

### **Semantic Scholar Academic Graph (S2AG) Integration**

As a complementary validation layer, the backend should also query the Semantic Scholar Academic Graph (S2AG) API. Developed by the Allen Institute for AI, Semantic Scholar utilizes machine learning to extract meaning and identify connections across scientific literature, maintaining a massive, actively expanding corpus of academic metadata.21

While Crossref relies strictly on publisher deposits—which can occasionally result in incomplete reference lists or missing abstracts—Semantic Scholar actively indexes and extracts data from the open web.14 Bibliometric analysis indicates that for certain publishers and disciplines, Semantic Scholar possesses significantly higher reference counts and more robust abstract indexing than its competitors.22

The S2AG RESTful API provides a highly optimized endpoint specifically designed for this architecture: the Paper Title Search (/paper/search/match).23 When the BullMQ worker submits the GROBID-extracted title to this endpoint, the API returns the single highest match result.23 By utilizing the fields query parameter, the backend can selectively request specific data points, such as fields=title,authors,abstract,year,citationCount.23 This selective querying minimizes the payload size and maximizes API response speeds.24 The Semantic Scholar API acts as an excellent fail-safe; if GROBID extracts a title but fails to extract the abstract, and Crossref lacks the abstract in its publisher deposit, the S2AG API can provide the missing textual summary, ensuring the instructor's form is completely populated.

## **Advanced Heuristic Inference: Large Language Models (LLMs)**

If the PDF is highly non-standard—such as a heavily stylized master's thesis, a poorly formatted legacy scan, or a document written in a language outside of GROBID's primary training distribution—both the local extraction and the external API lookups may fail to return a complete profile. To guarantee a "hassle-free" experience, the architecture must implement a final fallback mechanism capable of extreme adaptability: Large Language Models (LLMs).

Recent advances have demonstrated that modern LLMs, such as GPT-4o, Claude 3.5 Sonnet, or specialized open-source models like Qwen3, are highly capable of performing zero-shot metadata extraction and annotation with accuracy comparable to human experts.25 Frameworks such as MOLE (Metadata Extraction and Validation in Scientific Papers Using LLMs) have systematized this approach, proving that LLMs can extract over 30 distinct attributes from scientific papers across diverse linguistic domains.27

Unlike GROBID, which relies on sequence labeling trained on specific visual and textual features, LLMs excel at semantic comprehension.29 When provided with the raw, unstructured text of a document, an LLM can utilize its vast pre-training to infer context.29 It understands that a string of names followed by university departments represents the author list, and that a four-digit number following a copyright symbol represents the publication year, even if the layout is entirely novel.29 In benchmark evaluations utilizing "LLM-as-a-judge" paradigms for complex semantic extraction, LLMs achieved a Pearson correlation of 0.93 with human judgment, vastly outperforming traditional rule-based metrics.30

### **Mitigating Hallucinations and Optimizing Context**

However, the deployment of LLMs introduces critical vulnerabilities. The most severe is hallucination—the well-documented tendency of the model to generate fabricated or highly plausible but factually incorrect information when faced with ambiguity.26 If an LLM cannot find the publication year, it may probabilistically guess a recent year to fulfill the prompt's request.

To mitigate this, the BullMQ worker must utilize **Structured Outputs**. Modern LLM APIs allow developers to pass a strict JSON Schema definition alongside the prompt. This forces the model to constrain its generation exclusively to the defined schema, guaranteeing that the output will be structurally valid JSON and preventing the model from injecting conversational text or markdown formatting.31

Furthermore, processing entire PDFs through an LLM is computationally prohibitive and prone to context dilution.26 Research indicates that providing the model with a highly targeted context window improves reliability. Therefore, the backend should utilize a lightweight utility (such as pdf-parse) to extract only the text from the first three pages of the document, as the title, authors, abstract, and year are almost exclusively located in this region. This minimized text string is then injected into the LLM prompt.

### **The Specialized LLM Prompt Definition**

The effectiveness of this fallback layer relies entirely on prompt engineering.32 The prompt must enforce a strict, analytical role, explicitly detailing the required fields, and containing explicit instructions to return empty values rather than hallucinating missing data. Based on the project requirements, the following prompt is designed to be programmatically assembled within the BullMQ worker and passed to the LLM API.

You are an expert automated academic data extraction system. Your core directive is to analyze the raw, unstructured text extracted from the first few pages of an academic journal article, preprint, or thesis, and precisely extract specific bibliographic metadata to populate a structured database schema.

Review the provided text carefully. You must extract the information that matches the exact semantics of the requested fields: title, abstract, authors, and publication\_year.

CRITICAL INSTRUCTIONS \- FAILURE TO COMPLY WILL BREAK THE SYSTEM:

1. STRICT ADHERENCE TO SOURCE TEXT: You must not invent, infer, or hallucinate any information. If a specific data point is not explicitly present or reasonably deductible from the provided text, you must return an empty string (""), an empty array (), or null. Do not guess the publication year.  
2. ZERO CONVERSATION: Do not include any conversational text, pleasantries, explanations, or markdown formatting outside of the requested JSON structure. Your entire output must be machine-readable JSON.  
3. AUTHOR EXTRACTION: Authors must be extracted as a structured array of distinct names. Ignore academic degrees (e.g., Ph.D., MD) and focus purely on the proper names.  
4. YEAR EXTRACTION: The publication year must be a 4-digit integer. If multiple dates are present (e.g., received date versus published date), prioritize the final publication year.  
5. ABSTRACT EXTRACTION: Extract the complete text of the abstract. Terminate the extraction immediately when the "Introduction", "Background", or "Keywords" section begins.

## **TEXT TO ANALYZE:**

## **{{RAW\_PDF\_TEXT\_EXTRACTED\_FROM\_FIRST\_THREE\_PAGES}}**

EXPECTED OUTPUT SCHEMA (JSON):

{

"title": "The full, exact title of the research paper",

"abstract": "The complete, continuous text of the abstract",

"publication\_year": 2024,

"authors": \[

"Full Name of Author 1",

"Full Name of Author 2"

\],

"keywords": \["keyword 1", "keyword 2"\]

}

By executing this prompt via a structured output API, the backend guarantees a consistent, predictable JSON payload that perfectly matches the interface expected by the frontend application.

## **Frontend Architecture: The Instructor Workspace**

The culmination of the backend extraction process is its presentation to the instructor. Regardless of the sophisticated machine learning models or multi-tiered API validation layers implemented on the server, the extraction will never be universally perfect. OCR errors, bizarre document layouts, and missing data necessitate human oversight. Therefore, the frontend application—specifically the replacements for ExistingCapstoneUploadPage.jsx and ArchiveLegacyUploadPage.jsx—must be designed not merely as a submission form, but as a highly optimized review and correction workspace.

### **The Side-by-Side Verification Layout**

The industry standard for document review interfaces is the side-by-side, split-screen layout.33 The current sequential flow—where the instructor selects a file, waits for processing, and then navigates to a form without visual reference to the original document—introduces immense friction. If the system incorrectly extracts an author's name, the instructor must manually open the PDF on their desktop, find the name, and type it into the browser.

A "hassle-free" layout resolves this by horizontally dividing the viewport.

* **The Left Pane (Document Viewer):** This pane embeds a full-featured PDF viewer, rendering the exact document the instructor just uploaded directly within the React application.  
* **The Right Pane (Metadata Editor):** This pane renders the interactive web form containing the dynamically populated inputs for the Title, Abstract, Authors, and Year.

When an instructor identifies a discrepancy, they can simply glance to the left pane, visually verify the information on the source document, and immediately correct the form on the right. This layout collapses the verification workflow into a single, cohesive view, drastically reducing cognitive load.

### **Integrating React PDF Viewers**

Rendering complex PDFs reliably within a React application requires specialized component libraries. Standard HTML \<iframe\> or \<object\> tags are inadequate, as they lack programmable APIs for zooming, pagination control, and programmatic text highlighting.

Modern developers rely on libraries that interface directly with Mozilla's PDF.js core rendering engine.35 Open-source solutions such as @react-pdf-viewer/core or enterprise-grade libraries like the Nutrient Web SDK (formerly PSPDFKit) provide pre-built, highly customizable React components that seamlessly integrate into existing applications.37

A critical technical consideration when implementing these viewers is the management of Web Workers. PDF.js utilizes background worker threads to parse and render PDF binaries, offloading the intense computational load from the browser's main UI thread.36 If the worker is misconfigured, the React application will attempt to render the PDF synchronously, causing the entire browser window to freeze during large document loads. In frameworks like Create React App or Next.js, the pdf.worker.min.mjs file must be correctly copied to the public directory and explicitly referenced during the viewer component's initialization phase to ensure smooth, non-blocking rendering.36

Furthermore, because the GROBID backend extraction returns the precise geometric coordinates (bounding boxes) for the metadata it identifies, advanced frontend implementations can utilize these coordinates to draw semi-transparent highlight overlays directly onto the React PDF viewer.7 When the instructor focuses on the "Abstract" input field in the right pane, the left pane can automatically scroll to and highlight the corresponding abstract text on the PDF, providing unparalleled visual confirmation.

### **State Management and Form Optimization**

Managing the state of the right-pane metadata editor introduces significant complexity. Academic metadata forms are highly dynamic; abstracts often span thousands of characters, and author lists require dynamic arrays allowing instructors to add, remove, and reorder multiple inputs.

Utilizing standard controlled React components (where every input change updates a central useState object) will cause the entire form to re-render upon every single keystroke. When dealing with long text fields or massive DOM trees, this rapid re-rendering leads to severe input lag, frustrating the user and defeating the goal of a hassle-free experience.

The optimal pattern for this scenario is the adoption of **React Hook Form (RHF)**.41 RHF is a headless form library that utilizes uncontrolled components and specialized custom hooks to manage form state natively within the DOM, completely circumventing unnecessary React re-renders.41 With tens of thousands of GitHub stars, RHF is acknowledged as the fastest and most reliable form library in the React ecosystem, specifically excelling at handling complex, nested data structures like dynamic author arrays.41

RHF integrates seamlessly with schema validation libraries such as Zod or Yup.41 The developer defines a strict schema dictating that the "Title" is a required string, the "Publication Year" must be a 4-digit number, and the "Authors" must be an array of objects containing at least one valid name.

When the WebSocket connection receives the final, validated extraction payload from the BullMQ backend worker, the React application simply calls RHF's reset() or setValue() methods, instantly populating the entire form with the extracted data. The Zod schema immediately validates this injected payload. If the backend pipeline failed to identify the publication year (returning an empty string), the validation schema instantly flags the year input with a red visual error state. The instructor's attention is immediately drawn precisely to the missing data point, completely streamlining the review process.

## **Synthesis and Deployment Strategy**

Replacing a legacy, heuristic-based parsing script with a sophisticated, multi-tiered extraction pipeline requires a strategic, phased deployment. Attempting to integrate all systems simultaneously introduces unnecessary risk.

**Phase 1: Infrastructure and Frontend Modernization** The initial phase must focus on decoupling the extraction logic from the HTTP request cycle. Implementing the BullMQ message broker and Redis infrastructure is paramount.1 Concurrently, the frontend files (ExistingCapstoneUploadPage.jsx and ArchiveLegacyUploadPage.jsx) should be refactored to implement the side-by-side layout using @react-pdf-viewer and React Hook Form.34 This establishes the foundation for handling long-running extraction tasks and provides immediate UX improvements.

**Phase 2: Local Machine Learning Integration** With the asynchronous pipeline in place, the deterministic pdfMetadataExtractor.js can be decommissioned and replaced with a self-hosted GROBID Docker container.11 This instantly upgrades the system's capabilities, allowing for the accurate layout-aware extraction of titles, abstracts, authors, and dates without incurring external API costs.6

**Phase 3: The Global Validation Layer** To push the extraction accuracy toward 100%, the backend worker is updated to execute subsequent API queries. By passing GROBID's identified titles or DOIs to the Crossref query.bibliographic endpoint and the Semantic Scholar /paper/search/match endpoint, the system validates the local extraction against authoritative global registries.17 This resolves discrepancies caused by poor document scans or incomplete preprints.

**Phase 4: The LLM Fallback Mechanism** Finally, for extreme edge cases where both GROBID and the scholarly APIs fail to generate a complete profile, the structured LLM prompt is deployed as a last resort.27 By providing a targeted context window and enforcing JSON schema outputs, the system guarantees that no document goes un-analyzed, regardless of its structural complexity.26

By orchestrating this comprehensive architecture—melding advanced machine learning, global API validation, probabilistic semantic inference, and optimized React UI patterns—the system achieves its ultimate objective: transforming the tedious, manual upload process into a rapid, automated, and truly hassle-free workspace for the instructor.

#### **Works cited**

1. Deferring long-running tasks to a distributed work queue \- Fly.io, accessed on April 13, 2026, [https://fly.io/docs/blueprints/work-queues/](https://fly.io/docs/blueprints/work-queues/)  
2. BullMQ Worker Patterns | Claude Code Skill \- MCP Market, accessed on April 13, 2026, [https://mcpmarket.com/tools/skills/bullmq-worker-patterns](https://mcpmarket.com/tools/skills/bullmq-worker-patterns)  
3. Background Job Processing in Node.js: BullMQ, Queues, and Worker Patterns (2026), accessed on April 13, 2026, [https://dev.to/young\_gao/background-job-processing-in-nodejs-bullmq-queues-and-worker-patterns-31d4](https://dev.to/young_gao/background-job-processing-in-nodejs-bullmq-queues-and-worker-patterns-31d4)  
4. arXiv:2303.09957v1 \[cs.IR\] 17 Mar 2023, accessed on April 13, 2026, [https://arxiv.org/pdf/2303.09957](https://arxiv.org/pdf/2303.09957)  
5. How GROBID works, accessed on April 13, 2026, [https://grobid.readthedocs.io/en/latest/Principles/](https://grobid.readthedocs.io/en/latest/Principles/)  
6. grobidOrg/grobid: A machine learning software for extracting information from scholarly documents \- GitHub, accessed on April 13, 2026, [https://github.com/grobidOrg/grobid](https://github.com/grobidOrg/grobid)  
7. grobid/Readme.md at master \- GitHub, accessed on April 13, 2026, [https://github.com/grobidOrg/grobid/blob/master/Readme.md](https://github.com/grobidOrg/grobid/blob/master/Readme.md)  
8. sys-demo \- grobid-0.7.1 \- Readme.md \- GitLab, accessed on April 13, 2026, [https://gitlab.di.ens.fr/mishra/sys-demo/-/blob/703d835d3b9b1431c899f4954c6a61297db72708/grobid-0.7.1/Readme.md](https://gitlab.di.ens.fr/mishra/sys-demo/-/blob/703d835d3b9b1431c899f4954c6a61297db72708/grobid-0.7.1/Readme.md)  
9. A Benchmark of PDF Information Extraction Tools using a Multi-Task and Multi-Domain Evaluation Framework for Academic Documents | alphaXiv, accessed on April 13, 2026, [https://www.alphaxiv.org/overview/2303.09957v1](https://www.alphaxiv.org/overview/2303.09957v1)  
10. gipplab/pdf-benchmark: A Benchmark of PDF Information Extraction Tools using a Multi-Task and Multi-Domain Evaluation Framework for Academic Documents \- GitHub, accessed on April 13, 2026, [https://github.com/gipplab/pdf-benchmark](https://github.com/gipplab/pdf-benchmark)  
11. Grobid integration \- Docs by LangChain, accessed on April 13, 2026, [https://docs.langchain.com/oss/python/integrations/document\_loaders/grobid](https://docs.langchain.com/oss/python/integrations/document_loaders/grobid)  
12. Introduction \- GROBID Documentation \- Read the Docs, accessed on April 13, 2026, [https://grobid.readthedocs.io/en/latest/Introduction/](https://grobid.readthedocs.io/en/latest/Introduction/)  
13. Using the REST API \- GROBID Documentation, accessed on April 13, 2026, [https://grobid.readthedocs.io/en/latest/Grobid-service/](https://grobid.readthedocs.io/en/latest/Grobid-service/)  
14. Enhancing repository integration with Crossref \- Crossref, accessed on April 13, 2026, [https://www.crossref.org/blog/enhancing-repository-integration-with-crossref/](https://www.crossref.org/blog/enhancing-repository-integration-with-crossref/)  
15. Documentation \- Metadata Retrieval \- REST API \- Crossref, accessed on April 13, 2026, [https://www.crossref.org/documentation/retrieve-metadata/rest-api/](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)  
16. Ticket of the month \- March 2022 \- Getting started with REST API queries, accessed on April 13, 2026, [https://0-community-crossref-org.library.alliant.edu/t/ticket-of-the-month-march-2022-getting-started-with-rest-api-queries/2587](https://0-community-crossref-org.library.alliant.edu/t/ticket-of-the-month-march-2022-getting-started-with-rest-api-queries/2587)  
17. CrossRef/rest-api-doc: Documentation for Crossref's REST API. For questions or suggestions, see https://community.crossref.org/ · GitHub \- GitHub, accessed on April 13, 2026, [https://github.com/Crossref/rest-api-doc](https://github.com/Crossref/rest-api-doc)  
18. Using query.bibliographic does not return authors or title · Issue \#257 · CrossRef/rest-api-doc \- GitHub, accessed on April 13, 2026, [https://github.com/CrossRef/rest-api-doc/issues/257](https://github.com/CrossRef/rest-api-doc/issues/257)  
19. REST API \- works?query.bibliographic \- Interfaces for Machines \- Crossref community forum, accessed on April 13, 2026, [https://community.crossref.org/t/rest-api-works-query-bibliographic/3203](https://community.crossref.org/t/rest-api-works-query-bibliographic/3203)  
20. Incorrect DOI Retrieved via Crossref RESTful API, accessed on April 13, 2026, [https://community.crossref.org/t/incorrect-doi-retrieved-via-crossref-restful-api/13874](https://community.crossref.org/t/incorrect-doi-retrieved-via-crossref-restful-api/13874)  
21. Frequently Asked Questions \- Semantic Scholar, accessed on April 13, 2026, [https://www.semanticscholar.org/faq](https://www.semanticscholar.org/faq)  
22. Is Semantic Scholar suitable for enriching references in OpenAlex? \- SUB Open, accessed on April 13, 2026, [https://subugoe.github.io/scholcomm\_analytics/posts/s2\_reference\_analysis/s2\_reference\_analysis.html](https://subugoe.github.io/scholcomm_analytics/posts/s2_reference_analysis/s2_reference_analysis.html)  
23. Semantic Scholar Academic Graph API | Semantic Scholar, accessed on April 13, 2026, [https://www.semanticscholar.org/product/api](https://www.semanticscholar.org/product/api)  
24. Documentation \- Metadata Retrieval \- REST API \- Tips and tricks \- Crossref, accessed on April 13, 2026, [https://www.crossref.org/documentation/retrieve-metadata/rest-api/tips-for-using-the-crossref-rest-api/](https://www.crossref.org/documentation/retrieve-metadata/rest-api/tips-for-using-the-crossref-rest-api/)  
25. Large language models can extract metadata for annotation of human neuroimaging publications \- PMC, accessed on April 13, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC12405296/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12405296/)  
26. Efficient and Verified Research Data Extraction with LLM \- MDPI, accessed on April 13, 2026, [https://www.mdpi.com/1999-4893/19/3/214](https://www.mdpi.com/1999-4893/19/3/214)  
27. MOLE: Metadata Extraction and Validation in Scientific Papers Using LLMs \- ResearchGate, accessed on April 13, 2026, [https://www.researchgate.net/publication/392134349\_MOLE\_Metadata\_Extraction\_and\_Validation\_in\_Scientific\_Papers\_Using\_LLMs](https://www.researchgate.net/publication/392134349_MOLE_Metadata_Extraction_and_Validation_in_Scientific_Papers_Using_LLMs)  
28. MOLE: Metadata Extraction and Validation in Scientific Papers Using LLMs \- arXiv, accessed on April 13, 2026, [https://arxiv.org/html/2505.19800v1](https://arxiv.org/html/2505.19800v1)  
29. Document Parsing Using Large Language Models \- With Code | Towards Data Science, accessed on April 13, 2026, [https://towardsdatascience.com/document-parsing-using-large-language-models-with-code-9229fda09cdf/](https://towardsdatascience.com/document-parsing-using-large-language-models-with-code-9229fda09cdf/)  
30. Benchmarking PDF Parsers on Table Extraction with LLM-based Semantic Evaluation, accessed on April 13, 2026, [https://arxiv.org/html/2603.18652v1](https://arxiv.org/html/2603.18652v1)  
31. Advanced Retrieval: Extract Metadata from Queries to Improve Retrieval | Haystack, accessed on April 13, 2026, [https://haystack.deepset.ai/blog/extracting-metadata-filter](https://haystack.deepset.ai/blog/extracting-metadata-filter)  
32. LLM-Powered Metadata Extraction Algorithm \- Towards AI, accessed on April 13, 2026, [https://towardsai.net/p/machine-learning/llm-powered-metadata-extraction-algorithm](https://towardsai.net/p/machine-learning/llm-powered-metadata-extraction-algorithm)  
33. How to Display Two PDF Viewer Side by Side in a React Application? \- Syncfusion support, accessed on April 13, 2026, [https://support.syncfusion.com/kb/article/21072/how-to-display-two-pdf-viewer-side-by-side-in-a-react-application](https://support.syncfusion.com/kb/article/21072/how-to-display-two-pdf-viewer-side-by-side-in-a-react-application)  
34. How to build a PDF library with React, accessed on April 13, 2026, [https://developers.foxit.com/developer-hub/document/build-pdf-library-react/](https://developers.foxit.com/developer-hub/document/build-pdf-library-react/)  
35. React PDF Viewer – Open Source, Headless & Customizable | EmbedPDF, accessed on April 13, 2026, [https://www.embedpdf.com/react-pdf-viewer](https://www.embedpdf.com/react-pdf-viewer)  
36. Build a React PDF viewer with pdfjs-dist and Next.js: Step-by-step tutorial \- Nutrient, accessed on April 13, 2026, [https://www.nutrient.io/blog/how-to-build-a-reactjs-viewer-with-pdfjs/](https://www.nutrient.io/blog/how-to-build-a-reactjs-viewer-with-pdfjs/)  
37. React PDF Viewer \- Codesandbox, accessed on April 13, 2026, [https://codesandbox.io/s/react-pdf-viewer-kbhlf](https://codesandbox.io/s/react-pdf-viewer-kbhlf)  
38. How to Programmatically Edit PDFs Using React \- Nutrient, accessed on April 13, 2026, [https://www.nutrient.io/blog/react-pdf-editor/](https://www.nutrient.io/blog/react-pdf-editor/)  
39. Top JavaScript PDF generator libraries for 2026 \- Nutrient, accessed on April 13, 2026, [https://www.nutrient.io/blog/top-js-pdf-libraries/](https://www.nutrient.io/blog/top-js-pdf-libraries/)  
40. Display PDF as a react component including editable form fields · mozilla pdf.js · Discussion \#19183 \- GitHub, accessed on April 13, 2026, [https://github.com/mozilla/pdf.js/discussions/19183](https://github.com/mozilla/pdf.js/discussions/19183)  
41. Top 5 React Form Libraries for Developers \- WeAreDevelopers, accessed on April 13, 2026, [https://www.wearedevelopers.com/en/magazine/399/react-form-libraries](https://www.wearedevelopers.com/en/magazine/399/react-form-libraries)
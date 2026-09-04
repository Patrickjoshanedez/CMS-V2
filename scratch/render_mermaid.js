const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const diagrams = [
  {
    name: 'diagram1_topology.png',
    code: `flowchart TB
    subgraph Client_Layer ["Client Presentation Layer (React 18 + Vite SPA)"]
        UI["React 18 UI (Tailwind CSS HSL Tokens)"]
        Router["React Router v6 Guarded Subtrees"]
        Store["State Layer (Zustand + TanStack Query v5)"]
        SocketC["Socket.IO Client (Auto-Reconnect)"]
    end

    subgraph Gateway_Layer ["API Gateway & Application Server (Express.js 5 / Node ES13)"]
        SecMiddleware["Security & Auth Middleware (Helmet, CORS, JWT Cookies, RateLimiter, Audit)"]
        RouterMap["18 Modular Subsystems (187 Active Endpoints)"]
        SocketS["Socket.IO Server (Private user:userId Rooms)"]
        StorageAdapter["Storage Service Abstraction (AWS S3 / MinIO / Authenticated Filesystem)"]
    end

    subgraph Messaging_Layer ["Distributed Job & Queue Broker (Redis 7)"]
        BullMQ["BullMQ Queues (plagiarism-check, email-dispatch)"]
        CeleryBroker["Celery Redis Broker (plagiarism queue)"]
    end

    subgraph Plagiarism_Microservice ["Plagiarism Engine Microservice (Python FastAPI / PyTorch)"]
        FastAPIApp["FastAPI REST API (:8001)"]
        CeleryWorkers["Celery Async Workers (Concurrency: 2)"]
        WinnowingPy["Winnowing Preprocessor & Sanitizer"]
        TorchEmbed["PyTorch SentenceTransformers (all-MiniLM-L6-v2)"]
        ChromaStore["ChromaDB Vector Store (Persistent Embeddings)"]
    end

    subgraph AI_Inference ["Local AI Engine (Ollama)"]
        OllamaLLM["Ollama Daemon (:11434)"]
        Models["llama3.2:3b (OCR) / nomic-embed-text-v2-moe"]
    end

    subgraph Persistence_Layer ["Primary Database & Storage"]
        Mongo["MongoDB 7 (23 Mongoose Schemas + Soft Delete)"]
        S3Storage["AWS S3 / MinIO Object Storage (:9000)"]
        FileStorage["Local Authenticated Uploads Storage (/app/uploads)"]
    end

    %% Interactions
    UI --> Router --> Store
    Store -->|HTTPS REST / Cookies| SecMiddleware
    SocketC <-->|WSS Real-time Events| SocketS
    SecMiddleware --> RouterMap
    RouterMap --> StorageAdapter
    RouterMap -->|Mongoose ODM| Mongo
    RouterMap -->|Enqueue Jobs| BullMQ
    RouterMap -->|OCR / Embeddings| OllamaLLM
    RouterMap -->|Async HTTP Check| FastAPIApp

    StorageAdapter -->|Presigned URLs| S3Storage
    StorageAdapter -->|Disk I/O| FileStorage

    BullMQ -->|Task Worker| RouterMap
    FastAPIApp -->|Task Enqueue| CeleryBroker
    CeleryBroker --> CeleryWorkers
    CeleryWorkers --> WinnowingPy
    CeleryWorkers --> TorchEmbed --> ChromaStore`,
  },
  {
    name: 'diagram2_plagiarism.png',
    code: `flowchart LR
    Upload["Student Submits Manuscript (PDF/DOCX)"] --> S3["Storage Service (S3/MinIO)"]
    S3 --> Extract["Text Extraction (pdf-parse / mammoth)"]
    
    subgraph Engine_1 ["Engine 1: Node.js In-Process Winnowing"]
        Extract --> Winnow["Winnowing Tokenizer (k=5, w=10)"]
        Winnow --> Fingerprints["Fingerprint Hashing (MD5/Murmur)"]
        Fingerprints --> InvertedIndex["MongoDB DocumentFingerprint Index"]
        InvertedIndex --> Jaccard["Span-Union & Jaccard Score"]
    end

    subgraph Engine_2 ["Engine 2: Python FastAPI Microservice"]
        Extract --> CheckAPI["POST /check (FastAPI :8001)"]
        CheckAPI --> CeleryTask["Celery Async Queue (Redis Broker)"]
        CeleryTask --> Clean["Text Cleaning & Section Filtering"]
        Clean --> SBERT["SentenceTransformers (all-MiniLM-L6-v2)"]
        SBERT --> ChromaQuery["ChromaDB Cosine Similarity Search"]
        ChromaQuery --> ReportGen["Detailed Match Report Generation"]
    end

    Jaccard --> Combine["Score Aggregation & Threshold Evaluator"]
    ReportGen --> Combine
    Combine --> Store["Save to PlagiarismResult Collection"]
    Store --> Notify["Emit notification:new via Socket.IO"]`,
  },
  {
    name: 'diagram3_lifecycle.png',
    code: `stateDiagram-v2
    [*] --> Phase_0_Team_Formation
    
    state Phase_0_Team_Formation {
        [*] --> Roster_Building
        Roster_Building --> Team_Locked: 2-4 Members Reached
        Team_Locked --> Adviser_Panel_Assigned: Committee Setup
    }

    Phase_0_Team_Formation --> Capstone_1_Title_Defense: Team Locked & Ready

    state Capstone_1_Title_Defense {
        [*] --> Title_Proposal_Drafts: Up to 3 Titles Drafted
        Title_Proposal_Drafts --> Title_Similarity_PreScan: Archive Cosine Check
        Title_Similarity_PreScan --> Proposal_Hearing: Evaluation Rubrics
        Proposal_Hearing --> Title_Approved: Score >= 75%
        Proposal_Hearing --> Title_Revisions: Re-Defense / Revisions
        Title_Revisions --> Proposal_Hearing
    }

    Capstone_1_Title_Defense --> Capstone_2_Chapters_1_3: Title Approved (Phase 2)

    state Capstone_2_Chapters_1_3 {
        [*] --> Manuscript_Ingestion: Chapters 1–3 Uploaded
        Manuscript_Ingestion --> Plagiarism_Scan_v1: Winnowing + SBERT (<25%)
        Plagiarism_Scan_v1 --> Midterm_Oral_Defense: Proposal Defense Rubric
        Midterm_Oral_Defense --> ADM_v1_Action_Done: Panel Remarks Logging
        ADM_v1_Action_Done --> ADM_v1_Signoff: Signatories Verified
    }

    Capstone_2_Chapters_1_3 --> Capstone_3_System_Dev: ADM v1 Cleared (Phase 3)

    state Capstone_3_System_Dev {
        [*] --> System_Implementation: Prototype & Tech Build
        System_Implementation --> Chapters_4_5_Drafting: Results & Discussion
        Chapters_4_5_Drafting --> Progress_Defense: System Demo & Paper Rubric
        Progress_Defense --> ADM_v2_Action_Done: Revision Tracking
        ADM_v2_Action_Done --> ADM_v2_Signoff: Panelist Approval
    }

    Capstone_3_System_Dev --> Capstone_4_Final_Defense: ADM v2 Cleared (Phase 4)

    state Capstone_4_Final_Defense {
        [*] --> Full_Manuscript_Compilation: Chapters 1–5 Merged
        Full_Manuscript_Compilation --> Final_Plagiarism_Scan: Deep Corpus Indexing
        Final_Plagiarism_Scan --> Final_Oral_Defense: Final Rubric Scoring
        Final_Oral_Defense --> Final_ADM_Signoff: Tiered Signatories Board
        Final_ADM_Signoff --> Auto_Archiving: Status Archived & S3 Storage
        Auto_Archiving --> Certificate_Issuance: Sealed PDF Generated
    }

    Capstone_4_Final_Defense --> [*]: Candidate for Graduation`,
  },
];

function generateHtml(mermaidCode) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: inline-block;
    }
    #diagram {
      display: inline-block;
      background: #ffffff;
      padding: 16px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div id="diagram">
    <pre class="mermaid">
${mermaidCode}
    </pre>
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      themeVariables: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: '14px',
        primaryColor: '#e0f2fe',
        primaryBorderColor: '#0284c7',
        primaryTextColor: '#0f172a',
        lineColor: '#334155',
        secondaryColor: '#f1f5f9',
        tertiaryColor: '#f8fafc'
      }
    });
  </script>
</body>
</html>`;
}

async function renderAll() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const diag of diagrams) {
    console.log('Rendering', diag.name);
    const html = generateHtml(diag.code);
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Wait for SVG to be rendered
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
    // Brief pause to ensure any fonts/transitions stabilize
    await page.waitForTimeout(500);

    const element = await page.$('#diagram');
    const outPath = path.join(__dirname, diag.name);
    await element.screenshot({ path: outPath });
    console.log('Saved', outPath);
  }

  await browser.close();
  console.log('All diagrams rendered successfully!');
}

renderAll().catch((err) => {
  console.error('Rendering error:', err);
  process.exit(1);
});

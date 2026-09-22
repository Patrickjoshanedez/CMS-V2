import React, { useState } from 'react';
import EvaluationWorkspace from '@/components/submissions/EvaluationWorkspace';

export default function PdfWorkspaceTestPage() {
  const [highlights, setHighlights] = useState([
    {
      id: 'comment-1',
      type: 'faculty_comment',
      position: {
        pageNumber: 1,
        boundingRect: { x1: 50, y1: 100, x2: 250, y2: 130, width: 200, height: 30 },
        rects: [{ x1: 50, y1: 100, x2: 250, y2: 130, width: 200, height: 30 }],
      },
      content: { text: 'Smart Agro-Tech: An IoT-Driven Autonomous Irrigation System' },
      meta: {
        commentId: 'c1',
        authorName: 'Dr. Glaiza Mae Libe',
        authorRole: 'adviser',
        status: 'open',
        replies: [
          {
            _id: 'r1',
            authorName: 'Maria Santos',
            authorRole: 'student',
            content: 'We have updated the sensor telemetry specifications accordingly.',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    },
    {
      id: 'plag-exact-1',
      type: 'plagiarism_exact',
      position: {
        pageNumber: 1,
        boundingRect: { x1: 50, y1: 180, x2: 300, y2: 210, width: 250, height: 30 },
        rects: [{ x1: 50, y1: 180, x2: 300, y2: 210, width: 250, height: 30 }],
      },
      content: { text: 'precision agricultural sensors measure soil volumetric water content' },
      meta: {
        similarityScore: 94,
        isExact: true,
        sourceTitle: 'BukSU Institutional Repository (2024): IoT Soil Moisture Monitoring',
        matchedSourceId: 'repo-2024-081',
      },
    },
    {
      id: 'overlap-1',
      type: 'plagiarism_semantic',
      position: {
        pageNumber: 1,
        boundingRect: { x1: 50, y1: 260, x2: 320, y2: 290, width: 270, height: 30 },
        rects: [{ x1: 50, y1: 260, x2: 320, y2: 290, width: 270, height: 30 }],
      },
      isCrossLayerOverlap: true,
      content: { text: 'LoRaWAN transceiver module operating in the 915 MHz frequency band' },
      meta: {
        similarityScore: 78,
        isExact: false,
        sourceTitle: 'IEEE Transactions on Agri-Tech: Long-Range Telemetry Protocols',
        matchedSourceId: 'ieee-lora-2023',
      },
    },
  ]);

  const sampleRubrics = [
    {
      _id: 'rubric-1',
      criteria: 'Methodological Rigor & System Architecture',
      maxScore: 30,
      description: 'Clarity of block diagrams, database schemas, and microservice topologies.',
    },
    {
      _id: 'rubric-2',
      criteria: 'Originality & Technical Execution',
      maxScore: 40,
      description: 'Completeness of IoT prototype and originality compliance.',
    },
    {
      _id: 'rubric-3',
      criteria: 'Oral Defense Presentation',
      maxScore: 30,
      description: 'Technical competence and team coordination during panel questioning.',
    },
  ];

  const sampleAdmItems = [
    {
      _id: 'adm-1',
      itemNumber: 1,
      comment: 'Incorporate edge-computing gateway latency benchmarks in Chapter 4.',
      actionTaken: 'Benchmark analysis added in Section 4.3 with comparative latency charts.',
      status: 'verified',
    },
    {
      _id: 'adm-2',
      itemNumber: 2,
      comment: 'Sanitize repetitive literature citations flagged in Winnowing scan.',
      actionTaken: 'Paraphrased theoretical review in Chapter 2, originality raised to 92%.',
      status: 'pending',
    },
  ];

  const sampleSources = [
    {
      sourceId: 'repo-2024-081',
      title: 'BukSU Institutional Repository (2024): IoT Soil Moisture Monitoring',
      similarityScore: 94,
      isExact: true,
      authors: ['Dela Cruz, J.', 'Bautista, S.'],
    },
    {
      sourceId: 'ieee-lora-2023',
      title: 'IEEE Transactions on Agri-Tech: Long-Range Telemetry Protocols',
      similarityScore: 78,
      isExact: false,
      authors: ['Chen, W.', 'Tanaka, K.'],
    },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden">
      <EvaluationWorkspace
        submission={{
          _id: 'sub-test-demo',
          title: 'Smart Agro-Tech: An IoT-Driven Autonomous Irrigation System',
          fileName: 'Smart_Agro_Tech_Manuscript_v3.pdf',
          chapter: 3,
        }}
        pdfUrl="/sample.pdf"
        highlights={highlights}
        rubrics={sampleRubrics}
        admItems={sampleAdmItems}
        plagiarismSources={sampleSources}
        onSelectionFinished={(sel) => {
          console.log('Selection finished:', sel);
        }}
        onAddReply={(commentId, text) => {
          console.log('Add reply:', commentId, text);
        }}
        onResolveComment={(commentId, status) => {
          console.log('Resolve comment:', commentId, status);
        }}
        onAddToAdm={(item) => {
          console.log('Add to ADM:', item);
        }}
        onVerdict={(verdict) => {
          console.log('Verdict:', verdict);
        }}
        userRole="adviser"
        canModerate={true}
      />
    </div>
  );
}

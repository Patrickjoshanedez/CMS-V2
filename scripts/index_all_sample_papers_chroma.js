/**
 * ChromaDB Vector Indexer & Verification for 45 Sample Capstone Papers.
 *
 * Indexes all approved final_academic submissions into ChromaDB collection `cms_documents_v2`
 * via the high-performance Python BGE-M3 embedding service.
 */
import connectDB from '../server/config/db.js';
import Submission from '../server/modules/submissions/submission.model.js';
import Project from '../server/modules/projects/project.model.js';
import Course from '../server/modules/academics/course.model.js';

const PLAGIARISM_API_URL = process.env.PLAGIARISM_ENGINE_URL || 'http://localhost:8001';

async function main() {
  console.log(`[Chroma Indexer] Connecting to database...`);
  await connectDB();

  const bsitCourse = await Course.findOne({ code: 'BSIT' });
  const bsemcCourse = await Course.findOne({ code: 'BSEMC' });
  console.log(`[Chroma Indexer] BSIT ID: ${bsitCourse?._id}, BSEMC ID: ${bsemcCourse?._id}`);

  // Fetch approved submissions
  const submissions = await Submission.find({
    type: 'final_academic',
    status: 'approved',
  })
    .select('+extractedText')
    .populate('projectId')
    .lean();

  console.log(`[Chroma Indexer] Found ${submissions.length} approved final academic submissions.`);

  // Filter to the ones with valid text and project
  const validSubmissions = submissions.filter(
    (s) => s.projectId && s.extractedText && s.extractedText.trim().length > 50,
  );
  console.log(`[Chroma Indexer] ${validSubmissions.length} submissions have extractable text.`);

  let indexedCount = 0;
  let totalSegments = 0;

  for (let i = 0; i < validSubmissions.length; i++) {
    const sub = validSubmissions[i];
    const project = sub.projectId;
    const isBSIT = String(project.courseId) === String(bsitCourse?._id);
    const courseCode = isBSIT ? 'BSIT' : 'BSEMC';

    const authors = Array.isArray(project.archiveMetadata?.authors)
      ? project.archiveMetadata.authors.join(', ')
      : 'BukSU Proponents';

    const payload = {
      document_id: String(sub._id),
      text: sub.extractedText,
      metadata: {
        document_id: String(sub._id),
        title: sub.documentTitle || project.title || 'Untitled',
        author: authors,
        project_id: String(project._id),
        year: Number(project.archiveMetadata?.publicationYear) || 2024,
        url: '',
      },
    };

    try {
      const res = await fetch(`${PLAGIARISM_API_URL}/index/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(
          `[Chroma Indexer] Error indexing ${sub._id}: HTTP ${res.status} - ${errText}`,
        );
        continue;
      }

      const resJson = await res.json();
      indexedCount++;
      totalSegments += resJson.segments_indexed || 0;
      console.log(
        `[${indexedCount}/${validSubmissions.length}] Indexed: "${payload.metadata.title.slice(0, 35)}..." (${courseCode}) -> ${resJson.segments_indexed} segments`,
      );
    } catch (err) {
      console.error(`[Chroma Indexer] Network error on ${sub._id}:`, err.message);
    }
  }

  // Check health and total collection count
  const healthRes = await fetch(`${PLAGIARISM_API_URL}/health`);
  const health = await healthRes.json();
  console.log('\n=============================================');
  console.log('[Chroma Indexing Completed]');
  console.log(`Total Documents Indexed: ${indexedCount}`);
  console.log(`Total Segments Embedded: ${totalSegments}`);
  console.log(`ChromaDB Collection:     ${health.chroma_collection}`);
  console.log(`ChromaDB Stored Count:   ${health.collection_count} paragraph segments`);
  console.log('=============================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('[Chroma Indexer Fatal Error]:', err);
  process.exit(1);
});

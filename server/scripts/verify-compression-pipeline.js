import zlib from 'zlib';
import util from 'util';
import crypto from 'crypto';

const gzip = util.promisify(zlib.gzip);
const gunzip = util.promisify(zlib.gunzip);

async function verifyCompressionPipeline() {
  console.log('Starting compression pipeline verification...');

  // 1. Create mock PDF text (a few MB to simulate a real thesis/paper)
  const paragraph =
    'This is a mock paragraph simulating extracted PDF text for the plagiarism engine. It contains various characters and will be repeated to create a substantial payload. ';
  const textCategories = ['Abstract', 'Introduction', 'Methodology', 'Results', 'Conclusion'];

  let originalText = '';
  // Generate roughly 1-2 MB of text
  for (let i = 0; i < 5000; i++) {
    const cat = textCategories[i % textCategories.length];
    originalText += `\n\n--- ${cat} ---\n${paragraph}`;
  }

  const inputBuffer = Buffer.from(originalText, 'utf-8');
  const originalSize = inputBuffer.length;
  console.log(`Original Text Size: ${(originalSize / 1024).toFixed(2)} KB`);

  // 2. Compress (mocking creation of .gz sidecar)
  const startTime = performance.now();
  const compressedBuffer = await gzip(inputBuffer);
  const compressTime = performance.now() - startTime;
  const compressedSize = compressedBuffer.length;

  console.log(`Compressed Size: ${(compressedSize / 1024).toFixed(2)} KB`);
  console.log(`Compression Ratio: ${((compressedSize / originalSize) * 100).toFixed(2)}%`);
  console.log(`Compression Time: ${compressTime.toFixed(2)} ms`);

  // 3. Decompress (mocking reading from .gz sidecar)
  const decompStartTime = performance.now();
  const decompressedBuffer = await gunzip(compressedBuffer);
  const decompressTime = performance.now() - decompStartTime;
  const decompressedText = decompressedBuffer.toString('utf-8');

  console.log(`Decompression Time: ${decompressTime.toFixed(2)} ms`);

  // 4. Assert bit-perfect retrieval
  console.log('\nVerifying bit-perfect match...');
  const originalHash = crypto.createHash('sha256').update(originalText).digest('hex');
  const decompressedHash = crypto.createHash('sha256').update(decompressedText).digest('hex');

  if (originalText === decompressedText && originalHash === decompressedHash) {
    console.log('✅ SUCCESS: Bit-perfect text retrieval confirmed.');
    console.log(`Input SHA256:  ${originalHash}`);
    console.log(`Output SHA256: ${decompressedHash}`);
  } else {
    console.error('❌ FAILURE: Decompressed text does not match original text!');
    process.exit(1);
  }
}

verifyCompressionPipeline().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

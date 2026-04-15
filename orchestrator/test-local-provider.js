import { callLocalSwarm } from './local-ai-provider.js';

async function testProvider() {
  console.log('Initializing isolated test sequence...');

  try {
    const result = await callLocalSwarm(
      'You are a test-automation agent.',
      'Write a single, simple Jest test for a function that adds two numbers. Output only the code.',
    );

    console.log('\n--- TEST SUCCESS: Model Output ---');
    console.log(result);
    console.log('----------------------------------\n');
  } catch (error) {
    console.error('TEST FAILED:', error);
    process.exitCode = 1;
  }
}

await testProvider();

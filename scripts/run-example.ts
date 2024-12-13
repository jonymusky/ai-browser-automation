import path from 'path';

async function runExample() {
  const exampleName = process.argv[2];
  if (!exampleName) {
    console.error('Please provide an example name');
    console.log('Usage: pnpm run-example <example-name>');
    console.log('Available examples: basic, mercadolibre');
    process.exit(1);
  }

  try {
    const examplePath = path.join(__dirname, '..', 'examples', `${exampleName}-example.ts`);
    await import(examplePath);
  } catch (error) {
    console.error(`Failed to run example "${exampleName}":`, error);
    process.exit(1);
  }
}

runExample();

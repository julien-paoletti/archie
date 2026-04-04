/**
 * Build Script — @archie/viewer npm package
 * Outputs ESM + CJS bundles and TypeScript declarations to viewer/dist/
 */

import { $ } from 'bun';

const VIEWER_DIR = './viewer';
const ENTRY = `${VIEWER_DIR}/src/index.ts`;
const OUT_DIR = `${VIEWER_DIR}/dist`;

async function build(): Promise<void> {
    console.log('Building @archie/viewer...\n');

    await $`mkdir -p ${OUT_DIR}`;

    // ESM bundle
    console.log('1. Bundling ESM...');
    const esm = await Bun.build({
        entrypoints: [ENTRY],
        outdir: OUT_DIR,
        format: 'esm',
        naming: 'index.js',
        minify: true,
        target: 'browser',
    });

    if (!esm.success) {
        console.error('ESM build failed:');
        for (const log of esm.logs) console.error(log);
        process.exit(1);
    }
    console.log(`   index.js (${(esm.outputs[0]!.size / 1024).toFixed(2)} KB)`);

    // CJS bundle
    console.log('2. Bundling CJS...');
    const cjs = await Bun.build({
        entrypoints: [ENTRY],
        outdir: OUT_DIR,
        format: 'cjs',
        naming: 'index.cjs',
        minify: true,
        target: 'browser',
    });

    if (!cjs.success) {
        console.error('CJS build failed:');
        for (const log of cjs.logs) console.error(log);
        process.exit(1);
    }
    console.log(`   index.cjs (${(cjs.outputs[0]!.size / 1024).toFixed(2)} KB)`);

    // TypeScript declarations
    console.log('3. Generating type declarations...');
    const tsc = await $`bunx tsc --project ${VIEWER_DIR}/tsconfig.json`.quiet();
    if (tsc.exitCode !== 0) {
        console.error('tsc failed:\n', tsc.stderr.toString());
        process.exit(1);
    }
    console.log('   dist/types/viewer/src/index.d.ts');

    console.log('\nBuild complete!');
    console.log(`Output: ${OUT_DIR}/`);
}

build().catch(console.error);

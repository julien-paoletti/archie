/**
 * Build Script
 * Bundles TypeScript and copies static files to docs/ for GitHub Pages
 */

import { $, Glob } from 'bun';

const DOCS_DIR = './docs';
const SRC_DIR = './src';

async function build(): Promise<void> {
    console.log('Building Archie...\n');

    // Build TypeScript bundle
    console.log('1. Bundling TypeScript...');
    const result = await Bun.build({
        entrypoints: [`${SRC_DIR}/app.ts`],
        outdir: DOCS_DIR,
        minify: true
    });

    if (!result.success) {
        console.error('Build failed:');
        for (const log of result.logs) {
            console.error(log);
        }
        process.exit(1);
    }
    console.log(`   app.js (${(result.outputs[0].size / 1024).toFixed(2)} KB)`);

    // Copy index.html with updated paths for production
    console.log('\n2. Copying index.html...');
    const indexHtml = await Bun.file(`${SRC_DIR}/index.html`).text();
    const updatedHtml = indexHtml
        .replace('src="./dist/app.js"', 'src="app.js"')
        .replace('src="./assets/logo-archie.png"', 'src="assets/logo-archie.png"');
    await Bun.write(`${DOCS_DIR}/index.html`, updatedHtml);

    // Copy CSS
    console.log('3. Copying CSS...');
    await $`mkdir -p ${DOCS_DIR}/css`;
    const cssContent = await Bun.file(`${SRC_DIR}/css/styles.css`).text();
    await Bun.write(`${DOCS_DIR}/css/styles.css`, cssContent);

    // Copy static assets
    console.log('4. Copying assets...');
    await $`mkdir -p ${DOCS_DIR}/assets`;

    const logo = await Bun.file(`${SRC_DIR}/assets/logo-archie.png`).arrayBuffer();
    await Bun.write(`${DOCS_DIR}/assets/logo-archie.png`, logo);

    console.log('\nBuild complete!');
    console.log(`Output: ${DOCS_DIR}/`);
}

build().catch(console.error);

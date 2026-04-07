/**
 * Patch Version Script
 * Increments the patch version in package.json and viewer/package.json,
 * then commits and tags.
 *
 * Usage: bun run scripts/patch-version.ts
 */

import { $ } from 'bun';

const ROOT_PKG = './package.json';
const VIEWER_PKG = './viewer/package.json';

function bumpPatch(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${(patch ?? 0) + 1}`;
}

async function readJson(path: string): Promise<Record<string, unknown>> {
    return JSON.parse(await Bun.file(path).text());
}

async function writeJson(path: string, data: Record<string, unknown>): Promise<void> {
    await Bun.write(path, JSON.stringify(data, null, 2) + '\n');
}

async function run(): Promise<void> {
    const root = await readJson(ROOT_PKG);
    const viewer = await readJson(VIEWER_PKG);

    const current = root.version as string;
    const next = bumpPatch(current);

    root.version = next;
    viewer.version = next;

    await writeJson(ROOT_PKG, root);
    await writeJson(VIEWER_PKG, viewer);

    console.log(`${current} → ${next}`);

    await $`git add ${ROOT_PKG} ${VIEWER_PKG}`;
    await $`git commit -m "chore: bump version to ${next}"`;
    await $`git tag v${next}`;

    console.log(`Tagged v${next} — push with: git push && git push --tags`);
}

run().catch((err) => {
    console.error(err.message);
    process.exit(1);
});

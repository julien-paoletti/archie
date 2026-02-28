/**
 * Simple development server using Bun
 * Serves files from the docs/ directory
 */

const SRC_DIR = './docs';

const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        let path = url.pathname;

        // Default to index.html
        if (path === '/') {
            path = '/index.html';
        }

        const file = Bun.file(`${SRC_DIR}${path}`);

        if (await file.exists()) {
            return new Response(file);
        }

        return new Response('Not Found', { status: 404 });
    }
});

console.log(`Server running at http://localhost:${server.port}`);

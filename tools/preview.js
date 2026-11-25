// Serve only the files produced for static hosting.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const port = Number(process.argv[2] || 8777);
const directory = path.resolve(__dirname, '../dist/online');
const files = {
  '/index.html': 'text/html; charset=utf-8',
  '/three.min.js': 'text/javascript; charset=utf-8',
  '/CREDITS.txt': 'text/plain; charset=utf-8',
  '/THIRD-PARTY-NOTICES.txt': 'text/plain; charset=utf-8',
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Provide a port number from 1 to 65535.');
  process.exit(1);
}
if (!Object.keys(files).every(route => fs.existsSync(path.join(directory, route.slice(1))))) {
  console.error('Build the public site first with npm run build.');
  process.exit(1);
}

http.createServer((request, response) => {
  const requested = request.url.split('?')[0];
  const route = requested === '/' ? '/index.html' : requested;
  if (!Object.hasOwn(files, route)) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  fs.readFile(path.join(directory, route.slice(1)), (error, body) => {
    if (error) {
      response.writeHead(500).end('Could not read the preview file.');
      return;
    }
    response.writeHead(200, { 'Content-Type': files[route], 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
}).listen(port, '127.0.0.1', () => console.log(`Sado Tea Room public preview: http://127.0.0.1:${port}/`));

const http = require('http');
const httpProxy = require('http-proxy');

const BACKEND_PORT = process.env.BACKEND_PORT || 4001;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;
const PORT = process.env.PORT || 10000;

// Track readiness
let backendReady = false;
let frontendReady = false;

// Poll a port until it accepts connections
function waitForPort(port, name, intervalMs = 1000) {
  const check = () => {
    const req = http.request({ hostname: 'localhost', port, path: '/', method: 'GET' }, () => {
      if (name === 'backend') backendReady = true;
      else frontendReady = true;
      console.log(`✅ ${name} is ready on port ${port}`);
    });
    req.on('error', () => setTimeout(check, intervalMs));
    req.setTimeout(800, () => { req.destroy(); setTimeout(check, intervalMs); });
    req.end();
  };
  check();
}

// Create a proxy server with websocket support
const proxy = httpProxy.createProxyServer({ ws: true });

const server = http.createServer((req, res) => {
  const isApiRoute =
    req.url.startsWith('/api') ||
    req.url.startsWith('/socket.io') ||
    req.url.startsWith('/uploads');

  const targetReady = isApiRoute ? backendReady : frontendReady;

  // Return 503 with Retry-After if target isn't ready yet
  if (!targetReady) {
    res.writeHead(503, {
      'Content-Type': 'text/plain',
      'Retry-After': '5',
    });
    res.end('Service starting up, please wait...');
    return;
  }

  const target = isApiRoute
    ? `http://localhost:${BACKEND_PORT}`
    : `http://localhost:${FRONTEND_PORT}`;

  proxy.web(req, res, { target });
});

// Proxy websockets (socket.io only)
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/socket.io')) {
    proxy.ws(req, socket, head, { target: `http://localhost:${BACKEND_PORT}` });
  } else {
    proxy.ws(req, socket, head, { target: `http://localhost:${FRONTEND_PORT}` });
  }
});

// Swallow proxy errors to prevent crashes — ECONNRESET/EPIPE are transient
proxy.on('error', (err, req, res) => {
  // Ignore benign connection-drop errors
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
  console.error('Proxy Error:', err.code, err.message);
  if (res && res.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Monolith Reverse Proxy listening on port ${PORT}`);
  console.log(`   → Backend target: localhost:${BACKEND_PORT}`);
  console.log(`   → Frontend target: localhost:${FRONTEND_PORT}`);
  // Start polling both services
  waitForPort(BACKEND_PORT, 'backend');
  waitForPort(FRONTEND_PORT, 'frontend');
});

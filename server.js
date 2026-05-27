const http = require('http');
const net = require('net');
const httpProxy = require('http-proxy');

const BACKEND_PORT = process.env.BACKEND_PORT || 4001;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;
const PORT = process.env.PORT || 10000;

// Track readiness — both must be true before real traffic flows
let backendReady = false;
let frontendReady = false;

// TCP-level port readiness check — just verifies the port accepts a TCP
// connection, without waiting for an HTTP response. This is critical for
// Next.js which takes time to SSR the first page but accepts connections fast.
function waitForPort(port, name, intervalMs = 1000) {
  let done = false;

  const check = () => {
    if (done) return;
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      if (done) return;
      done = true;
      if (name === 'backend') backendReady = true;
      else frontendReady = true;
      console.log(`✅ ${name} is ready on port ${port}`);
    });

    socket.on('error', () => {
      socket.destroy();
      if (!done) setTimeout(check, intervalMs);
    });

    socket.on('timeout', () => {
      socket.destroy();
      if (!done) setTimeout(check, intervalMs);
    });

    socket.connect(port, 'localhost');
  };

  check();
}

// Create proxy with WebSocket support
const proxy = httpProxy.createProxyServer({ ws: true });

const server = http.createServer((req, res) => {
  const isApiRoute =
    req.url.startsWith('/api') ||
    req.url.startsWith('/socket.io') ||
    req.url.startsWith('/uploads');

  const targetReady = isApiRoute ? backendReady : frontendReady;

  // Return 503 while the target service is still booting
  if (!targetReady) {
    res.writeHead(503, {
      'Content-Type': 'text/plain',
      'Retry-After': '3',
    });
    res.end('Service starting up, please wait...');
    return;
  }

  const target = isApiRoute
    ? `http://localhost:${BACKEND_PORT}`
    : `http://localhost:${FRONTEND_PORT}`;

  proxy.web(req, res, { target });
});

// Proxy WebSocket upgrades (Socket.IO)
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/socket.io')) {
    proxy.ws(req, socket, head, { target: `http://localhost:${BACKEND_PORT}` });
  } else {
    proxy.ws(req, socket, head, { target: `http://localhost:${FRONTEND_PORT}` });
  }
});

// Silently discard transient connection-drop errors from the proxy
proxy.on('error', (err, req, res) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
  console.error('Proxy Error:', err.code, err.message);
  if (res && res.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Monolith Reverse Proxy listening on port ${PORT}`);
  console.log(`   → Backend target : localhost:${BACKEND_PORT}`);
  console.log(`   → Frontend target: localhost:${FRONTEND_PORT}`);
  // Begin TCP polling for both services
  waitForPort(BACKEND_PORT, 'backend');
  waitForPort(FRONTEND_PORT, 'frontend');
});

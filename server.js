const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server with custom websocket handling
const proxy = httpProxy.createProxyServer({
  ws: true
});

const server = http.createServer((req, res) => {
  // Route api, socket.io, and uploads to Express backend
  if (
    req.url.startsWith('/api') || 
    req.url.startsWith('/socket.io') || 
    req.url.startsWith('/uploads')
  ) {
    proxy.web(req, res, { target: 'http://localhost:4000' });
  } else {
    // Everything else to Next.js frontend
    proxy.web(req, res, { target: 'http://localhost:3000' });
  }
});

// Proxy websockets
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/socket.io')) {
    proxy.ws(req, socket, head, { target: 'http://localhost:4000' });
  } else {
    proxy.ws(req, socket, head, { target: 'http://localhost:3000' });
  }
});

// Handle proxy errors to prevent crashes
proxy.on('error', (err, req, res) => {
  console.error('Proxy Error:', err.message);
  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Monolith Reverse Proxy listening on port ${PORT}`);
});

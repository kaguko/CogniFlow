import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { serverConfig } from './serverConfig';
import { mountMcpRoutes } from './src/mcp/mcpServer.ts';
import { heavyAgentRouter } from './src/agentSwarm/heavyAgent/heavyAgentRoutes.ts';
import { globalAgentWebSocketServer } from './src/agentSwarm/heavyAgent/websocketAgentStream.ts';
import { openapiSpec } from './src/openapi/openapiSpec.ts';

// Modular Route Imports
import { agentRouter, handleRecordOutcome, handleGetAccuracyScore, handleGetCircuitBreakerConfig, handleUpdateCircuitBreakerConfig } from './src/routes/agentRoutes.ts';
import { notesRouter } from './src/routes/notesRoutes.ts';
import { predictRouter } from './src/routes/predictRoutes.ts';
import { goalsRouter } from './src/routes/goalsRoutes.ts';
import { decisionRouter } from './src/routes/decisionRoutes.ts';
import { systemRouter } from './src/routes/systemRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = serverConfig.port;

app.use(express.json({ limit: '10mb' }));

// Heavy / High-Frequency Agent Engine: Async Queues, Multi-Tiered Cache, and WebSocket Duplex
app.use('/api/v1/agent/async', heavyAgentRouter);

// Mount Model Context Protocol (MCP) Server endpoints (/api/mcp, /api/mcp/sse)
mountMcpRoutes(app);

// Mount Modular Express Routers
app.use('/api/v1/agent', agentRouter);
app.use('/api/notes', notesRouter);
app.use('/api/predict', predictRouter);
app.use('/api/goals', goalsRouter);
app.use('/api', decisionRouter);
app.use('/api', systemRouter);

// Mount Root-level & Compatibility APIs
app.post('/api/outcomes', handleRecordOutcome);
app.get('/api/accuracy-score', handleGetAccuracyScore);
app.get('/api/circuit-breaker/config', handleGetCircuitBreakerConfig);
app.post('/api/circuit-breaker/config', handleUpdateCircuitBreakerConfig);

app.get('/openapi.json', (_req, res) => {
  res.json(openapiSpec);
});

// Setup Vite in Dev or Static in Production
async function setupVite() {
  const isProduction = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  // Initialize Persistent WebSocket Streaming Engine (/ws/agent/stream)
  globalAgentWebSocketServer.initialize(httpServer);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SymFlowAge server running at http://localhost:${PORT}`);
  });
}

setupVite();

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SymFlowAge M2M Guardrail & Contextual Planner API',
    version: '1.0.0',
    description:
      'Production-grade M2M REST API, Circuit Breaker, and Guardrail Engine for AI Agents (Cursor, Windsurf, Claude Desktop, LangChain, CrewAI). Prevents architectural drift, over-engineering, and technical rabbit holes.',
    contact: {
      name: 'SymFlowAge Engineering Team',
      url: 'https://github.com/symflowage/symflowage',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current Environment Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API_KEY',
        description: 'Machine-to-Machine API key passed as Authorization: Bearer <SYMFLOWAGE_M2M_API_KEY>',
      },
    },
    schemas: {
      DecomposeRequest: {
        type: 'object',
        required: ['goalTitle'],
        properties: {
          goalTitle: {
            type: 'string',
            example: 'Build JWT Authentication with Redis Token Blacklist',
          },
          technicalContext: {
            type: 'string',
            example: 'Node.js Express, TypeScript, PostgreSQL',
          },
          agentId: {
            type: 'string',
            example: 'agent_cline_vscode',
          },
        },
      },
      DecomposeResponse: {
        type: 'object',
        properties: {
          contractVersion: { type: 'string', example: '1.0' },
          requestId: { type: 'string', example: 'req_8f9a2b1c' },
          goalTitle: { type: 'string' },
          microSteps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                durationMinutes: { type: 'number' },
                riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
              },
            },
          },
          leanAdvice: { type: 'string' },
        },
      },
      GuardrailCheckRequest: {
        type: 'object',
        required: ['originalGoal', 'agentOutput'],
        properties: {
          originalGoal: {
            type: 'string',
            example: 'Build JWT Authentication with Redis Token Blacklist',
          },
          agentOutput: {
            type: 'string',
            example: 'Rewrite the whole DB layer to MongoDB and add Firebase Auth',
          },
          circuitBreakerThreshold: {
            type: 'number',
            default: 40,
            example: 40,
          },
          agentId: {
            type: 'string',
            example: 'agent_cline_vscode',
          },
        },
      },
      GuardrailDecisionResponse: {
        type: 'object',
        properties: {
          contractVersion: { type: 'string', example: 'semantic-drift.v1' },
          requestId: { type: 'string', example: 'req_9c8b7a6f' },
          driftScore: { type: 'number', example: 72.5 },
          guardrailThreshold: { type: 'number', example: 40 },
          guardrailStatus: { type: 'string', enum: ['ALLOW', 'WARN', 'BLOCK'] },
          decision: { type: 'string', enum: ['ALLOW', 'WARN', 'BLOCK'] },
          circuitBreaker: {
            type: 'object',
            properties: {
              triggered: { type: 'boolean', example: true },
              circuitStatus: { type: 'string', enum: ['OPEN', 'CLOSED'] },
              reason: { type: 'string' },
            },
          },
        },
      },
      OutcomeReportRequest: {
        type: 'object',
        required: ['outcomeStatus'],
        properties: {
          requestId: { type: 'string', example: 'req_8f9a2b1c' },
          predictionId: { type: 'string', example: 'pred_4d3e2f1a' },
          agentId: { type: 'string', example: 'agent_cline_vscode' },
          outcomeStatus: {
            type: 'string',
            enum: ['SUCCESS', 'DRIFT', 'CRASH', 'ABANDONED'],
            example: 'SUCCESS',
          },
          actualExecutionTimeMs: { type: 'number', example: 420000 },
          tokensConsumed: { type: 'number', example: 1450 },
          userFeedback: {
            type: 'object',
            properties: {
              isFalsePositiveDrift: { type: 'boolean', example: false },
              notes: { type: 'string', example: 'Task completed cleanly within 10 mins.' },
            },
          },
        },
      },
      CircuitBreakerConfig: {
        type: 'object',
        properties: {
          maxDriftThreshold: { type: 'number', example: 65 },
          consecutiveFailureThreshold: { type: 'number', example: 3 },
          enableWebhook: { type: 'boolean', example: true },
          webhookUrl: { type: 'string', example: 'https://hooks.slack.com/services/...' },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/api/v1/agent/decompose': {
      post: {
        summary: 'Decompose Agent Goal into Micro-Steps',
        description: 'Breaks down complex software engineering goals into 5-15 minute lean micro-steps.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DecomposeRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successfully decomposed task',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DecomposeResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/agent/guardrail/drift-check': {
      post: {
        summary: 'Fast Machine-to-Machine Drift & Rabbit Hole Check',
        description: 'Validates agent output against core goals and triggers Circuit Breaker if severe drift occurs.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GuardrailCheckRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Guardrail decision evaluation result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GuardrailDecisionResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/agent/outcomes': {
      post: {
        summary: 'Report Actual Execution Outcome (Feedback Loop)',
        description: 'Records actual execution outcomes (SUCCESS, DRIFT, CRASH, ABANDONED) for AI accuracy score calibration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OutcomeReportRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Outcome recorded and accuracy score updated',
          },
        },
      },
    },
    '/api/v1/agent/accuracy-score': {
      get: {
        summary: 'Retrieve AI System Accuracy Score & Backtest Metrics',
        description: 'Calculates continuous backtesting hit rates and false alarm calibration over the last 30 days.',
        responses: {
          '200': {
            description: 'Accuracy metrics report',
          },
        },
      },
    },
    '/api/v1/agent/guardrail/exemptions': {
      get: {
        summary: 'List Guardrail Exemptions & Calibration Rules',
        description: 'Returns all active task exemptions marked as valid by developers to prevent false positive rabbit-hole detection.',
        responses: { '200': { description: 'List of active exemptions and calibration stats' } },
      },
      post: {
        summary: 'Record Guardrail Exemption (Not a Rabbit Hole)',
        description: 'Adds an essential engineering task as an exemption into calibration memory so future checks do not BLOCK it.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  taskTitle: { type: 'string', example: 'Fix login bug' },
                  coreGoalTitle: { type: 'string', example: 'Ship MVP' },
                  reason: { type: 'string', example: 'Essential login fix needed for alpha testing' },
                },
                required: ['taskTitle'],
              },
            },
          },
        },
        responses: { '201': { description: 'Exemption recorded' } },
      },
    },
    '/api/billing/plans': {
      get: {
        summary: 'List Billing Plans & Quotas',
        responses: { '200': { description: 'Pricing catalog' } },
      },
    },
    '/api/billing/api-keys': {
      post: {
        summary: 'Issue Metered M2M API Key (BYOK-friendly)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, name: { type: 'string' } } } } },
        },
        responses: { '201': { description: 'API key issued with MCP config' } },
      },
    },
    '/api/billing/usage': {
      get: {
        summary: 'Get Tenant Usage & Quota',
        responses: { '200': { description: 'Usage summary' } },
      },
    },
    '/api/billing/checkout': {
      post: {
        summary: 'Create Stripe Checkout Session',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, planId: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'Checkout URL (live or mock)' } },
      },
    },
    '/api/billing/webhook': {
      post: {
        summary: 'Stripe Webhook (Idempotent)',
        responses: { '200': { description: 'Event received' } },
      },
    },
    '/api/v1/agent/circuit-breaker/config': {
      get: {
        summary: 'Get Circuit Breaker Configuration',
        responses: {
          '200': {
            description: 'Current configuration',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CircuitBreakerConfig' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Update Circuit Breaker Configuration',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CircuitBreakerConfig' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated configuration',
          },
        },
      },
    },
  },
};

import { Request, Response, NextFunction } from 'express';

export interface AgentRequest extends Request {
  agentId?: string;
}

export function requireAgentAuth(req: AgentRequest, res: Response, next: NextFunction) {
  const configuredKey = process.env.SYMFLOWAGE_M2M_API_KEY || (process.env.NODE_ENV !== 'production' ? 'test-agent-key' : undefined);
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!configuredKey) {
    return res.status(503).json({
      error: 'agent_api_not_configured',
      message: 'Set SYMFLOWAGE_M2M_API_KEY before enabling the versioned agent API.',
    });
  }
  if (!token || token !== configuredKey) {
    return res.status(401).json({ error: 'invalid_agent_credentials' });
  }

  req.agentId = req.header('x-agent-id') || 'anonymous-agent';
  return next();
}

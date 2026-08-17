import type { SessionService } from '@project/application/auth/session-service';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, unauthenticated } from '../helpers';

import type { McpServerHandler } from './server';
import type { McpRequest } from './types';

export interface McpRoutesOptions {
  mcpHandler: McpServerHandler;
  sessions: SessionService;
  cookieName: string;
}

/**
 * MCP Server HTTP transport route (D37, D38, REQ-API-003, REQ-API-004, REQ-API-006).
 * Streamable JSON-RPC over HTTP, authenticated via Bearer service tokens or session cookie.
 */
export function registerMcpRoutes(app: FastifyInstance, options: McpRoutesOptions): void {
  const { mcpHandler, sessions, cookieName } = options;

  app.post('/api/mcp', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) {
      return unauthenticated(reply);
    }

    const mcpReq = (request.body ?? {}) as Partial<McpRequest>;
    if (mcpReq.jsonrpc !== '2.0' || typeof mcpReq.method !== 'string') {
      return reply.code(400).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request: expected JSON-RPC 2.0 object' },
      });
    }

    const response = await mcpHandler.handleRequest(userId, mcpReq as McpRequest);
    return reply.code(200).send(response);
  });
}

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { NoteService } from '../services/note.service.js';
import { resolveOrigin } from '../http/origin.js';
import { resolveAcceptLanguage, resolveClientIp } from '../http/client-meta.js';
import { createPlainNoteMcpServer } from '../mcp/server.js';

const METHOD_NOT_ALLOWED = {
  jsonrpc: '2.0' as const,
  error: {
    code: -32000,
    message: 'Method not allowed.',
  },
  id: null,
};

export interface RegisterMcpRoutesOptions {
  version: string;
}

/**
 * Stateless Streamable HTTP MCP endpoint at /mcp.
 * Stateless + JSON responses so Vercel serverless can host it without sessions.
 */
export function registerMcpRoutes(
  app: FastifyInstance,
  service: NoteService,
  options: RegisterMcpRoutesOptions,
): void {
  app.post('/mcp', async (request, reply) => {
    await handleMcpPost(request, reply, service, options.version);
  });

  app.get('/mcp', async (_request, reply) => {
    reply.status(405).header('Allow', 'POST').send(METHOD_NOT_ALLOWED);
  });

  app.delete('/mcp', async (_request, reply) => {
    reply.status(405).header('Allow', 'POST').send(METHOD_NOT_ALLOWED);
  });
}

async function handleMcpPost(
  request: FastifyRequest,
  reply: FastifyReply,
  service: NoteService,
  version: string,
): Promise<void> {
  const server = createPlainNoteMcpServer({
    service,
    origin: resolveOrigin(request),
    ip: resolveClientIp(request),
    acceptLanguage: resolveAcceptLanguage(request),
    version,
  });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // Take ownership of the Node response; MCP transport writes headers/body itself.
  reply.hijack();

  const cleanup = () => {
    void transport.close();
    void server.close();
  };
  reply.raw.on('close', cleanup);

  try {
    await server.connect(transport);
    await transport.handleRequest(request.raw, reply.raw, request.body);
  } catch (err) {
    request.log.error({ err }, 'MCP request failed');
    if (!reply.raw.headersSent) {
      reply.raw.statusCode = 500;
      reply.raw.setHeader('Content-Type', 'application/json');
      reply.raw.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }),
      );
    }
    cleanup();
  }
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NoteService } from '../services/note.service.js';
import { AppError } from '../http/errors.js';

export interface CreatePlainNoteMcpServerOptions {
  service: NoteService;
  /** Public origin used to build edit/note/raw URLs. */
  origin: string;
  ip: string | null;
  acceptLanguage: string | null;
  version: string;
}

/** Build a per-request MCP server that only exposes create_note. */
export function createPlainNoteMcpServer(options: CreatePlainNoteMcpServerOptions): McpServer {
  const server = new McpServer({
    name: 'plainnote',
    version: options.version,
  });

  server.registerTool(
    'create_note',
    {
      title: 'Create note',
      description:
        'Create an anonymous PlainNote. Returns public id, private secret, and edit/note/raw URLs.',
      inputSchema: {
        content: z.string().describe('Note body (required)'),
        title: z.string().optional().describe('Optional title'),
        format: z
          .enum(['text', 'markdown'])
          .optional()
          .describe('Content format; defaults to text'),
      },
    },
    async ({ content, title, format }) => {
      try {
        const created = await options.service.create(
          options.origin,
          { content, title, format },
          { ip: options.ip, acceptLanguage: options.acceptLanguage },
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  id: created.id,
                  secret: created.secret,
                  title: created.title,
                  format: created.format,
                  editUrl: created.editUrl,
                  noteUrl: created.noteUrl,
                  rawUrl: created.rawUrl,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to create note';
        return {
          isError: true,
          content: [{ type: 'text' as const, text: message }],
        };
      }
    },
  );

  return server;
}

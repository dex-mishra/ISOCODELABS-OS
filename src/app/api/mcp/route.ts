import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';
import { mcpTools, mcpResources, executeTool, resolveResource } from '@/lib/mcp-engine';

export const dynamic = 'force-dynamic';

// In-memory rate limiter: Map of keyId -> { count, windowStart }
const rateLimits = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(keyId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(keyId);

  if (!limit) {
    rateLimits.set(keyId, { count: 1, windowStart: now });
    return false;
  }

  // If window has passed (1 minute), reset the bucket
  if (now - limit.windowStart > 60000) {
    rateLimits.set(keyId, { count: 1, windowStart: now });
    return false;
  }

  if (limit.count >= 100) {
    return true;
  }

  limit.count++;
  return false;
}

// POST /api/mcp — JSON-RPC 2.0 MCP Handler
export async function POST(req: NextRequest) {
  try {
    // 1. Auth check: X-API-Key header
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized. X-API-Key header is missing.' },
      }, { status: 401 });
    }

    // Hash the incoming key to compare with DB key_hash
    const incomingHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const keyRecord = await prisma.mcpApiKey.findFirst({
      where: {
        key_hash: incomingHash,
        is_active: true,
        revoked_at: null,
      },
    });

    if (!keyRecord) {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32002, message: 'Unauthorized. Invalid or revoked API Key.' },
      }, { status: 401 });
    }

    // 2. Rate limiting check (100 requests per minute)
    if (isRateLimited(keyRecord.id)) {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32003, message: 'Too Many Requests. Rate limit exceeded (100/min).' },
      }, { status: 429 });
    }

    // Update key usage metadata
    await prisma.mcpApiKey.update({
      where: { id: keyRecord.id },
      data: { last_used_at: new Date() },
    });

    // 3. Parse JSON-RPC 2.0 request
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error. Invalid JSON.' },
      }, { status: 400 });
    }

    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== '2.0') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id || null,
        error: { code: -32600, message: 'Invalid Request. Must be JSON-RPC 2.0.' },
      }, { status: 400 });
    }

    if (!method) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id || null,
        error: { code: -32600, message: 'Invalid Request. Method field is required.' },
      }, { status: 400 });
    }

    // 4. Method Dispatcher
    switch (method) {
      case 'tools/list': {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: mcpTools,
          },
        });
      }

      case 'tools/call': {
        if (!params || !params.name) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params. Tool name is required.' },
          }, { status: 400 });
        }

        const toolName = params.name;
        const toolArgs = params.arguments || {};

        // Permissions check
        const permissions = keyRecord.permissions || [];
        const hasPermission =
          permissions.length === 0 ||
          permissions.includes(toolName) ||
          permissions.includes('*') ||
          permissions.includes('tools');

        if (!hasPermission) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32004, message: `Forbidden. Key does not have permission for tool "${toolName}".` },
          }, { status: 403 });
        }

        try {
          // Execute requested tool using engine
          const output = await executeTool(toolName, toolArgs, keyRecord.created_by);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: output,
                },
              ],
            },
          });
        } catch (toolErr: any) {
          console.error(`Tool execution error [${toolName}]:`, toolErr);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message: toolErr.message || 'Internal error executing tool.' },
          }, { status: 500 });
        }
      }

      case 'resources/list': {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            resources: mcpResources,
          },
        });
      }

      case 'resources/read': {
        if (!params || !params.uri) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params. Resource URI is required.' },
          }, { status: 400 });
        }

        const uri = params.uri;

        // Permissions check
        const permissions = keyRecord.permissions || [];
        const hasPermission =
          permissions.length === 0 ||
          permissions.includes(uri) ||
          permissions.includes('*') ||
          permissions.includes('resources');

        if (!hasPermission) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32004, message: `Forbidden. Key does not have permission for resource "${uri}".` },
          }, { status: 403 });
        }

        try {
          const content = await resolveResource(uri, keyRecord.created_by);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: 'text/markdown',
                  text: content,
                },
              ],
            },
          });
        } catch (resErr: any) {
          console.error(`Resource resolution error [${uri}]:`, resErr);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message: resErr.message || 'Internal error resolving resource.' },
          }, { status: 500 });
        }
      }

      default: {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        }, { status: 404 });
      }
    }
  } catch (error) {
    console.error('MCP API server error:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error.' },
    }, { status: 500 });
  }
}

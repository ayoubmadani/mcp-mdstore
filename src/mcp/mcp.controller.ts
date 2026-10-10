import { Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Response } from 'express';
import { ApiKeyGuard, type RequestWithApiKey } from './api-key.guard';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async handle(@Req() req: RequestWithApiKey, @Res() res: Response) {
    const server = this.mcpService.createServer(req.mdstoreApiKey);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  // بدون جلسات لا يوجد بث SSE ولا جلسة تُحذف. مواصفة MCP تطلب 405 هنا —
  // أما 404 فيفهمها العميل على أنها جلسة منتهية، فيعلق.
  @Get()
  get(@Res() res: Response) {
    methodNotAllowed(res);
  }

  @Delete()
  delete(@Res() res: Response) {
    methodNotAllowed(res);
  }
}

function methodNotAllowed(res: Response) {
  res.status(405).set('Allow', 'POST').json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed.' },
    id: null,
  });
}

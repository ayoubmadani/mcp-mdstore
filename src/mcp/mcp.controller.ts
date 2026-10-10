import { Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Response } from 'express';
import { ApiKeyGuard, type RequestWithApiKey } from './api-key.guard';
import { McpService } from './mcp.service';
import { MdstoreClient } from '../mdstore/mdstore.client';

@Controller('mcp')
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly mdstore: MdstoreClient,
  ) {}

  @Post(['', ':key'])
  @UseGuards(ApiKeyGuard)
  async handle(@Req() req: RequestWithApiKey, @Res() res: Response) {
    // بداية الربط: نسجّل اسم العميل (claude-ai، ChatGPT…) على المفتاح — فشل التسجيل لا يوقف الربط
    const body = req.body as { method?: string; params?: { clientInfo?: { name?: string; version?: string } } };
    if (body?.method === 'initialize') {
      const info = body.params?.clientInfo;
      const client = [info?.name, info?.version].filter(Boolean).join(' ') || 'mcp';
      await this.mdstore.markConnected(req.mdstoreApiKey, client).catch(() => undefined);
    }

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
  @Get(['', ':key'])
  get(@Res() res: Response) {
    methodNotAllowed(res);
  }

  @Delete(['', ':key'])
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

import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CreateLandingPageTool } from '../tools/create-landing-page.tool';
import { CreateProductTool } from '../tools/create-product.tool';
import { CreateStoreTool } from '../tools/create-store.tool';
import { ListStoresTool } from '../tools/list-stores.tool';
import { ImportProductFromLinkTool } from '../tools/import-product-from-link.tool';

@Injectable()
export class McpService {
  constructor(
    private readonly createProduct: CreateProductTool,
    private readonly listStores: ListStoresTool,
    private readonly createStore: CreateStoreTool,
    private readonly createLandingPage: CreateLandingPageTool,
    private readonly importProductFromLink: ImportProductFromLinkTool,
  ) {}

  // خادم جديد لكل طلب (stateless) — المفتاح يعيش فقط طوال هذا الطلب.
  createServer(apiKey: string): McpServer {
    const server = new McpServer({ name: 'mdstore', version: '0.0.1' });
    this.createProduct.register(server, apiKey);
    this.listStores.register(server, apiKey);
    this.createStore.register(server, apiKey);
    this.createLandingPage.register(server, apiKey);
    this.importProductFromLink.register(server, apiKey);
    return server;
  }
}

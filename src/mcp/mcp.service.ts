import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CreateLandingPageTool } from '../tools/create-landing-page.tool';
import { CreateProductTool } from '../tools/create-product.tool';
import { CreateStoreTool } from '../tools/create-store.tool';
import { ListStoresTool } from '../tools/list-stores.tool';
import { ImportProductFromLinkTool } from '../tools/import-product-from-link.tool';
import { ManageProductsTool } from '../tools/manage-products.tool';
import { ManageStoreTool } from '../tools/manage-store.tool';
import { ManageCategoriesTool } from '../tools/manage-categories.tool';
import { GenerateProductImagesTool } from '../tools/generate-product-images.tool';
import { ManageDomainsTool } from '../tools/manage-domains.tool';
import { ManageThemesTool } from '../tools/manage-themes.tool';
import { ManageShippingTool } from '../tools/manage-shipping.tool';
import { AdminThemesTool } from '../tools/admin-themes.tool';

// مفتاح مدير المنصة — يرى أدوات الأدمن فقط، ومفتاح التاجر (mdk_) لا يراها أبداً
export const isAdminKey = (apiKey: string) => apiKey.startsWith('mdsa_');

@Injectable()
export class McpService {
  constructor(
    private readonly createProduct: CreateProductTool,
    private readonly listStores: ListStoresTool,
    private readonly createStore: CreateStoreTool,
    private readonly createLandingPage: CreateLandingPageTool,
    private readonly importProductFromLink: ImportProductFromLinkTool,
    private readonly manageProducts: ManageProductsTool,
    private readonly manageStore: ManageStoreTool,
    private readonly manageCategories: ManageCategoriesTool,
    private readonly generateProductImages: GenerateProductImagesTool,
    private readonly manageDomains: ManageDomainsTool,
    private readonly manageThemes: ManageThemesTool,
    private readonly manageShipping: ManageShippingTool,
    private readonly adminThemes: AdminThemesTool,
  ) {}

  // خادم جديد لكل طلب (stateless) — المفتاح يعيش فقط طوال هذا الطلب.
  createServer(apiKey: string): McpServer {
    const server = new McpServer({ name: 'mdstore', version: '0.0.1' });
    if (isAdminKey(apiKey)) {
      this.adminThemes.register(server, apiKey);
      return server;
    }
    this.createProduct.register(server, apiKey);
    this.listStores.register(server, apiKey);
    this.createStore.register(server, apiKey);
    this.createLandingPage.register(server, apiKey);
    this.importProductFromLink.register(server, apiKey);
    this.manageProducts.register(server, apiKey);
    this.manageStore.register(server, apiKey);
    this.manageCategories.register(server, apiKey);
    this.generateProductImages.register(server, apiKey);
    this.manageDomains.register(server, apiKey);
    this.manageThemes.register(server, apiKey);
    this.manageShipping.register(server, apiKey);
    return server;
  }
}

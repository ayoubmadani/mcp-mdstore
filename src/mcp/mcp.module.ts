import { Module } from '@nestjs/common';
import { MdstoreModule } from '../mdstore/mdstore.module';
import { CreateLandingPageTool } from '../tools/create-landing-page.tool';
import { ImportProductFromLinkTool } from '../tools/import-product-from-link.tool';
import { ManageProductsTool } from '../tools/manage-products.tool';
import { ManageStoreTool } from '../tools/manage-store.tool';
import { ManageCategoriesTool } from '../tools/manage-categories.tool';
import { GenerateProductImagesTool } from '../tools/generate-product-images.tool';
import { ManageDomainsTool } from '../tools/manage-domains.tool';
import { ManageThemesTool } from '../tools/manage-themes.tool';
import { ManageShippingTool } from '../tools/manage-shipping.tool';
import { CreateProductTool } from '../tools/create-product.tool';
import { CreateStoreTool } from '../tools/create-store.tool';
import { ListStoresTool } from '../tools/list-stores.tool';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [MdstoreModule],
  controllers: [McpController],
  providers: [
    McpService,
    CreateProductTool,
    ListStoresTool,
    CreateStoreTool,
    CreateLandingPageTool,
    ImportProductFromLinkTool,
    ManageProductsTool,
    ManageStoreTool,
    ManageCategoriesTool,
    GenerateProductImagesTool,
    ManageDomainsTool,
    ManageThemesTool,
    ManageShippingTool,
  ],
})
export class McpModule {}

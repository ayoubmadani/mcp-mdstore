import { Module } from '@nestjs/common';
import { MdstoreModule } from '../mdstore/mdstore.module';
import { CreateLandingPageTool } from '../tools/create-landing-page.tool';
import { ImportProductFromLinkTool } from '../tools/import-product-from-link.tool';
import { ManageProductsTool } from '../tools/manage-products.tool';
import { ManageStoreTool } from '../tools/manage-store.tool';
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
  ],
})
export class McpModule {}

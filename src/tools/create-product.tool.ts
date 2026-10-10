import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

@Injectable()
export class CreateProductTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'create_product',
      {
        title: 'إنشاء منتج',
        description: 'ينشئ منتجاً جديداً في أحد متاجر المستخدم على MdStore.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          name: z.string().min(1).max(200).describe('اسم المنتج'),
          price: z.number().min(0).describe('سعر المنتج'),
          stock: z.number().int().min(0).optional().describe('الكمية المتوفرة في المخزون'),
          images: z.array(z.string().url()).optional().describe('روابط صور المنتج'),
          description: z.string().optional().describe('وصف المنتج'),
          categoryId: z.string().uuid().optional().describe('التصنيف (من list_categories)'),
        },
      },
      ({ storeId, ...input }) =>
        toToolResult(() => this.mdstore.createProduct(apiKey, storeId, input)),
    );
  }
}
